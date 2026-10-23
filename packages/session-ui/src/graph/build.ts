import type {
  FileDiffInfo,
  JsonValue,
  PromptFileAttachment,
  SessionMessageAssistant,
  SessionMessageAssistantTool,
  SessionMessageInfo,
  SessionMessageShell,
  SessionStatus,
  WorkspaceSnapshot,
} from "@opencode/client/promise"
import { Option, Schema } from "effect"
import stripAnsi from "strip-ansi"
import { timelineCategory } from "../timeline/detail"
import { Timeline } from "../timeline/projection"
import { currentToolError, currentToolFailed, currentToolOutput } from "../message/current-tool-state"
import {
  SESSION_NODE_ID,
  decodeString,
  diffNodeID,
  directoryNodeID,
  errorNodeID,
  fileNodeID,
  messageNodeID,
  normalizePath,
  phaseCategoryForTool,
  phaseNodeID,
  reasoningNodeID,
  resultNodeID,
  retryNodeID,
  subagentNodeID,
  subagentToolNodeID,
  textNodeID,
  toolNodeID,
  turnNodeID,
  type Confidence,
  type GraphEdge,
  type GraphModel,
  type GraphNode,
  type NodeStatus,
  type PhaseCategory,
  type Provenance,
  type Range,
  type SessionLineage,
} from "./model"
import { PHASE_LABELS, SEARCH_TOOLS, SHELL_TOOLS, SUBAGENT_TOOLS } from "./vocabulary"

/**
 * The message types the model reads as work. Everything else the session says is a *notice*: a
 * synthetic message, a skill, a system line, or the model changing under the reader's feet.
 *
 * The list is the single source: the notice type is derived from it, and the runtime check reads
 * it, so a new message type is classified in one edit.
 */
const ACTIVITY_MESSAGE_TYPES = [
  "user",
  "assistant",
  "shell",
  "idle",
  "compaction",
  "agent-switched",
  "model-switched",
  "location-switched",
] as const

type ActivityMessageType = (typeof ACTIVITY_MESSAGE_TYPES)[number]

/** The synthetic messages the model records as notices. */
type GraphNotice = Exclude<SessionMessageInfo, { type: ActivityMessageType }>

const decodeJsonObject = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Record(Schema.String, Schema.Json)))

const decodeFilePath = Schema.decodeUnknownOption(Schema.Struct({ path: Schema.String }))

function truncate(text: string, max = 80) {
  const single = text.replace(/\s+/g, " ").trim()

  return single.length > max ? `${single.slice(0, max - 1)}…` : single
}

/**
 * Full terminal text for the inspector (RF.8). ANSI colour codes are stripped and CRLF normalized so
 * the panel shows plain, selectable output; the renderer never sees this because `buildRenderModel`
 * maps only affordance fields.
 */
function terminalOutput(text: string | undefined): string | null {
  if (!text) return null

  return stripAnsi(text).replace(/\r\n?/g, "\n")
}

function stringField(record: Record<string, JsonValue>, key: string) {
  const value = Option.getOrUndefined(decodeString(record[key]))

  return value ? value : undefined
}

function toolInput(tool: SessionMessageAssistantTool): Record<string, JsonValue> {
  if (tool.state.status === "streaming") {
    // SAFETY: Schema.Json and the client's JsonValue describe the same JSON tree.
    return Option.getOrElse(decodeJsonObject(tool.state.input), () => ({})) as Record<string, JsonValue>
  }

  return tool.state.input
}

function toolMetadata(tool: SessionMessageAssistantTool): Record<string, JsonValue> {
  if (!("metadata" in tool.state)) return {}

  return tool.state.metadata ?? {}
}

/**
 * T3.6/T6.5 — what the root node carries about the session itself: its identity, and where it
 * came from. The root's literal id stays `session`, so nothing that resolves a node by id changes.
 */
function rootData(sessionID?: string, lineage?: SessionLineage): Record<string, JsonValue> | undefined {
  const data: Record<string, JsonValue> = {}

  if (sessionID) data.sessionID = sessionID

  if (lineage?.forkedFrom) {
    data.forkedFrom = lineage.forkedFrom.sessionID

    if (lineage.forkedFrom.boundary) {
      data.forkBoundary = lineage.forkedFrom.boundary.messageID
      data.forkBoundaryType = lineage.forkedFrom.boundary.type
    }
  }

  if (lineage?.parentSessionID) data.parentSessionID = lineage.parentSessionID

  return Object.keys(data).length > 0 ? data : undefined
}

/**
 * The graph builder: it turns a session's messages into the model the map draws.
 *
 * It owns the model's mutable state — the nodes, the edges and the maps that relate them — and the
 * rules that connect them. Every activity in a turn enters the model the same way (`attach`), so a
 * node is never half-attached, and the order the model is built in is the order it is drawn in.
 */
class GraphBuilder {
  private readonly nodes: GraphNode[] = []
  private readonly edges: GraphEdge[] = []
  private readonly turns: string[] = []
  private readonly nodeIDs = new Set<string>()
  private readonly edgeIDs = new Set<string>()
  private readonly nodesByID = new Map<string, GraphNode>()
  /** The files the model knows, by normalized path. */
  private readonly fileNodes = new Map<string, string>()
  /** The files each turn touched, for the turn's diff node. */
  private readonly turnFiles = new Map<string, Set<string>>()
  /** The last child of a turn, for the turn's `sequence` chain. */
  private readonly lastChildByTurn = new Map<string, string>()
  /** The open phase of a turn, and the members it has collected. */
  private readonly phaseByTurn = new Map<string, { id: string; category: PhaseCategory; members: string[] }>()
  private readonly phaseOrdinalsByTurn = new Map<string, number>()
  /** The last failure in a turn, so a retry can point back at it. */
  private readonly lastErrorByTurn = new Map<string, string>()
  /** T21.1 — per-turn diffs for hunk symbol extraction. */
  private readonly diffByTurn?: Map<string, FileDiffInfo[]>
  private previousTurn: string | undefined
  private readonly goal: string | undefined

  constructor(
    private readonly messages: SessionMessageInfo[],
    private readonly status: SessionStatus,
    private readonly snapshot?: WorkspaceSnapshot,
    sessionID?: string,
    lineage?: SessionLineage,
    diffByTurn?: Map<string, FileDiffInfo[]>,
  ) {
    this.goal = messages.find((message) => message.type === "user")?.text
    this.diffByTurn = diffByTurn

    this.addNode({
      id: SESSION_NODE_ID,
      kind: "session",
      label: "Session",
      status: "neutral",
      minLevel: "overview",
      // T3.6: the session identity rides on the root node, so an exported map can be attributed
      // without changing the root's literal id. T6.5: so does the lineage, so a forked session says
      // where it came from without an edge into another session.
      data: rootData(sessionID, lineage),
    })

    if (this.goal) this.nodesByID.get(SESSION_NODE_ID)!.summary = truncate(this.goal)
  }

  build(): GraphModel {
    const { turnByMessageID, activeMessageID } = Timeline.constructSessionMessageRows(this.messages, true, this.status)
    const openers = new Map<string, SessionMessageInfo>()

    for (const message of this.messages) {
      const owner = turnByMessageID.get(message.id)

      if (owner === message.id) openers.set(message.id, message)
    }

    for (const message of this.messages) {
      const owner = turnByMessageID.get(message.id)
      const turnID = this.ensureTurn(openers.get(owner ?? message.id) ?? message, owner)

      if (turnID !== this.previousTurn && this.previousTurn)
        this.addEdge({ kind: "sequence", source: this.previousTurn, target: turnID, confidence: "explicit" })

      if (turnID !== SESSION_NODE_ID) this.previousTurn = turnID

      const isOpener = owner === message.id

      if (message.type === "user") {
        // A steered prompt rides the opener's turn.
        this.appendUserPrompt(message, turnID, !isOpener)
        continue
      }

      if (message.type === "shell") this.appendShell(message, turnID)
      else if (message.type === "assistant") this.appendAssistant(message, turnID)
      else if (message.type === "idle") this.appendIdle(message, turnID)
      else if (message.type === "compaction") this.appendCompaction(message, turnID)
      else if (isNotice(message)) this.appendNotice(message, turnID)
    }

    // A leading assistant turn has no user message; give the session goal from its text when absent.
    if (!this.goal) {
      const opener = this.messages.find((message) => message.type === "assistant")
      const textPart = opener?.content.find((part) => part.type === "text")

      if (textPart?.type === "text") this.nodesByID.get(SESSION_NODE_ID)!.summary = truncate(textPart.text)
    }

    const activeOwner = activeMessageID ? turnByMessageID.get(activeMessageID) : undefined
    const activeTurn = activeOwner ? turnNodeID(activeOwner) : undefined

    if (activeTurn && this.nodeIDs.has(activeTurn)) {
      const node = this.nodesByID.get(activeTurn)!
      node.data = { ...node.data, active: this.status.type !== "idle" }
    }

    if (this.snapshot) this.attachWorkspace(this.snapshot)

    if (this.diffByTurn) this.attachHunkSymbols(this.diffByTurn)

    return {
      root: SESSION_NODE_ID,
      goal: this.goal,
      nodes: this.nodes,
      edges: this.edges,
      turns: this.turns,
      turnByMessageID,
      activeTurn,
      ...(this.snapshot
        ? {
            workspaceRoot: this.snapshot.root,
            snapshot: {
              revision: this.snapshot.revision,
              asOf: this.snapshot.asOf,
              missing: this.snapshot.missing,
            },
          }
        : {}),
    }
  }

  /**
   * T19.1/T29.3 — the directory skeleton derived from the files the session touched and the
   * snapshot's own files. It runs only when a snapshot is present, so the session-only model stays
   * byte-identical. Edges use the existing `part-of` vocabulary; no new layout geometry is needed.
   */
  private attachWorkspace(snapshot: WorkspaceSnapshot) {
    const files = new Set<string>(this.fileNodes.keys())
    for (const file of snapshot.files) files.add(normalizePath(file.path))

    const counts = new Map<string, { fileCount: number; touchedCount: number }>()
    for (const file of files) {
      const touched = this.fileNodes.has(file)
      for (const directory of parentPaths(file)) {
        const count = counts.get(directory) ?? { fileCount: 0, touchedCount: 0 }
        count.fileCount += 1
        if (touched) count.touchedCount += 1
        counts.set(directory, count)
      }
    }

    const directories = [...counts.keys()].sort((a, b) => depth(a) - depth(b) || a.localeCompare(b))
    for (const directory of directories) {
      const count = counts.get(directory)!
      this.addNode({
        id: directoryNodeID(directory),
        kind: "directory",
        label: directory.slice(directory.lastIndexOf("/") + 1),
        status: "neutral",
        minLevel: "overview",
        domain: "directories",
        provenance: this.provenanceForSource(snapshot, "tree"),
        data: { path: directory, fileCount: count.fileCount, touchedCount: count.touchedCount },
      })
    }

    for (const [file, id] of this.fileNodes) {
      const parent = parentPath(file)
      if (parent) this.partOf(id, directoryNodeID(parent), "structural")
    }

    for (const directory of directories) {
      const parent = parentPath(directory)
      if (parent) this.partOf(directoryNodeID(directory), directoryNodeID(parent), "structural")
    }

    // T22.1 — packages from snapshot
    this.attachPackages(snapshot)

    // T20.1 — commits from snapshot
    this.attachCommits(snapshot)

    // T20.2 — branches from snapshot
    this.attachBranches(snapshot)

    // T21.1/T21.2 — symbols from snapshot
    this.attachSymbols(snapshot)

    // T23.1/T23.2 — processes and ports from snapshot
    this.attachProcesses(snapshot)

    // T25.1 — issues from snapshot
    this.attachIssues(snapshot)
  }

  /** T22.1 — package nodes from snapshot packages array. */
  private attachPackages(snapshot: WorkspaceSnapshot) {
    for (const pkg of snapshot.packages) {
      this.addNode({
        id: `pkg:${normalizePath(pkg.path)}`,
        kind: "package",
        label: pkg.name ?? pkg.path,
        status: "neutral",
        minLevel: "overview",
        domain: "directories",
        provenance: this.provenanceForSource(snapshot, "packages"),
        data: this.filterDefined({ path: pkg.path, name: pkg.name, version: pkg.version, scripts: pkg.scripts }),
      })
    }
  }

  /** T20.1 — commit nodes from snapshot commits array. */
  private attachCommits(snapshot: WorkspaceSnapshot) {
    for (const commit of snapshot.commits) {
      const id = `commit:${commit.sha}`
      this.addNode({
        id,
        kind: "commit",
        label: commit.short,
        status: "neutral",
        minLevel: "execution",
        domain: "history",
        provenance: this.provenanceForSource(snapshot, "vcs"),
        data: this.filterDefined({ sha: commit.sha, message: commit.message, author: commit.author, time: commit.time, files: commit.files }),
      })
      if (commit.files) {
        for (const file of commit.files) {
          const fileId = this.fileNodes.get(normalizePath(file))
          if (fileId) this.addEdge({ kind: "touches", source: id, target: fileId, confidence: "explicit" })
        }
      }
    }
    if (snapshot.base?.sha) {
      const baseId = `commit:${snapshot.base.sha}`
      this.addNode({
        id: baseId,
        kind: "commit",
        label: `base (${snapshot.base.sha.slice(0, 7)})`,
        status: "neutral",
        minLevel: "execution",
        domain: "history",
        provenance: this.provenanceForSource(snapshot, "vcs"),
        data: { sha: snapshot.base.sha, isBase: true },
      })
    }
  }

  /** T20.2 — branch nodes from snapshot branches array. */
  private attachBranches(snapshot: WorkspaceSnapshot) {
    for (const branch of snapshot.branches) {
      const id = `branch:${branch.name}`
      this.addNode({
        id,
        kind: "branch",
        label: branch.name,
        status: branch.name === snapshot.head?.branch ? "running" : "neutral",
        minLevel: "execution",
        domain: "history",
        provenance: this.provenanceForSource(snapshot, "vcs"),
        data: this.filterDefined({ name: branch.name, sha: branch.sha, upstream: branch.upstream, remote: branch.remote }),
      })
      // points-at edge to commit
      const commitId = `commit:${branch.sha}`
      if (this.nodeIDs.has(commitId)) {
        this.addEdge({ kind: "points-at", source: id, target: commitId, confidence: "explicit" })
      }
    }
  }

  /** T21.1/T21.2 — symbol nodes from snapshot symbols array. */
  private attachSymbols(snapshot: WorkspaceSnapshot) {
    for (const sym of snapshot.symbols) {
      const id = `symbol:${normalizePath(sym.path)}#${sym.qualified}`
      this.addNode({
        id,
        kind: "symbol",
        label: sym.name,
        status: "neutral",
        minLevel: "execution",
        domain: "code",
        provenance: this.provenanceForSource(snapshot, "symbols"),
        data: this.filterDefined({ path: sym.path, name: sym.name, qualified: sym.qualified, kind: sym.kind, range: sym.range, signature: sym.signature, origin: sym.origin }),
      })
      // part-of file
      const fileId = this.fileNodes.get(normalizePath(sym.path))
      if (fileId) this.partOf(id, fileId, "structural")
    }
  }

  /**
   * T21.1 — extract symbols from a unified diff patch by parsing hunk headers.
   * Parses `@@ -oldStart,oldCount +newStart,newCount @@ [context]` to find function/class names.
   */
  private symbolsFromHunk(patch: string, filePath: string): Array<{
    name: string
    qualified: string
    kind: "function" | "class" | "method"
    range: Range
    signature?: string
    origin: "hunk" | "hunk:anon" | "hunk:deleted"
    deleted?: boolean
  }> {
    const symbols: Array<{
      name: string
      qualified: string
      kind: "function" | "class" | "method"
      range: Range
      signature?: string
      origin: "hunk" | "hunk:anon" | "hunk:deleted"
      deleted?: boolean
    }> = []

    const lines = patch.split("\n")
    let currentClass: string | undefined
    let lineNumber = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Track line numbers from the hunk header
      const hunkHeaderMatch = line.match(/^@@\s*-(\d+)(?:,(\d+))?\s*\+(\d+)(?:,(\d+))?\s*@@/)
      if (hunkHeaderMatch) {
        lineNumber = Number(hunkHeaderMatch[3]) - 1 // newStart is 1-based
        continue
      }

      // Increment line number for each line in the patch (after hunk header)
      lineNumber++

      // Detect class/interface declarations to qualify method names
      const classMatch = line.match(/^\+\s*(?:export\s+)?(?:abstract\s+)?(?:class|interface)\s+(\w+)/)
      if (classMatch) {
        const className = classMatch[1]
        // Create symbol for the class itself
        symbols.push({
          name: className,
          qualified: className,
          kind: "class",
          range: { start: { line: lineNumber, character: 0 }, end: { line: lineNumber + 20, character: 0 } },
          origin: "hunk",
        })
        currentClass = className
        continue
      }

      // Detect function declarations (including async, generators)
      const funcMatch = line.match(/^\+\s*(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\())/)
      if (funcMatch) {
        const name = funcMatch[1] || funcMatch[2]
        if (name) {
          symbols.push({
            name,
            qualified: currentClass ? `${currentClass}.${name}` : name,
            kind: "function",
            range: { start: { line: lineNumber, character: 0 }, end: { line: lineNumber + 10, character: 0 } },
            origin: "hunk",
          })
        }
        continue
      }

      // Detect method declarations (inside class)
      const methodMatch = line.match(/^\+\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{?/)
      if (methodMatch && currentClass) {
        const name = methodMatch[1]
        // Skip common non-method keywords
        if (!["constructor", "get", "set", "static", "public", "private", "protected"].includes(name)) {
          symbols.push({
            name,
            qualified: `${currentClass}.${name}`,
            kind: "method",
            range: { start: { line: lineNumber, character: 0 }, end: { line: lineNumber + 10, character: 0 } },
            origin: "hunk",
          })
        }
        continue
      }

      // Detect arrow functions assigned to properties (class fields)
      const arrowMatch = line.match(/^\+\s*(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/)
      if (arrowMatch && currentClass) {
        const name = arrowMatch[1]
        symbols.push({
          name,
          qualified: `${currentClass}.${name}`,
          kind: "method",
          range: { start: { line: lineNumber, character: 0 }, end: { line: lineNumber + 10, character: 0 } },
          origin: "hunk",
        })
        continue
      }

      // Detect deleted functions (lines starting with - that look like function declarations)
      const deletedFuncMatch = line.match(/^-\s*(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\())/)
      if (deletedFuncMatch) {
        const name = deletedFuncMatch[1] || deletedFuncMatch[2]
        if (name) {
          symbols.push({
            name,
            qualified: currentClass ? `${currentClass}.${name}` : name,
            kind: "function",
            range: { start: { line: lineNumber, character: 0 }, end: { line: lineNumber + 10, character: 0 } },
            signature: line.slice(1).trim(),
            origin: "hunk:deleted",
            deleted: true,
          })
        }
        continue
      }

      // Detect anonymous/arrow functions without a name (heuristic: => or function() without name)
      const anonMatch = line.match(/^\+\s*(?:const|let|var)\s*[A-Z_a-z][A-Z_a-z0-9]*\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/)
      if (anonMatch) {
        // Use line:col as qualified name for anonymous functions
        symbols.push({
          name: "anonymous",
          qualified: `${filePath}:${lineNumber}:0`,
          kind: "function",
          range: { start: { line: lineNumber, character: 0 }, end: { line: lineNumber + 5, character: 0 } },
          origin: "hunk:anon",
        })
        continue
      }

      // Reset class context when we see a class-level closing brace (no indentation after +)
      // Class-level: +} or + } (0-1 spaces after +)
      // Method-level: +  } (2+ spaces after +)
      const braceMatch = line.match(/^\+(\s*)\}\s*$/)
      if (braceMatch && braceMatch[1].length <= 1) {
        currentClass = undefined
      }
    }

    return symbols
  }

  /** T21.1 — extract and attach hunk symbols from per-turn diffs. */
  private attachHunkSymbols(diffByTurn: Map<string, FileDiffInfo[]>) {
    for (const [_turnID, diffs] of diffByTurn) {
      for (const diff of diffs) {
        const symbols = this.symbolsFromHunk(diff.patch, diff.file)
        for (const sym of symbols) {
          const id = `symbol:${normalizePath(diff.file)}#${sym.qualified}`
          // Skip if already added (from snapshot)
          if (this.nodeIDs.has(id)) continue

          this.addNode({
            id,
            kind: "symbol",
            label: sym.name,
            status: sym.deleted ? "failed" : "neutral",
            minLevel: "execution",
            domain: "code",
            provenance: { source: "tree", confidence: "inferred" },
            data: this.filterDefined({
              path: diff.file,
              name: sym.name,
              qualified: sym.qualified,
              kind: sym.kind,
              range: sym.range,
              signature: sym.signature,
              origin: sym.origin,
              deleted: sym.deleted,
            }),
          })
          // part-of file
          const fileId = this.fileNodes.get(normalizePath(diff.file))
          if (fileId) this.partOf(id, fileId, "structural")
        }
      }
    }
  }

  /** T23.1/T23.2 — process and port nodes from snapshot. */
  private attachProcesses(snapshot: WorkspaceSnapshot) {
    for (const proc of snapshot.processes) {
      const procId = proc.id.startsWith("proc:") ? proc.id : `proc:${proc.id}`
      this.addNode({
        id: procId,
        kind: "process",
        label: proc.command,
        status: "running",
        minLevel: "detail",
        domain: "runtime",
        provenance: this.provenanceForSource(snapshot, "processes"),
        data: this.filterDefined({ pid: proc.pid, command: proc.command, cwd: proc.cwd, ports: proc.ports, startedAt: proc.startedAt }),
      })
      // ports
      for (const port of proc.ports) {
        const portId = `port:${port}`
        this.addNode({
          id: portId,
          kind: "port",
          label: `Port ${port}`,
          status: "neutral",
          minLevel: "detail",
          domain: "runtime",
          provenance: this.provenanceForSource(snapshot, "processes"),
          data: { port, processId: procId },
        })
        this.addEdge({ kind: "listens-on", source: procId, target: portId, confidence: "inferred" })
      }
    }
  }

  /** T25.1 — issue nodes from snapshot. */
  private attachIssues(snapshot: WorkspaceSnapshot) {
    for (const issue of snapshot.issues) {
      const id = `issue:${issue.provider}:${issue.repo ?? "unknown"}#${issue.number}`
      this.addNode({
        id,
        kind: "issue",
        label: issue.title ?? `#${issue.number}`,
        status: issue.state === "closed" ? "success" : "neutral",
        minLevel: "overview",
        domain: "work",
        provenance: this.provenanceForSource(snapshot, "issues"),
        data: this.filterDefined({ provider: issue.provider, repo: issue.repo, number: issue.number, title: issue.title, state: issue.state, url: issue.url }),
      })
    }
  }

  /** Filter out undefined values from an object for JsonValue compliance. */
  private filterDefined(obj: Record<string, unknown>): Record<string, JsonValue> {
    const result: Record<string, JsonValue> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) result[key] = value as JsonValue
    }
    return result
  }

  private provenanceForSource(snapshot: WorkspaceSnapshot, source: "tree" | "vcs" | "packages" | "symbols" | "processes" | "issues"): Provenance | undefined {
    const asOf = snapshot.asOf[source]
    if (asOf === undefined) return undefined
    return { source, asOf, confidence: "inferred" }
  }

  private addNode(node: GraphNode): GraphNode {
    if (this.nodeIDs.has(node.id)) return node

    this.nodeIDs.add(node.id)
    this.nodes.push(node)
    this.nodesByID.set(node.id, node)

    return node
  }

  private addEdge(edge: Omit<GraphEdge, "id">) {
    const id = `${edge.kind}:${edge.source}->${edge.target}`

    if (this.edgeIDs.has(id)) return

    this.edgeIDs.add(id)
    this.edges.push({ id, ...edge })
  }

  private partOf(child: string, parent: string, confidence: Confidence = "explicit") {
    this.addEdge({ kind: "part-of", source: child, target: parent, confidence })
  }

  /**
   * Adds a node, hangs it under its turn, links it into the turn's sequence, and (when it takes
   * part in a phase) joins that phase. A node that produces another one names it here, so the
   * `produces` edge sits where the activity's own edges sit.
   */
  private attach(
    node: GraphNode,
    turnID: string,
    options: { produces?: string; phase?: PhaseCategory } = {},
  ): GraphNode {
    this.addNode(node)
    this.partOf(node.id, turnID)

    if (options.produces)
      this.addEdge({ kind: "produces", source: options.produces, target: node.id, confidence: "explicit" })

    this.sequence(turnID, node.id)

    if (options.phase) this.cluster(turnID, node.id, options.phase)

    return node
  }

  private requireFile(path: string): string {
    const normalized = normalizePath(path)
    const id = fileNodeID(normalized)
    const existing = this.fileNodes.get(normalized)

    if (existing) return existing

    this.fileNodes.set(normalized, id)
    this.addNode({
      id,
      kind: "file",
      label: normalized,
      status: "neutral",
      data: { path: normalized },
    })

    return id
  }

  private recordFile(turnID: string | undefined, path: string): string {
    const id = this.requireFile(path)

    if (!turnID) return id

    const files = this.turnFiles.get(turnID) ?? new Set<string>()

    files.add(normalizePath(path))
    this.turnFiles.set(turnID, files)

    return id
  }

  /** The parent turn node for a message, creating it on first sight of its opener. */
  private ensureTurn(opener: SessionMessageInfo, owner: string | undefined): string {
    if (!owner) return SESSION_NODE_ID

    const id = turnNodeID(owner)

    if (!this.nodeIDs.has(id)) {
      const isShell = opener.type === "shell"
      this.addNode({
        id,
        kind: "turn",
        label: isShell ? truncate(opener.command) : opener.type === "user" ? truncate(opener.text) : "Turn",
        status: "neutral",
        turnID: id,
        messageID: owner,
        time: opener.time.created,
        minLevel: "overview",
      })
      this.turns.push(id)
      this.partOf(id, SESSION_NODE_ID)
    }

    return id
  }

  /** Sequence edges chain consecutive children of one turn. */
  private sequence(turnID: string, childID: string) {
    const previous = this.lastChildByTurn.get(turnID)

    if (previous) this.addEdge({ kind: "sequence", source: previous, target: childID, confidence: "explicit" })

    this.lastChildByTurn.set(turnID, childID)
  }

  /**
   * Semantic phases: consecutive phase-eligible children of one turn with the same category cluster
   * into one derived `phase` node. Only runs of the same category merge; a category change starts a
   * new cluster. Membership is recorded on `clusterOf` and the phase is `part-of` its turn.
   */
  private cluster(turnID: string, childID: string, category: PhaseCategory) {
    const current = this.phaseByTurn.get(turnID)

    if (current?.category === category) {
      current.members.push(childID)

      return
    }

    const ordinal = (this.phaseOrdinalsByTurn.get(turnID) ?? 0) + 1

    this.phaseOrdinalsByTurn.set(turnID, ordinal)

    const id = phaseNodeID(turnID, category, ordinal)
    const members = [childID]

    this.addNode({
      id,
      kind: "phase",
      label: PHASE_LABELS[category],
      status: "neutral",
      turnID,
      derived: true,
      minLevel: "overview",
      clusterOf: members,
      data: { category },
    })
    this.partOf(id, turnID)
    this.phaseByTurn.set(turnID, { id, category, members })
  }

  private noteError(turnID: string, nodeID: string) {
    this.lastErrorByTurn.set(turnID, nodeID)
  }

  private appendUserPrompt(
    message: Extract<SessionMessageInfo, { type: "user" }>,
    turnID: string,
    steered: boolean,
  ) {
    const nodeID = messageNodeID(message.id)

    this.attach(
      {
        id: nodeID,
        kind: "message",
        label: truncate(message.text),
        summary: message.text,
        status: "neutral",
        turnID,
        messageID: message.id,
        time: message.time.created,
        minLevel: steered ? "execution" : "overview",
        data: steered ? { role: "user", steered: true } : { role: "user" },
      },
      turnID,
    )

    if (!steered && this.goal && message.text === this.goal)
      this.nodesByID.get(turnID)!.label = truncate(message.text)

    for (const file of attachmentPaths(message.files))
      this.addEdge({ kind: "references", source: nodeID, target: this.requireFile(file), confidence: "explicit" })
  }

  private appendShell(message: SessionMessageShell, turnID: string) {
    const nodeID = messageNodeID(message.id)
    const status = shellStatus(message)

    this.attach(
      {
        id: nodeID,
        kind: "message",
        label: truncate(message.command),
        summary: message.command,
        status: status === "failed" ? "failed" : "neutral",
        turnID,
        messageID: message.id,
        time: message.time.created,
        minLevel: "execution",
        data: { role: "shell", command: message.command },
      },
      turnID,
      { phase: "verify" },
    )

    const resultID = resultNodeID(message.id)

    this.attach(
      {
        id: resultID,
        kind: "result",
        label: message.status === "exited" ? `exit ${message.exit ?? 0}` : message.status,
        summary: message.output?.output ? truncate(message.output.output, 200) : undefined,
        status,
        turnID,
        messageID: message.id,
        time: message.time.completed ?? message.time.created,
        minLevel: "execution",
        data: {
          exit: message.exit ?? null,
          timeout: message.status === "timeout",
          truncated: message.output?.truncated ?? null,
          output: terminalOutput(message.output?.output),
        },
      },
      turnID,
      { produces: nodeID, phase: "verify" },
    )

    if (status === "failed") this.noteError(turnID, resultID)
  }

  private appendAssistant(message: SessionMessageAssistant, turnID: string) {
    message.snapshot?.files?.forEach((file) => {
      const id = this.recordFile(turnID, file)
      this.addEdge({ kind: "writes", source: turnID, target: id, confidence: "structural" })
    })

    let textOrdinal = 0
    let reasoningOrdinal = 0

    for (const content of message.content) {
      if (content.type === "text") {
        if (!content.text.trim()) continue
        this.attach(
          {
            id: textNodeID(message.id, textOrdinal++),
            kind: "message",
            label: truncate(content.text),
            summary: content.text,
            status: "neutral",
            turnID,
            messageID: message.id,
            time: message.time.created,
            minLevel: "execution",
            data: { role: "assistant" },
          },
          turnID,
        )
        continue
      }

      if (content.type === "reasoning") {
        if (!content.text.trim()) continue
        const nodeID = reasoningNodeID(message.id, reasoningOrdinal++)
        this.attach(
          {
            id: nodeID,
            kind: "reasoning",
            label: truncate(content.text),
            summary: content.text,
            status: "neutral",
            turnID,
            messageID: message.id,
            partID: nodeID,
            time: content.time?.created ?? message.time.created,
            minLevel: "detail",
          },
          turnID,
        )
        continue
      }

      this.appendTool(content, message, turnID)
    }

    if (message.error) {
      // T6.5: an aborted step is a real outcome. It used to be dropped, which made an interrupted
      // turn look like a turn that never happened.
      const interrupted = isInterrupted(message.error)
      const nodeID = errorNodeID(message.id, "assistant")

      this.attach(
        {
          id: nodeID,
          kind: "error",
          label: interrupted ? "Interrupted" : truncate(message.error.message),
          summary: message.error.message,
          status: interrupted ? "interrupted" : "failed",
          turnID,
          messageID: message.id,
          time: message.time.completed ?? message.time.created,
          minLevel: "execution",
          data: { type: message.error.type },
        },
        turnID,
      )
      this.noteError(turnID, nodeID)
    }

    if (message.retry) {
      const nodeID = retryNodeID(message.id, message.retry.attempt)

      this.attach(
        {
          id: nodeID,
          kind: "retry",
          label: `Retry #${message.retry.attempt}`,
          summary: message.retry.error.message,
          status: "neutral",
          turnID,
          messageID: message.id,
          time: message.retry.at,
          minLevel: "execution",
          data: { attempt: message.retry.attempt },
        },
        turnID,
      )

      const evidence = this.lastErrorByTurn.get(turnID)

      if (evidence) this.addEdge({ kind: "evidence", source: evidence, target: nodeID, confidence: "structural" })
    }
  }

  private appendTool(tool: SessionMessageAssistantTool, message: SessionMessageAssistant, turnID: string) {
    const status = toolStatus(tool)
    const category = toolCategory(tool)

    if (SUBAGENT_TOOLS.has(tool.name)) {
      const { metadata, input } = toolFacts(tool)
      const childID = stringField(metadata, "sessionID") ?? stringField(metadata, "sessionId")
      const nodeID = childID ? subagentNodeID(childID) : subagentToolNodeID(tool.id)

      this.attach(
        {
          id: nodeID,
          kind: "subagent",
          label: stringField(input, "description") ?? stringField(input, "agent") ?? "Subagent",
          summary: stringField(input, "prompt"),
          status,
          turnID,
          messageID: message.id,
          partID: tool.id,
          toolID: tool.id,
          time: tool.time.created,
          minLevel: "overview",
          data: {
            category,
            agent: stringField(input, "agent") ?? null,
            childSessionID: childID ?? null,
          },
        },
        turnID,
        { phase: "delegate" },
      )

      if (status === "failed") this.noteError(turnID, nodeID)

      return
    }

    const nodeID = toolNodeID(tool.id)
    const { input, metadata, error, output } = toolFacts(tool)

    this.attach(
      {
        id: nodeID,
        kind: "tool",
        label: tool.name,
        summary: output ? truncate(output, 200) : error ? truncate(error) : undefined,
        status,
        turnID,
        messageID: message.id,
        partID: tool.id,
        toolID: tool.id,
        time: tool.time.created,
        minLevel: "execution",
        data: { name: tool.name, category, input },
      },
      turnID,
      { phase: phaseCategoryForTool(tool.name) },
    )

    if (SHELL_TOOLS.has(tool.name)) {
      const resultID = resultNodeID(tool.id)

      this.attach(
        {
          id: resultID,
          kind: "result",
          label: toolResultLabel(status),
          summary: output ? truncate(output, 400) : error,
          status,
          turnID,
          messageID: message.id,
          partID: tool.id,
          toolID: tool.id,
          time: tool.time.completed ?? tool.time.created,
          minLevel: "execution",
          data: { exit: metadata.exit ?? null, timeout: metadata.timeout === true, output: terminalOutput(output) },
        },
        turnID,
        { produces: nodeID, phase: "verify" },
      )

      if (status === "failed") this.noteError(turnID, resultID)
    } else if (status === "failed") {
      this.noteError(turnID, nodeID)
    }

    if (error) {
      const errorID = errorNodeID(message.id, tool.id)

      this.attach(
        {
          id: errorID,
          kind: "error",
          label: truncate(error),
          summary: error,
          status: "failed",
          turnID,
          messageID: message.id,
          partID: tool.id,
          time: tool.time.completed ?? tool.time.created,
          minLevel: "execution",
        },
        turnID,
        { produces: nodeID },
      )
      this.noteError(turnID, errorID)
    }

    this.recordProvenance(tool, nodeID, turnID)
  }

  private appendIdle(message: Extract<SessionMessageInfo, { type: "idle" }>, turnID: string) {
    if (message.outcome === "failed" && message.error) {
      const nodeID = errorNodeID(message.id, "idle")

      this.attach(
        {
          id: nodeID,
          kind: "error",
          label: truncate(message.error.message),
          summary: message.error.message,
          status: "failed",
          turnID,
          messageID: message.id,
          time: message.time.created,
          minLevel: "execution",
          data: { type: message.error.type },
        },
        turnID,
      )
      this.noteError(turnID, nodeID)
    } else if (message.outcome === "interrupted") {
      this.attach(
        {
          id: errorNodeID(message.id, "idle"),
          kind: "error",
          label: "Interrupted",
          summary: message.error?.message,
          status: "interrupted",
          turnID,
          messageID: message.id,
          time: message.time.created,
          minLevel: "execution",
        },
        turnID,
      )
    }

    const files = this.turnFiles.get(turnID)

    if (!files || files.size === 0) return

    const nodeID = diffNodeID(message.id)

    this.attach(
      {
        id: nodeID,
        kind: "diff",
        label: `${files.size} file${files.size === 1 ? "" : "s"} changed`,
        status: "neutral",
        turnID,
        messageID: message.id,
        time: message.time.created,
        minLevel: "execution",
        data: { files: [...files].sort() },
      },
      turnID,
    )

    for (const file of [...files].sort())
      this.addEdge({ kind: "produces", source: nodeID, target: this.requireFile(file), confidence: "explicit" })
  }

  private appendCompaction(message: Extract<SessionMessageInfo, { type: "compaction" }>, turnID: string) {
    const nodeID = messageNodeID(message.id)

    this.attach(
      {
        id: nodeID,
        kind: "compaction",
        label: message.status === "completed" ? "Compacted context" : `Compaction ${message.status}`,
        summary: compactionSummary(message),
        status: compactionStatus(message),
        turnID,
        messageID: message.id,
        time: message.time.created,
        minLevel: "execution",
        // T6.5: a compaction either replaces the context with a summary or replays a provider's
        // replacement window. The two are different facts about what the agent can still see.
        data: { reason: message.reason, replayed: compactionReplays(message) },
      },
      turnID,
    )

    const previous = this.turns.at(-2)

    if (previous) this.addEdge({ kind: "compacts", source: nodeID, target: previous, confidence: "explicit" })
  }

  private appendNotice(message: GraphNotice, turnID: string) {
    const nodeID = messageNodeID(message.id)
    const metadata = message.metadata ?? {}
    const childID = stringField(metadata, "childID") ?? stringField(metadata, "sessionID")

    this.attach(
      {
        id: nodeID,
        kind: "notice",
        label: noticeLabel(message),
        summary: noticeSummary(message),
        status: "neutral",
        turnID,
        messageID: message.id,
        time: message.time.created,
        minLevel: "detail",
        // T6.5: the child session is the notice's own fact, so it stays on the notice whether or not
        // the delegation has a node in this graph.
        data: {
          type: message.type,
          source: stringField(metadata, "source") ?? null,
          childSessionID: childID ?? null,
        },
      },
      turnID,
    )

    if (!childID) return

    const childNodeID = subagentNodeID(childID)

    // T6.5: only wire the delegation when the child session has a node here. An edge to a node that
    // does not exist is a dangling connection the renderer would have to warn about.
    if (this.nodeIDs.has(childNodeID))
      this.addEdge({ kind: "delegates", source: nodeID, target: childNodeID, confidence: "explicit" })
  }

  /** The files a tool touched, as provenance edges. */
  private recordProvenance(tool: SessionMessageAssistantTool, toolID: string, turnID: string) {
    const { input, metadata } = toolFacts(tool)

    if (tool.name === "read") {
      const path = stringField(input, "path")

      if (path) this.addEdge({ kind: "reads", source: toolID, target: this.requireFile(path), confidence: "explicit" })

      return
    }

    if (tool.name === "edit" || tool.name === "write") {
      const path = stringField(input, "path")

      if (path)
        this.addEdge({ kind: "writes", source: toolID, target: this.recordFile(turnID, path), confidence: "explicit" })

      for (const file of metadataFilePaths(metadata))
        this.addEdge({ kind: "writes", source: toolID, target: this.recordFile(turnID, file), confidence: "explicit" })

      return
    }

    if (tool.name === "patch" || tool.name === "apply_patch") {
      for (const file of metadataFilePaths(metadata))
        this.addEdge({ kind: "writes", source: toolID, target: this.recordFile(turnID, file), confidence: "explicit" })

      return
    }

    if (SEARCH_TOOLS.has(tool.name)) {
      const scope = stringField(input, "path")

      if (scope)
        this.addEdge({ kind: "searches", source: toolID, target: this.requireFile(scope), confidence: "explicit" })

      return
    }
  }
}

function toolCategory(tool: SessionMessageAssistantTool) {
  return timelineCategory(tool) ?? (SUBAGENT_TOOLS.has(tool.name) ? "subagents" : "tools")
}

function toolStatus(tool: SessionMessageAssistantTool): NodeStatus {
  if (tool.state.status === "streaming" || tool.state.status === "running") return "running"

  if (currentToolFailed(tool)) return "failed"

  return "success"
}

function toolFacts(tool: SessionMessageAssistantTool) {
  return {
    input: toolInput(tool),
    metadata: toolMetadata(tool),
    error: currentToolError(tool),
    output: currentToolOutput(tool),
  }
}

function metadataFilePaths(metadata: Record<string, JsonValue>): string[] {
  const files = metadata.files

  if (!Array.isArray(files)) return []

  return files.flatMap((file) => {
    const path = Option.getOrUndefined(decodeString(file))

    if (path) return [path]
    const object = Option.getOrUndefined(decodeFilePath(file))

    return object ? [object.path] : []
  })
}

function attachmentPaths(files: readonly PromptFileAttachment[] | undefined): string[] {
  if (!files) return []

  return files.flatMap((file) => {
    const path = file.mention?.text ?? (file.source.type === "uri" ? file.source.uri : undefined)

    return path ? [path] : []
  })
}

function shellStatus(message: SessionMessageShell): NodeStatus {
  if (message.status === "running") return "running"

  if (message.status === "killed") return "interrupted"

  if (message.status === "timeout") return "failed"

  if (message.status === "exited" && message.exit !== undefined && message.exit !== 0) return "failed"

  return "success"
}

function compactionStatus(message: Extract<SessionMessageInfo, { type: "compaction" }>): NodeStatus {
  if (message.status === "completed") return "success"

  if (message.status === "failed") return "failed"

  return "running"
}

/** What the compaction left behind: its summary, or the error that stopped it. */
function compactionSummary(message: Extract<SessionMessageInfo, { type: "compaction" }>): string | undefined {
  if (message.status === "failed") return message.error?.message ? truncate(message.error.message, 200) : undefined

  return message.summary ? truncate(message.summary, 200) : undefined
}

/**
 * T6.5 — a provider compaction stores its replacement window in `native.messages` and replays it
 * instead of using a summary. That is a different fact about the context than a summary, so the
 * node says which one it was.
 */
function compactionReplays(message: Extract<SessionMessageInfo, { type: "compaction" }>): boolean {
  if (message.status !== "completed") return false

  return message.native !== undefined && "messages" in message.native
}

function toolResultLabel(status: NodeStatus) {
  if (status === "failed") return "failed"

  if (status === "running") return "running"

  return "ok"
}

function noticeLabel(message: GraphNotice) {
  if (message.type === "synthetic") return truncate(message.description ?? message.text)

  if (message.type === "skill") return `Skill: ${message.name}`

  return truncate(message.text)
}

function noticeSummary(message: GraphNotice) {
  if (message.type === "skill") return undefined

  return message.text
}

function isInterrupted(error: SessionMessageAssistant["error"]) {
  return error?.type.toLowerCase().includes("abort") || error?.type.toLowerCase().includes("interrupt")
}

function isNotice(message: SessionMessageInfo): message is GraphNotice {
  return !ACTIVITY_MESSAGE_TYPES.some((type) => type === message.type)
}

function parentPath(file: string) {
  const normalized = normalizePath(file)
  const slash = normalized.lastIndexOf("/")
  return slash === -1 ? "" : normalized.slice(0, slash)
}

function parentPaths(file: string) {
  const parts = normalizePath(file).split("/")
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join("/"))
}

function depth(directory: string) {
  return directory.split("/").length
}

/**
 * Builds the graph model. `sessionID` is optional: when the host knows the session, the root node
 * carries it (T3.6) so an exported map names its session. The root id stays literal, so nothing
 * that resolves a node by id changes. `lineage` is optional too (T6.5): it records where the
 * session came from, without drawing an edge into another session.
 */
export type BuildGraphInput = {
  messages: SessionMessageInfo[]
  status: SessionStatus
  sessionID?: string
  lineage?: SessionLineage
  /** T29.3 — absent keeps the session-only model byte-identical. */
  snapshot?: WorkspaceSnapshot
  /** T21.1 — per-turn file diffs for hunk symbol extraction. */
  diffByTurn?: Map<string, FileDiffInfo[]>
}

export function buildGraph(input: BuildGraphInput): GraphModel {
  return new GraphBuilder(input.messages, input.status, input.snapshot, input.sessionID, input.lineage, input.diffByTurn).build()
}
