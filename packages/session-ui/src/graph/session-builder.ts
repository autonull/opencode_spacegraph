import type {
  FileDiffInfo,
  JsonValue,
  PromptFileAttachment,
  SessionMessageAssistant,
  SessionMessageAssistantTool,
  SessionMessageInfo,
  SessionMessageShell,
  SessionStatus,
} from "@opencode/client/promise"
import type { WorkspaceSnapshot } from "./model"
import { Kernel } from "@spacegraphjs/kernel"
import { Option, Schema } from "effect"
import stripAnsi from "strip-ansi"
import { timelineCategory } from "../timeline/detail"
import { Timeline } from "../timeline/projection"
import { currentToolError, currentToolFailed, currentToolOutput } from "../message/current-tool-state"
import {
  SESSION_NODE_ID,
  decodeString,
  diffNodeID,
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
  type GraphNode,
  type NodeStatus,
  type PhaseCategory,
  type Range,
  type SessionLineage,
  type ZoomLevel,
} from "./model"
import { toGraphEdge, toGraphNode, toKernelEdge, toKernelNode, type GraphViewMeta } from "./view"
import { PHASE_LABELS, SEARCH_TOOLS, SHELL_TOOLS, SUBAGENT_TOOLS } from "./vocabulary"
import {
  buildFileNodes,
  buildDirectoryNodes,
  buildPackageNodes,
  buildCommitNodesAndEdges,
  buildBranchNodesAndEdges,
  buildSymbolNodesAndEdges,
  buildHunkSymbolNodesAndEdges,
  buildProcessNodes,
  buildPortNodesAndEdges,
  buildIssueNodes,
} from "./workspace-attachments"

type ProvenanceStrategy = (tool: SessionMessageAssistantTool, toolID: string, turnID: string) => void
type ProvenanceStrategies = Record<string, ProvenanceStrategy>

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
export type WorkspaceStage =
  | "files"
  | "directories"
  | "packages"
  | "commits"
  | "branches"
  | "symbols"
  | "hunk-symbols"
  | "processes"
  | "ports"
  | "issues"

export const WORKSPACE_STAGES: readonly WorkspaceStage[] = [
  "files",
  "directories",
  "packages",
  "commits",
  "branches",
  "symbols",
  "hunk-symbols",
  "processes",
  "ports",
  "issues",
]

export class GraphBuilder {
  private readonly nodes: GraphNode[] = []
  private readonly edges: GraphEdge[] = []
  private readonly turns: string[] = []
  private readonly nodeIDs = new Set<string>()
  private readonly edgeIDs = new Set<string>()
  private readonly nodesByID = new Map<string, GraphNode>()
  /** The files the model knows, by normalized path. */
  private readonly fileNodes = new Map<string, string>()
  private readonly touchedFiles = new Set<string>()
  /** The files each turn touched, for the turn's diff node. */
  private readonly turnFiles = new Map<string, Set<string>>()
  /** The last child of a turn, for the turn's `sequence` chain. */
  private readonly lastChildByTurn = new Map<string, string>()
  /** The open phase of a turn, and the members it has collected. */
  private readonly phaseByTurn = new Map<string, { id: string; category: PhaseCategory; members: string[] }>()
  private readonly phaseOrdinalsByTurn = new Map<string, number>()
  /** The last failure in a turn, so a retry can point back at it. */
  private readonly lastErrorByTurn = new Map<string, string>()
  /** T31.1 — per-turn file diffs for writes edge payload labels. */
  private readonly diffByTurn?: Map<string, FileDiffInfo[]>
  private previousTurn: string | undefined
  private readonly goal: string | undefined
  private turnByMessageID = new Map<string, string>()
  private activeTurn: string | undefined
  private constructed = false

  constructor(
    private readonly messages: SessionMessageInfo[],
    private readonly status: SessionStatus,
    private readonly snapshot?: WorkspaceSnapshot,
    sessionID?: string,
    lineage?: SessionLineage,
    diffByTurn?: Map<string, FileDiffInfo[]>,
  ) {
    this.diffByTurn = diffByTurn
    this.goal = messages.find((message) => message.type === "user")?.text

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

  private construct() {
    if (this.constructed) return
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

    this.turnByMessageID = turnByMessageID
    this.activeTurn = activeTurn
    this.constructed = true
  }

  static buildWorkspaceStage(
    kernel: Kernel,
    stage: WorkspaceStage,
    snapshot: WorkspaceSnapshot,
    diffByTurn?: Map<string, FileDiffInfo[]>,
  ): Kernel {
    const builder = new GraphBuilder([], { type: "idle" }, undefined, undefined, undefined, diffByTurn)
    builder.seed(kernel)
    switch (stage) {
      case "files":
        builder.attachFiles(snapshot)
        break
      case "directories":
        builder.attachDirectories(snapshot)
        break
      case "packages":
        builder.attachPackages(snapshot)
        break
      case "commits":
        builder.attachCommits(snapshot)
        break
      case "branches":
        builder.attachBranches(snapshot)
        break
      case "symbols":
        builder.attachSymbols(snapshot)
        break
      case "hunk-symbols":
        if (diffByTurn) builder.attachHunkSymbols(diffByTurn)
        break
      case "processes":
        builder.attachProcesses(snapshot)
        break
      case "ports":
        builder.attachPorts(snapshot)
        break
      case "issues":
        builder.attachIssues(snapshot)
        break
    }
    return builder.buildKernel(kernel.version + 1)
  }

  private seed(kernel: Kernel) {
    this.nodes.length = 0
    this.edges.length = 0
    this.nodeIDs.clear()
    this.edgeIDs.clear()
    this.nodesByID.clear()
    this.fileNodes.clear()
    this.touchedFiles.clear()

    for (const node of kernel.nodes) {
      const graphNode = toGraphNode(node)
      this.nodes.push(graphNode)
      this.nodeIDs.add(graphNode.id)
      this.nodesByID.set(graphNode.id, graphNode)
      if (graphNode.kind === "file") {
        const path = graphNode.data?.path
        if (typeof path === "string") {
          this.fileNodes.set(normalizePath(path), graphNode.id)
          if (graphNode.provenance === undefined) this.touchedFiles.add(normalizePath(path))
        }
      }
    }
    for (const edge of kernel.edges) {
      const graphEdge = toGraphEdge(edge)
      this.edges.push(graphEdge)
      this.edgeIDs.add(graphEdge.id)
    }
    this.constructed = true
  }

  buildKernel(version = 0): Kernel {
    this.construct()
    return new Kernel({
      nodes: this.nodes.map(toKernelNode),
      edges: this.edges.map(toKernelEdge),
      hyperedges: [],
      version,
    })
  }

  meta(): GraphViewMeta {
    this.construct()
    const meta: GraphViewMeta = {
      root: SESSION_NODE_ID,
      turns: this.turns,
      turnByMessageID: this.turnByMessageID,
    }

    if (this.goal !== undefined) meta.goal = this.goal
    if (this.activeTurn !== undefined) meta.activeTurn = this.activeTurn
    if (this.snapshot !== undefined) {
      meta.workspaceRoot = this.snapshot.root
      meta.snapshot = {
        revision: this.snapshot.revision,
        asOf: this.snapshot.asOf,
        missing: this.snapshot.missing,
      }
    }

    return meta
  }

  /**
   * T19.1/T29.3 — the directory skeleton derived from the files the session touched and the
   * snapshot's own files. It runs only when a snapshot is present, so the session-only model stays
   * byte-identical. Edges use the existing `part-of` vocabulary; no new layout geometry is needed.
   */
  private attachFiles(snapshot: WorkspaceSnapshot) {
    const newFiles = buildFileNodes(snapshot, this.fileNodes)
    for (const { node, normalized } of newFiles) {
      this.fileNodes.set(normalized, node.id)
      this.addNode(node)
    }
  }

  private attachDirectories(snapshot: WorkspaceSnapshot) {
    const dirData = buildDirectoryNodes(this.fileNodes, this.touchedFiles, snapshot)
    for (const { node, edges } of dirData) {
      if (node.id) this.addNode(node)
      for (const edge of edges) this.addEdge(edge)
    }
  }

  /** T22.1 — package nodes from snapshot packages array. */
  private attachPackages(snapshot: WorkspaceSnapshot) {
    for (const node of buildPackageNodes(snapshot)) this.addNode(node)
  }

  /** T20.1 — commit nodes from snapshot commits array. */
  private attachCommits(snapshot: WorkspaceSnapshot) {
    const { nodes, edges } = buildCommitNodesAndEdges(snapshot, this.fileNodes)
    for (const node of nodes) this.addNode(node)
    for (const edge of edges) this.addEdge(edge)
  }

  /** T20.2 — branch nodes from snapshot branches array. */
  private attachBranches(snapshot: WorkspaceSnapshot) {
    const { nodes, edges } = buildBranchNodesAndEdges(snapshot, this.nodeIDs)
    for (const node of nodes) this.addNode(node)
    for (const edge of edges) this.addEdge(edge)
  }

  /** T21.1/T21.2 — symbol nodes from snapshot symbols array. */
  private attachSymbols(snapshot: WorkspaceSnapshot) {
    const { nodes, edges } = buildSymbolNodesAndEdges(snapshot, this.fileNodes)
    for (const node of nodes) this.addNode(node)
    for (const edge of edges) this.addEdge(edge)
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
    const { nodes, edges } = buildHunkSymbolNodesAndEdges(
      diffByTurn,
      this.nodeIDs,
      this.fileNodes,
      this.symbolsFromHunk.bind(this),
    )
    for (const node of nodes) this.addNode(node)
    for (const edge of edges) this.addEdge(edge)
  }

  /** T23.1/T23.2 — process and port nodes from snapshot. */
  private attachProcesses(snapshot: WorkspaceSnapshot) {
    for (const node of buildProcessNodes(snapshot)) this.addNode(node)
  }

  private attachPorts(snapshot: WorkspaceSnapshot) {
    const { nodes, edges } = buildPortNodesAndEdges(snapshot)
    for (const node of nodes) this.addNode(node)
    for (const edge of edges) this.addEdge(edge)
  }

  /** T25.1 — issue nodes from snapshot. */
  private attachIssues(snapshot: WorkspaceSnapshot) {
    for (const node of buildIssueNodes(snapshot)) this.addNode(node)
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
    this.touchedFiles.add(normalized)
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

  /** T31.1 — find diff info for a file in a turn. */
  private diffForFile(turnID: string | undefined, path: string): FileDiffInfo | undefined {
    if (!turnID || !this.diffByTurn) return undefined
    const diffs = this.diffByTurn.get(turnID)
    if (!diffs) return undefined
    const normalized = normalizePath(path)
    return diffs.find((d) => normalizePath(d.file) === normalized)
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

  /** Builds the common node fields shared by all `attach` calls. */
  private baseNode(
    id: string,
    kind: GraphNode["kind"],
    turnID: string,
    options: {
      label: string
      summary?: string
      status?: GraphNode["status"]
      messageID?: string
      partID?: string
      toolID?: string
      time?: number
      minLevel?: ZoomLevel
      data?: Record<string, JsonValue>
    },
  ): GraphNode {
    return {
      id,
      kind,
      label: options.label,
      summary: options.summary,
      status: options.status ?? "neutral",
      turnID,
      messageID: options.messageID,
      partID: options.partID,
      toolID: options.toolID,
      time: options.time,
      minLevel: options.minLevel ?? "execution",
      data: options.data,
    }
  }

  private appendUserPrompt(
    message: Extract<SessionMessageInfo, { type: "user" }>,
    turnID: string,
    steered: boolean,
  ) {
    const nodeID = messageNodeID(message.id)

    this.attach(
      this.baseNode(nodeID, "message", turnID, {
        label: truncate(message.text),
        summary: message.text,
        messageID: message.id,
        time: message.time.created,
        minLevel: steered ? "execution" : "overview",
        data: steered ? { role: "user", steered: true } : { role: "user" },
      }),
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
      this.baseNode(nodeID, "message", turnID, {
        label: truncate(message.command),
        summary: message.command,
        status: status === "failed" ? "failed" : "neutral",
        messageID: message.id,
        time: message.time.created,
        data: { role: "shell", command: message.command },
      }),
      turnID,
      { phase: "verify" },
    )

    const resultID = resultNodeID(message.id)

    this.attach(
      this.baseNode(resultID, "result", turnID, {
        label: message.status === "exited" ? `exit ${message.exit ?? 0}` : message.status,
        summary: message.output?.output ? truncate(message.output.output, 200) : undefined,
        status,
        messageID: message.id,
        time: message.time.completed ?? message.time.created,
        data: {
          exit: message.exit ?? null,
          timeout: message.status === "timeout",
          truncated: message.output?.truncated ?? null,
          output: terminalOutput(message.output?.output),
        },
      }),
      turnID,
      { produces: nodeID, phase: "verify" },
    )

    if (status === "failed") this.noteError(turnID, resultID)
  }

  private appendAssistant(message: SessionMessageAssistant, turnID: string) {
    message.snapshot?.files?.forEach((file) => {
      const id = this.recordFile(turnID, file)
      const diff = this.diffForFile(turnID, file)
      this.addEdge({
        kind: "writes",
        source: turnID,
        target: id,
        confidence: "structural",
        data: diff ? { additions: diff.additions, deletions: diff.deletions } : undefined,
      })
    })

    let textOrdinal = 0
    let reasoningOrdinal = 0

    for (const content of message.content) {
      if (content.type === "text") {
        if (!content.text.trim()) continue
        this.attach(
          this.baseNode(textNodeID(message.id, textOrdinal++), "message", turnID, {
            label: truncate(content.text),
            summary: content.text,
            messageID: message.id,
            time: message.time.created,
            data: { role: "assistant" },
          }),
          turnID,
        )
        continue
      }

      if (content.type === "reasoning") {
        if (!content.text.trim()) continue
        const nodeID = reasoningNodeID(message.id, reasoningOrdinal++)
        this.attach(
          this.baseNode(nodeID, "reasoning", turnID, {
            label: truncate(content.text),
            summary: content.text,
            messageID: message.id,
            partID: nodeID,
            time: content.time?.created ?? message.time.created,
            minLevel: "detail",
          }),
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
        this.baseNode(nodeID, "error", turnID, {
          label: interrupted ? "Interrupted" : truncate(message.error.message),
          summary: message.error.message,
          status: interrupted ? "interrupted" : "failed",
          messageID: message.id,
          time: message.time.completed ?? message.time.created,
          data: { type: message.error.type },
        }),
        turnID,
      )
      this.noteError(turnID, nodeID)
    }

    if (message.retry) {
      const nodeID = retryNodeID(message.id, message.retry.attempt)

      this.attach(
        this.baseNode(nodeID, "retry", turnID, {
          label: `Retry #${message.retry.attempt}`,
          summary: message.retry.error.message,
          messageID: message.id,
          time: message.retry.at,
          data: { attempt: message.retry.attempt },
        }),
        turnID,
      )

      const evidence = this.lastErrorByTurn.get(turnID)

      if (evidence) this.addEdge({ kind: "evidence", source: evidence, target: nodeID, confidence: "structural" })
    }
  }

  private appendTool(tool: SessionMessageAssistantTool, message: SessionMessageAssistant, turnID: string) {
    const status = tool.state.status === "streaming" || tool.state.status === "running"
      ? "running"
      : currentToolFailed(tool)
        ? "failed"
        : "success"
    const category = timelineCategory(tool) ?? (SUBAGENT_TOOLS.has(tool.name) ? "subagents" : "tools")

    if (SUBAGENT_TOOLS.has(tool.name)) {
      const { metadata, input } = toolFacts(tool)
      const childID = stringField(metadata, "sessionID") ?? stringField(metadata, "sessionId")
      const nodeID = childID ? subagentNodeID(childID) : subagentToolNodeID(tool.id)

      this.attach(
        this.baseNode(nodeID, "subagent", turnID, {
          label: stringField(input, "description") ?? stringField(input, "agent") ?? "Subagent",
          summary: stringField(input, "prompt"),
          status,
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
        }),
        turnID,
        { phase: "delegate" },
      )

      if (status === "failed") this.noteError(turnID, nodeID)

      return
    }

    const nodeID = toolNodeID(tool.id)
    const { input, metadata, error, output } = toolFacts(tool)

    this.attach(
      this.baseNode(nodeID, "tool", turnID, {
        label: tool.name,
        summary: output ? truncate(output, 200) : error ? truncate(error) : undefined,
        status,
        messageID: message.id,
        partID: tool.id,
        toolID: tool.id,
        time: tool.time.created,
        data: { name: tool.name, category, input },
      }),
      turnID,
      { phase: phaseCategoryForTool(tool.name) },
    )

    if (SHELL_TOOLS.has(tool.name)) {
      const resultID = resultNodeID(tool.id)

      const resultLabel = status === "failed" ? "failed" : status === "running" ? "running" : "ok"

      this.attach(
        this.baseNode(resultID, "result", turnID, {
          label: resultLabel,
          summary: output ? truncate(output, 400) : error,
          status,
          messageID: message.id,
          partID: tool.id,
          toolID: tool.id,
          time: tool.time.completed ?? tool.time.created,
          data: { exit: metadata.exit ?? null, timeout: metadata.timeout === true, output: terminalOutput(output) },
        }),
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
        this.baseNode(errorID, "error", turnID, {
          label: truncate(error),
          summary: error,
          status: "failed",
          messageID: message.id,
          partID: tool.id,
          time: tool.time.completed ?? tool.time.created,
        }),
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
        this.baseNode(nodeID, "error", turnID, {
          label: truncate(message.error.message),
          summary: message.error.message,
          status: "failed",
          messageID: message.id,
          time: message.time.created,
          data: { type: message.error.type },
        }),
        turnID,
      )
      this.noteError(turnID, nodeID)
    } else if (message.outcome === "interrupted") {
      this.attach(
        this.baseNode(errorNodeID(message.id, "idle"), "error", turnID, {
          label: "Interrupted",
          summary: message.error?.message,
          status: "interrupted",
          messageID: message.id,
          time: message.time.created,
        }),
        turnID,
      )
    }

    const files = this.turnFiles.get(turnID)

    if (!files || files.size === 0) return

    const nodeID = diffNodeID(message.id)

    this.attach(
      this.baseNode(nodeID, "diff", turnID, {
        label: `${files.size} file${files.size === 1 ? "" : "s"} changed`,
        messageID: message.id,
        time: message.time.created,
        data: { files: [...files].sort() },
      }),
      turnID,
    )

    for (const file of [...files].sort())
      this.addEdge({ kind: "produces", source: nodeID, target: this.requireFile(file), confidence: "explicit" })
  }

  private appendCompaction(message: Extract<SessionMessageInfo, { type: "compaction" }>, turnID: string) {
    const nodeID = messageNodeID(message.id)

    this.attach(
      this.baseNode(nodeID, "compaction", turnID, {
        label: message.status === "completed" ? "Compacted context" : `Compaction ${message.status}`,
        summary: compactionSummary(message),
        status: compactionStatus(message),
        messageID: message.id,
        time: message.time.created,
        // T6.5: a compaction either replaces the context with a summary or replays a provider's
        // replacement window. The two are different facts about what the agent can still see.
        data: { reason: message.reason, replayed: compactionReplays(message) },
      }),
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
      this.baseNode(nodeID, "notice", turnID, {
        label: noticeLabel(message),
        summary: noticeSummary(message),
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
      }),
      turnID,
    )

    if (!childID) return

    const childNodeID = subagentNodeID(childID)

    // T6.5: only wire the delegation when the child session has a node here. An edge to a node that
    // does not exist is a dangling connection the renderer would have to warn about.
    if (this.nodeIDs.has(childNodeID))
      this.addEdge({ kind: "delegates", source: nodeID, target: childNodeID, confidence: "explicit" })
  }

  /** Strategy for recording provenance edges for a tool. */
  private readonly provenanceStrategies: ProvenanceStrategies = {
    read: (tool, toolID, turnID) => {
      const { input } = toolFacts(tool)
      const path = stringField(input, "path")
      if (path) this.addEdge({ kind: "reads", source: toolID, target: this.requireFile(path), confidence: "explicit" })
    },
    edit: (tool, toolID, turnID) => this.recordWriteProvenance(tool, toolID, turnID),
    write: (tool, toolID, turnID) => this.recordWriteProvenance(tool, toolID, turnID),
    patch: (tool, toolID, turnID) => this.recordMetadataWritesProvenance(tool, toolID, turnID),
    apply_patch: (tool, toolID, turnID) => this.recordMetadataWritesProvenance(tool, toolID, turnID),
  }

  /** The files a tool touched, as provenance edges. */
  private recordProvenance(tool: SessionMessageAssistantTool, toolID: string, turnID: string) {
    const strategy = this.provenanceStrategies[tool.name]
    if (strategy) {
      strategy(tool, toolID, turnID)
      return
    }

    if (SEARCH_TOOLS.has(tool.name)) {
      const { input } = toolFacts(tool)
      const scope = stringField(input, "path")
      if (scope) this.addEdge({ kind: "searches", source: toolID, target: this.requireFile(scope), confidence: "explicit" })
    }
  }

  private recordWriteProvenance(tool: SessionMessageAssistantTool, toolID: string, turnID: string) {
    const { input, metadata } = toolFacts(tool)
    const path = stringField(input, "path")
    if (path) this.addWritesEdge(toolID, turnID, path)
    for (const file of metadataFilePaths(metadata)) this.addWritesEdge(toolID, turnID, file)
  }

  private recordMetadataWritesProvenance(tool: SessionMessageAssistantTool, toolID: string, turnID: string) {
    const { metadata } = toolFacts(tool)
    for (const file of metadataFilePaths(metadata)) this.addWritesEdge(toolID, turnID, file)
  }

  private addWritesEdge(toolID: string, turnID: string, path: string) {
    const diff = this.diffForFile(turnID, path)
    this.addEdge({
      kind: "writes",
      source: toolID,
      target: this.recordFile(turnID, path),
      confidence: "explicit",
      data: diff ? { additions: diff.additions, deletions: diff.deletions } : undefined,
    })
  }
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

/**
 * Builds the graph model. `sessionID` is optional: when the host knows the session, the root node
 * carries it (T3.6) so an exported map names its session. The root id stays literal, so nothing
 * that resolves a node by id changes. `lineage` is optional too (T6.5): it records where the
 * session came from, without drawing an edge into another session.
 */
export type BuildSessionInput = {
  messages: SessionMessageInfo[]
  status: SessionStatus
  sessionID?: string
  lineage?: SessionLineage
  /** T29.3 — absent keeps the session-only model byte-identical. */
  snapshot?: WorkspaceSnapshot
  /** T21.1 — per-turn file diffs for hunk symbol extraction. */
  diffByTurn?: Map<string, FileDiffInfo[]>
}

export function buildSessionKernel(input: BuildSessionInput): Kernel {
  return new GraphBuilder(
    input.messages,
    input.status,
    input.snapshot,
    input.sessionID,
    input.lineage,
    input.diffByTurn,
  ).buildKernel()
}
