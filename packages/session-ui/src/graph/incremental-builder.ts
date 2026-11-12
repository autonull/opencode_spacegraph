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
import { resolveGraphLabels, type GraphLabels } from "./labels"
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

type GraphNotice = Exclude<SessionMessageInfo, { type: ActivityMessageType }>

const decodeJsonObject = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Record(Schema.String, Schema.Json)))

const decodeFilePath = Schema.decodeUnknownOption(Schema.Struct({ path: Schema.String }))

function truncate(text: string, max = 80) {
  const single = text.replace(/\s+/g, " ").trim()
  return single.length > max ? `${single.slice(0, max - 1)}…` : single
}

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
    return Option.getOrElse(decodeJsonObject(tool.state.input), () => ({})) as Record<string, JsonValue>
  }
  return tool.state.input
}

function toolMetadata(tool: SessionMessageAssistantTool): Record<string, JsonValue> {
  if (!("metadata" in tool.state)) return {}
  return tool.state.metadata ?? {}
}

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

export interface IncrementalBuilderState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  turns: string[]
  nodeIDs: Set<string>
  edgeIDs: Set<string>
  nodesByID: Map<string, GraphNode>
  fileNodes: Map<string, string>
  touchedFiles: Set<string>
  turnFiles: Map<string, Set<string>>
  lastChildByTurn: Map<string, string>
  phaseByTurn: Map<string, { id: string; category: PhaseCategory; members: string[] }>
  phaseOrdinalsByTurn: Map<string, number>
  lastErrorByTurn: Map<string, string>
  diffByTurn?: Map<string, FileDiffInfo[]>
  previousTurn: string | undefined
  goal: string | undefined
  turnByMessageID: Map<string, string>
  activeTurn: string | undefined
  constructed: boolean
  sessionID?: string
  lineage?: SessionLineage
  messages: SessionMessageInfo[]
  status: SessionStatus
  snapshot?: WorkspaceSnapshot
}

export class IncrementalGraphBuilder {
  private state: IncrementalBuilderState
  private processedMessageCount = 0
  private readonly messages: SessionMessageInfo[]
  private readonly status: SessionStatus
  private readonly labels: GraphLabels

  constructor(
    messages: SessionMessageInfo[],
    status: SessionStatus,
    snapshot?: WorkspaceSnapshot,
    sessionID?: string,
    lineage?: SessionLineage,
    diffByTurn?: Map<string, FileDiffInfo[]>,
    previousState?: IncrementalBuilderState,
    labels?: Partial<GraphLabels>,
  ) {
    this.messages = messages
    this.status = status
    this.labels = resolveGraphLabels(labels)
    if (previousState) {
      this.state = previousState
      this.state.messages = messages
      this.state.status = status
      this.state.snapshot = snapshot
      this.state.diffByTurn = diffByTurn
      this.processedMessageCount = this.countProcessedMessages(this.state.turnByMessageID)
    } else {
      this.state = this.createInitialState(sessionID, lineage, diffByTurn, messages, status)
      this.processedMessageCount = 0
    }
  }

  private createInitialState(
    sessionID?: string,
    lineage?: SessionLineage,
    diffByTurn?: Map<string, FileDiffInfo[]>,
    messages: SessionMessageInfo[] = [],
    status: SessionStatus = { type: "idle" },
  ): IncrementalBuilderState {
    const state: IncrementalBuilderState = {
      nodes: [],
      edges: [],
      turns: [],
      nodeIDs: new Set(),
      edgeIDs: new Set(),
      nodesByID: new Map(),
      fileNodes: new Map(),
      touchedFiles: new Set(),
      turnFiles: new Map(),
      lastChildByTurn: new Map(),
      phaseByTurn: new Map(),
      phaseOrdinalsByTurn: new Map(),
      lastErrorByTurn: new Map(),
      diffByTurn,
      previousTurn: undefined,
      goal: undefined,
      turnByMessageID: new Map(),
      activeTurn: undefined,
      constructed: false,
      sessionID,
      lineage,
      messages,
      status,
      snapshot: undefined,
    }

    state.nodes.push({
      id: SESSION_NODE_ID,
      kind: "session",
      label: this.labels.session,
      status: "neutral",
      minLevel: "overview",
      data: rootData(sessionID, lineage),
    })
    state.nodeIDs.add(SESSION_NODE_ID)
    state.nodesByID.set(SESSION_NODE_ID, state.nodes[0])

    state.goal = messages.find((message) => message.type === "user")?.text
    if (state.goal) state.nodesByID.get(SESSION_NODE_ID)!.summary = truncate(state.goal)

    return state
  }

  private countProcessedMessages(turnByMessageID: Map<string, string>): number {
    return turnByMessageID.size
  }

  private constructIncremental() {
    if (this.state.constructed && this.processedMessageCount === this.messages.length) {
      return
    }

    const { turnByMessageID, activeMessageID } = Timeline.constructSessionMessageRows(this.messages, true, this.status)
    const openers = new Map<string, SessionMessageInfo>()

    for (const message of this.messages) {
      const owner = turnByMessageID.get(message.id)
      if (owner === message.id) openers.set(message.id, message)
    }

    const startIndex = this.processedMessageCount
    for (let i = startIndex; i < this.messages.length; i++) {
      const message = this.messages[i]
      const owner = turnByMessageID.get(message.id)
      const turnID = this.ensureTurn(openers.get(owner ?? message.id) ?? message, owner)

      if (turnID !== this.state.previousTurn && this.state.previousTurn)
        this.addEdge({ kind: "sequence", source: this.state.previousTurn, target: turnID, confidence: "explicit" })

      if (turnID !== SESSION_NODE_ID) this.state.previousTurn = turnID

      const isOpener = owner === message.id

      if (message.type === "user") {
        this.appendUserPrompt(message, turnID, !isOpener)
        continue
      }

      if (message.type === "shell") this.appendShell(message, turnID)
      else if (message.type === "assistant") this.appendAssistant(message, turnID)
      else if (message.type === "idle") this.appendIdle(message, turnID)
      else if (message.type === "compaction") this.appendCompaction(message, turnID)
      else if (isNotice(message)) this.appendNotice(message, turnID)
    }

    if (!this.state.goal) {
      const opener = this.messages.find((message) => message.type === "assistant")
      const textPart = opener?.content.find((part) => part.type === "text")
      if (textPart?.type === "text") this.state.nodesByID.get(SESSION_NODE_ID)!.summary = truncate(textPart.text)
    }

    const activeOwner = activeMessageID ? turnByMessageID.get(activeMessageID) : undefined
    const activeTurn = activeOwner ? turnNodeID(activeOwner) : undefined

    if (activeTurn && this.state.nodeIDs.has(activeTurn)) {
      const node = this.state.nodesByID.get(activeTurn)!
      node.data = { ...node.data, active: this.status.type !== "idle" }
    }

    this.state.turnByMessageID = turnByMessageID
    this.state.activeTurn = activeTurn
    this.state.constructed = true
    this.processedMessageCount = this.messages.length

    this.deriveFileGroups()
    this.deriveErrorChainGroups()
    this.deriveSubagentGroups()
  }

  static buildWorkspaceStage(
    kernel: Kernel,
    stage: import("./build").WorkspaceStage,
    snapshot: WorkspaceSnapshot,
    diffByTurn?: Map<string, FileDiffInfo[]>,
  ): Kernel {
    const builder = new IncrementalGraphBuilder([], { type: "idle" }, undefined, undefined, undefined, diffByTurn)
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
    this.state.nodes.length = 0
    this.state.edges.length = 0
    this.state.nodeIDs.clear()
    this.state.edgeIDs.clear()
    this.state.nodesByID.clear()
    this.state.fileNodes.clear()
    this.state.touchedFiles.clear()

    for (const node of kernel.nodes) {
      const graphNode = toGraphNode(node)
      this.state.nodes.push(graphNode)
      this.state.nodeIDs.add(graphNode.id)
      this.state.nodesByID.set(graphNode.id, graphNode)
      if (graphNode.kind === "file") {
        const path = graphNode.data?.path
        if (typeof path === "string") {
          this.state.fileNodes.set(normalizePath(path), graphNode.id)
          if (graphNode.provenance === undefined) this.state.touchedFiles.add(normalizePath(path))
        }
      }
    }
    for (const edge of kernel.edges) {
      const graphEdge = toGraphEdge(edge)
      this.state.edges.push(graphEdge)
      this.state.edgeIDs.add(graphEdge.id)
    }
    this.state.constructed = true
  }

  buildKernel(version = 0): Kernel {
    this.constructIncremental()
    return new Kernel({
      nodes: this.state.nodes.map(toKernelNode),
      edges: this.state.edges.map(toKernelEdge),
      hyperedges: [],
      version,
    })
  }

  meta(): GraphViewMeta {
    this.constructIncremental()
    const meta: GraphViewMeta = {
      root: SESSION_NODE_ID,
      turns: this.state.turns,
      turnByMessageID: this.state.turnByMessageID,
    }

    if (this.state.goal !== undefined) meta.goal = this.state.goal
    if (this.state.activeTurn !== undefined) meta.activeTurn = this.state.activeTurn
    if (this.state.snapshot !== undefined) {
      meta.workspaceRoot = this.state.snapshot.root
      meta.snapshot = {
        revision: this.state.snapshot.revision,
        asOf: this.state.snapshot.asOf,
        missing: this.state.snapshot.missing,
      }
    }

    return meta
  }

  getState(): IncrementalBuilderState {
    return this.state
  }

  private attachFiles(snapshot: WorkspaceSnapshot) {
    const newFiles = buildFileNodes(snapshot, this.state.fileNodes)
    for (const { node, normalized } of newFiles) {
      this.state.fileNodes.set(normalized, node.id)
      this.addNode(node)
    }
  }

  private attachDirectories(snapshot: WorkspaceSnapshot) {
    const dirData = buildDirectoryNodes(this.state.fileNodes, this.state.touchedFiles, snapshot)
    for (const { node, edges } of dirData) {
      if (node.id) this.addNode(node)
      for (const edge of edges) this.addEdge(edge)
    }
  }

  private attachPackages(snapshot: WorkspaceSnapshot) {
    for (const node of buildPackageNodes(snapshot)) this.addNode(node)
  }

  private attachCommits(snapshot: WorkspaceSnapshot) {
    const { nodes, edges } = buildCommitNodesAndEdges(snapshot, this.state.fileNodes)
    for (const node of nodes) this.addNode(node)
    for (const edge of edges) this.addEdge(edge)
  }

  private attachBranches(snapshot: WorkspaceSnapshot) {
    const { nodes, edges } = buildBranchNodesAndEdges(snapshot, this.state.nodeIDs)
    for (const node of nodes) this.addNode(node)
    for (const edge of edges) this.addEdge(edge)
  }

  private attachSymbols(snapshot: WorkspaceSnapshot) {
    const { nodes, edges } = buildSymbolNodesAndEdges(snapshot, this.state.fileNodes)
    for (const node of nodes) this.addNode(node)
    for (const edge of edges) this.addEdge(edge)
  }

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

      const hunkHeaderMatch = line.match(/^@@\s*-(\d+)(?:,(\d+))?\s*\+(\d+)(?:,(\d+))?\s*@@/)
      if (hunkHeaderMatch) {
        lineNumber = Number(hunkHeaderMatch[3]) - 1
        continue
      }

      lineNumber++

      const classMatch = line.match(/^\+\s*(?:export\s+)?(?:abstract\s+)?(?:class|interface)\s+(\w+)/)
      if (classMatch) {
        const className = classMatch[1]
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

      const methodMatch = line.match(/^\+\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{?/)
      if (methodMatch && currentClass) {
        const name = methodMatch[1]
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

      const anonMatch = line.match(/^\+\s*(?:const|let|var)\s*[A-Z_a-z][A-Z_a-z0-9]*\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/)
      if (anonMatch) {
        symbols.push({
          name: "anonymous",
          qualified: `${filePath}:${lineNumber}:0`,
          kind: "function",
          range: { start: { line: lineNumber, character: 0 }, end: { line: lineNumber + 5, character: 0 } },
          origin: "hunk:anon",
        })
        continue
      }

      const braceMatch = line.match(/^\+(\s*)\}\s*$/)
      if (braceMatch && braceMatch[1].length <= 1) {
        currentClass = undefined
      }
    }

    return symbols
  }

  private attachHunkSymbols(diffByTurn: Map<string, FileDiffInfo[]>) {
    const { nodes, edges } = buildHunkSymbolNodesAndEdges(
      diffByTurn,
      this.state.nodeIDs,
      this.state.fileNodes,
      this.symbolsFromHunk.bind(this),
    )
    for (const node of nodes) this.addNode(node)
    for (const edge of edges) this.addEdge(edge)
  }

  private attachProcesses(snapshot: WorkspaceSnapshot) {
    for (const node of buildProcessNodes(snapshot)) this.addNode(node)
  }

  private attachPorts(snapshot: WorkspaceSnapshot) {
    const { nodes, edges } = buildPortNodesAndEdges(snapshot)
    for (const node of nodes) this.addNode(node)
    for (const edge of edges) this.addEdge(edge)
  }

  private attachIssues(snapshot: WorkspaceSnapshot) {
    for (const node of buildIssueNodes(snapshot)) this.addNode(node)
  }

  private deriveFileGroups(): void {
    const filesByDir = new Map<string, string[]>()

    for (const node of this.state.nodes) {
      if (node.kind !== "file") continue
      const path = node.data?.path
      if (typeof path !== "string") continue

      const dirPath = path.lastIndexOf("/") > 0 ? path.slice(0, path.lastIndexOf("/")) : "."
      const normalized = normalizePath(dirPath)

      const existing = filesByDir.get(normalized)
      if (existing) existing.push(node.id)
      else filesByDir.set(normalized, [node.id])
    }

    for (const [dirPath, fileIds] of filesByDir) {
      if (fileIds.length < 2) continue

      const id = `file-group:${dirPath.replace(/\//g, ":")}`
      if (this.state.nodeIDs.has(id)) continue

      let writes = 0
      let reads = 0
      let searches = 0

      for (const fileId of fileIds) {
        for (const edge of this.state.edges) {
          if (edge.target !== fileId) continue
          if (edge.kind === "writes") writes++
          else if (edge.kind === "reads") reads++
          else if (edge.kind === "searches") searches++
        }
      }

      this.addNode({
        id,
        kind: "file-group",
        label: dirPath === "." ? this.labels.root : dirPath,
        status: writes > 0 ? "success" : "neutral",
        derived: true,
        minLevel: "overview",
        clusterOf: fileIds,
        data: {
          groupPath: dirPath,
          writes,
          reads,
          searches,
          verifyStatus: "pending",
        },
      })
      this.partOf(id, SESSION_NODE_ID)
    }
  }

  private deriveErrorChainGroups(): void {
    const errorNodes = this.state.nodes.filter((node) => node.kind === "error")
    if (errorNodes.length === 0) return

    const errorsByTurn = new Map<string, string[]>()

    for (const errorNode of errorNodes) {
      const turnID = errorNode.turnID
      if (!turnID) continue

      const existing = errorsByTurn.get(turnID)
      if (existing) existing.push(errorNode.id)
      else errorsByTurn.set(turnID, [errorNode.id])
    }

    for (const [turnID, errorIds] of errorsByTurn) {
      const chainMembers = new Set<string>()

      for (const errorId of errorIds) {
        chainMembers.add(errorId)

        for (const edge of this.state.edges) {
          if (edge.target === errorId && edge.kind === "evidence") {
            chainMembers.add(edge.source)
          }
          if (edge.source === errorId && edge.kind === "evidence") {
            chainMembers.add(edge.target)
          }
          if (edge.source === errorId && edge.kind === "sequence") {
            const targetNode = this.state.nodesByID.get(edge.target)
            if (targetNode?.kind === "retry") chainMembers.add(edge.target)
          }
        }
      }

      for (const edge of this.state.edges) {
        if (errorIds.includes(edge.target) && edge.kind === "produces") {
          chainMembers.add(edge.source)
        }
      }

      const members = [...chainMembers]
      if (members.length < 2) continue

      const id = `error-group:${turnID}`
      if (this.state.nodeIDs.has(id)) continue

      let evidenceRoot: string | undefined
      for (const memberId of members) {
        const node = this.state.nodesByID.get(memberId)
        if (node?.kind === "tool" || node?.kind === "result") {
          for (const edge of this.state.edges) {
            if (edge.source === memberId && edge.kind === "evidence" && errorIds.includes(edge.target)) {
              evidenceRoot = memberId
              break
            }
          }
        }
        if (evidenceRoot) break
      }

      this.addNode({
        id,
        kind: "error-group",
        label: this.labels.errorChain,
        status: "failed",
        derived: true,
        minLevel: "overview",
        clusterOf: members,
        data: {
          evidenceRoot: evidenceRoot ?? null,
          turnID,
        },
      })
      this.partOf(id, turnID)
    }
  }

  private deriveSubagentGroups(): void {
    const subagentNodes = this.state.nodes.filter((node) => node.kind === "subagent")
    if (subagentNodes.length === 0) return

    const subagentsBySession = new Map<string, string[]>()

    for (const node of subagentNodes) {
      const childSessionID = node.data?.childSessionID
      if (typeof childSessionID !== "string") continue

      const existing = subagentsBySession.get(childSessionID)
      if (existing) existing.push(node.id)
      else subagentsBySession.set(childSessionID, [node.id])
    }

    for (const [childSessionID, subagentIds] of subagentsBySession) {
      if (subagentIds.length === 0) continue

      const id = `subagent-group:${childSessionID}`
      if (this.state.nodeIDs.has(id)) continue

      this.addNode({
        id,
        kind: "subagent-group",
        label: this.labels.subagent,
        status: "neutral",
        derived: true,
        minLevel: "overview",
        clusterOf: subagentIds,
        data: {
          childSessionID,
        },
      })
      const firstSubagent = this.state.nodesByID.get(subagentIds[0])
      if (firstSubagent?.turnID) {
        this.partOf(id, firstSubagent.turnID)
      } else {
        this.partOf(id, SESSION_NODE_ID)
      }
    }
  }

  private addNode(node: GraphNode): GraphNode {
    if (this.state.nodeIDs.has(node.id)) return node

    this.state.nodeIDs.add(node.id)
    this.state.nodes.push(node)
    this.state.nodesByID.set(node.id, node)

    return node
  }

  private addEdge(edge: Omit<GraphEdge, "id">) {
    const id = `${edge.kind}:${edge.source}->${edge.target}`

    if (this.state.edgeIDs.has(id)) return

    this.state.edgeIDs.add(id)
    this.state.edges.push({ id, ...edge })
  }

  private partOf(child: string, parent: string, confidence: Confidence = "explicit") {
    this.addEdge({ kind: "part-of", source: child, target: parent, confidence })
  }

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
    const existing = this.state.fileNodes.get(normalized)

    if (existing) return existing

    this.state.fileNodes.set(normalized, id)
    this.state.touchedFiles.add(normalized)
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

    const files = this.state.turnFiles.get(turnID) ?? new Set<string>()

    files.add(normalizePath(path))
    this.state.turnFiles.set(turnID, files)

    return id
  }

  private diffForFile(turnID: string | undefined, path: string): FileDiffInfo | undefined {
    if (!turnID || !this.state.diffByTurn) return undefined
    const diffs = this.state.diffByTurn.get(turnID)
    if (!diffs) return undefined
    const normalized = normalizePath(path)
    return diffs.find((d) => normalizePath(d.file) === normalized)
  }

  private ensureTurn(opener: SessionMessageInfo, owner: string | undefined): string {
    if (!owner) return SESSION_NODE_ID

    const id = turnNodeID(owner)

    if (!this.state.nodeIDs.has(id)) {
      const isShell = opener.type === "shell"
      this.addNode({
        id,
        kind: "turn",
        label: isShell ? truncate(opener.command) : opener.type === "user" ? truncate(opener.text) : this.labels.turn,
        status: "neutral",
        turnID: id,
        messageID: owner,
        time: opener.time.created,
        minLevel: "overview",
      })
      this.state.turns.push(id)
      this.partOf(id, SESSION_NODE_ID)
    }

    return id
  }

  private sequence(turnID: string, childID: string) {
    const previous = this.state.lastChildByTurn.get(turnID)

    if (previous) this.addEdge({ kind: "sequence", source: previous, target: childID, confidence: "explicit" })

    this.state.lastChildByTurn.set(turnID, childID)
  }

  private cluster(turnID: string, childID: string, category: PhaseCategory) {
    const current = this.state.phaseByTurn.get(turnID)

    if (current?.category === category) {
      current.members.push(childID)
      return
    }

    const ordinal = (this.state.phaseOrdinalsByTurn.get(turnID) ?? 0) + 1

    this.state.phaseOrdinalsByTurn.set(turnID, ordinal)

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
    this.state.phaseByTurn.set(turnID, { id, category, members })
  }

  private noteError(turnID: string, nodeID: string) {
    this.state.lastErrorByTurn.set(turnID, nodeID)
  }

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

    if (!steered && this.state.goal && message.text === this.state.goal)
      this.state.nodesByID.get(turnID)!.label = truncate(message.text)

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
      const interrupted = isInterrupted(message.error)
      const nodeID = errorNodeID(message.id, "assistant")

      this.attach(
        this.baseNode(nodeID, "error", turnID, {
          label: interrupted ? this.labels.interrupted : truncate(message.error.message),
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

      const evidence = this.state.lastErrorByTurn.get(turnID)

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
          label: stringField(input, "description") ?? stringField(input, "agent") ?? this.labels.subagent,
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
          label: this.labels.interrupted,
          summary: message.error?.message,
          status: "interrupted",
          messageID: message.id,
          time: message.time.created,
        }),
        turnID,
      )
    }

    const files = this.state.turnFiles.get(turnID)

    if (!files || files.size === 0) return

    const nodeID = diffNodeID(message.id)

    this.attach(
      this.baseNode(nodeID, "diff", turnID, {
        label: this.labels.filesChanged(files.size),
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
        label: message.status === "completed" ? this.labels.compactedContext : this.labels.compaction(message.status),
        summary: compactionSummary(message),
        status: compactionStatus(message),
        messageID: message.id,
        time: message.time.created,
        data: { reason: message.reason, replayed: compactionReplays(message) },
      }),
      turnID,
    )

    const previous = this.state.turns.at(-2)

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

    if (this.state.nodeIDs.has(childNodeID))
      this.addEdge({ kind: "delegates", source: nodeID, target: childNodeID, confidence: "explicit" })
  }

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

function compactionSummary(message: Extract<SessionMessageInfo, { type: "compaction" }>): string | undefined {
  if (message.status === "failed") return message.error?.message ? truncate(message.error.message, 200) : undefined
  return message.summary ? truncate(message.summary, 200) : undefined
}

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