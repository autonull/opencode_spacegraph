import type {
  JsonValue,
  PromptFileAttachment,
  SessionMessageAssistant,
  SessionMessageAssistantTool,
  SessionMessageInfo,
  SessionMessageShell,
  SessionStatus,
} from "@opencode/client/promise"
import { Option, Schema } from "effect"
import stripAnsi from "strip-ansi"
import { timelineCategory } from "../timeline/detail"
import { Timeline } from "../timeline/projection"
import { currentToolError, currentToolFailed, currentToolOutput } from "../message/current-tool-state"

export type ZoomLevel = "overview" | "execution" | "detail"

/** Semantic phases (§5.1): runs of consecutive tool activity of one kind. */
export type PhaseCategory = "explore" | "edit" | "verify" | "delegate" | "result"

export type NodeKind =
  | "session"
  | "turn"
  | "phase"
  | "message"
  | "reasoning"
  | "tool"
  | "file"
  | "subagent"
  | "result"
  | "error"
  | "retry"
  | "compaction"
  | "notice"
  | "diff"
  | "approval"

export type EdgeKind =
  | "part-of"
  | "sequence"
  | "delegates"
  | "reads"
  | "writes"
  | "searches"
  | "produces"
  | "references"
  | "compacts"
  | "evidence"
  | "inferred-cause"

export type Confidence = "explicit" | "structural" | "inferred"

type GraphNotice = Exclude<
  SessionMessageInfo,
  {
    type:
      | "user"
      | "assistant"
      | "shell"
      | "idle"
      | "compaction"
      | "agent-switched"
      | "model-switched"
      | "location-switched"
  }
>

export type NodeStatus = "pending" | "running" | "success" | "failed" | "interrupted" | "neutral"

export type GraphNode = {
  id: string
  kind: NodeKind
  label: string
  summary?: string
  status: NodeStatus
  turnID?: string
  messageID?: string
  partID?: string
  toolID?: string
  time?: number
  derived?: boolean
  minLevel?: ZoomLevel
  clusterOf?: string[]
  data?: Record<string, JsonValue>
}

export type GraphEdge = {
  id: string
  kind: EdgeKind
  source: string
  target: string
  confidence: Confidence
  label?: string
}

export type GraphModel = {
  root: string
  goal?: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** Ordered turn node IDs, one per execution (steered prompts share a turn). */
  turns: string[]
  /** Every message mapped to its owning turn id (the execution opener). */
  turnByMessageID: Map<string, string>
  /** The active turn node ID, when the session still owns work. */
  activeTurn?: string
}

const SESSION_NODE_ID = "session"

export const turnNodeID = (openerID: string) => `turn:${openerID}`

export const messageNodeID = (messageID: string) => `msg:${messageID}`

export const toolNodeID = (toolID: string) => `tool:${toolID}`

export const fileNodeID = (path: string) => `file:${normalizePath(path)}`

export const subagentNodeID = (childSessionID: string) => `sub:${childSessionID}`

export const subagentToolNodeID = (toolID: string) => `sub:${toolID}`

export const phaseNodeID = (turnID: string, category: string, firstOrdinal: number) =>
  `phase:${turnID}:${category}:${firstOrdinal}`

export const diffNodeID = (idleMessageID: string) => `diff:${idleMessageID}`

export const resultNodeID = (toolID: string) => `result:${toolID}`

export const errorNodeID = (messageID: string, partIDOrOrdinal: string) => `err:${messageID}:${partIDOrOrdinal}`

export const retryNodeID = (messageID: string, attempt: number) => `retry:${messageID}:${attempt}`

export const reasoningNodeID = (messageID: string, ordinal: number) => `${messageID}:reasoning:${ordinal}`

export const textNodeID = (messageID: string, ordinal: number) => `${messageID}:text:${ordinal}`

export function normalizePath(path: string) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "")
}

const SUBAGENT_TOOLS = new Set(["subagent", "task"])

const SHELL_TOOLS = new Set(["shell", "execute", "bash"])

const SEARCH_TOOLS = new Set(["glob", "grep", "list"])

const EDIT_TOOLS = new Set(["edit", "write", "patch", "apply_patch"])

const READ_TOOLS = new Set(["read", "glob", "grep", "list", "webfetch"])

const PHASE_LABELS: Record<PhaseCategory, string> = {
  explore: "Explore",
  edit: "Edit",
  verify: "Verify",
  delegate: "Delegate",
  result: "Result",
}

const decodePhaseCategory = Schema.decodeUnknownOption(
  Schema.Literals(["explore", "edit", "verify", "delegate", "result"]),
)

/**
 * The phase a tool belongs to. Named tools map to the semantic vocabulary; anything unclassified
 * falls into `result` so no activity is silently dropped from the phase grouping.
 */
export function phaseCategoryForTool(name: string): PhaseCategory {
  if (SUBAGENT_TOOLS.has(name)) return "delegate"

  if (EDIT_TOOLS.has(name)) return "edit"

  if (SHELL_TOOLS.has(name)) return "verify"

  if (READ_TOOLS.has(name)) return "explore"

  return "result"
}

/** The phase category of a node that participates in a phase (tool, subagent, or phase cluster). */
export function phaseCategoryOf(node: GraphNode): PhaseCategory | undefined {
  if (node.kind === "phase") return Option.getOrUndefined(decodePhaseCategory(node.data?.category))

  if (node.kind === "subagent") return "delegate"

  if (node.kind === "tool") {
    const name = decodeString(node.data?.name)

    return Option.isSome(name) ? phaseCategoryForTool(name.value) : undefined
  }

  return undefined
}

const decodeString = Schema.decodeUnknownOption(Schema.String)

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

function buildGraphInternal(messages: SessionMessageInfo[], status: SessionStatus): GraphModel {
  const { turnByMessageID, activeMessageID } = Timeline.constructSessionMessageRows(messages, true, status)

  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeIDs = new Set<string>()
  const edgeIDs = new Set<string>()
  const turns: string[] = []

  const addNode = (node: GraphNode) => {
    if (nodeIDs.has(node.id)) return node
    nodeIDs.add(node.id)
    nodes.push(node)

    return node
  }

  const addEdge = (edge: Omit<GraphEdge, "id">) => {
    const id = `${edge.kind}:${edge.source}->${edge.target}`

    if (edgeIDs.has(id)) return
    edgeIDs.add(id)
    edges.push({ id, ...edge })
  }

  const partOf = (child: string, parent: string, confidence: Confidence = "explicit") =>
    addEdge({ kind: "part-of", source: child, target: parent, confidence })

  const fileNodes = new Map<string, string>()

  const requireFile = (path: string): string => {
    const normalized = normalizePath(path)
    const id = fileNodeID(normalized)
    const existing = fileNodes.get(normalized)

    if (existing) return existing
    fileNodes.set(normalized, id)
    addNode({
      id,
      kind: "file",
      label: normalized,
      status: "neutral",
      data: { path: normalized },
    })

    return id
  }

  const ownerOf = (messageID: string) => turnByMessageID.get(messageID)

  // Per-turn accumulation for the idle diff node and telling opener from steered prompt.
  const turnFiles = new Map<string, Set<string>>()

  const recordFile = (turnID: string | undefined, path: string) => {
    const id = requireFile(path)

    if (!turnID) return id
    const files = turnFiles.get(turnID) ?? new Set<string>()
    files.add(normalizePath(path))
    turnFiles.set(turnID, files)

    return id
  }

  addNode({
    id: SESSION_NODE_ID,
    kind: "session",
    label: "Session",
    status: "neutral",
    minLevel: "overview",
  })

  const goal = messages.find((message) => message.type === "user")?.text

  if (goal) nodes[0].summary = truncate(goal)

  // The parent turn node for a message, creating it on first sight of its opener.
  const ensureTurn = (opener: SessionMessageInfo, owner: string | undefined): string => {
    if (!owner) return SESSION_NODE_ID
    const id = turnNodeID(owner)

    if (!nodeIDs.has(id)) {
      const isShell = opener.type === "shell"
      addNode({
        id,
        kind: "turn",
        label: isShell ? truncate(opener.command) : opener.type === "user" ? truncate(opener.text) : "Turn",
        status: "neutral",
        turnID: id,
        messageID: owner,
        time: opener.time.created,
        minLevel: "overview",
      })
      turns.push(id)
      partOf(id, SESSION_NODE_ID)
    }

    return id
  }

  // Sequence edges chain consecutive turns and consecutive children of one turn.
  const lastChildByTurn = new Map<string, string>()

  const sequence = (turnID: string, childID: string) => {
    const previous = lastChildByTurn.get(turnID)

    if (previous) addEdge({ kind: "sequence", source: previous, target: childID, confidence: "explicit" })
    lastChildByTurn.set(turnID, childID)
  }

  // Semantic phases: consecutive phase-eligible children of one turn with the same category cluster
  // into one derived `phase` node. Only runs of the same category merge; a category change starts a
  // new cluster. Membership is recorded on `clusterOf` and the phase is `part-of` its turn.
  const phaseByTurn = new Map<string, { id: string; category: PhaseCategory; members: string[] }>()
  const phaseOrdinalsByTurn = new Map<string, number>()

  const cluster = (turnID: string, childID: string, category: PhaseCategory) => {
    const current = phaseByTurn.get(turnID)

    if (current?.category === category) {
      current.members.push(childID)

      return
    }

    const ordinal = (phaseOrdinalsByTurn.get(turnID) ?? 0) + 1
    phaseOrdinalsByTurn.set(turnID, ordinal)
    const id = phaseNodeID(turnID, category, ordinal)
    const members = [childID]

    addNode({
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
    partOf(id, turnID)
    phaseByTurn.set(turnID, { id, category, members })
  }

  let previousTurn: string | undefined

  const lastErrorByTurn = new Map<string, string>()
  const noteError = (turnID: string, nodeID: string) => lastErrorByTurn.set(turnID, nodeID)

  const toolCategory = (tool: SessionMessageAssistantTool) =>
    timelineCategory(tool) ?? (SUBAGENT_TOOLS.has(tool.name) ? "subagents" : "tools")

  const toolStatus = (tool: SessionMessageAssistantTool): NodeStatus => {
    if (tool.state.status === "streaming" || tool.state.status === "running") return "running"

    if (currentToolFailed(tool)) return "failed"

    return "success"
  }

  const toolFacts = (tool: SessionMessageAssistantTool) => {
    const input = toolInput(tool)
    const metadata = toolMetadata(tool)
    const error = currentToolError(tool)
    const output = currentToolOutput(tool)

    return { input, metadata, error, output }
  }

  const recordProvenance = (tool: SessionMessageAssistantTool, toolID: string, turnID: string) => {
    const { input, metadata } = toolFacts(tool)

    if (tool.name === "read") {
      const path = stringField(input, "path")

      if (path) addEdge({ kind: "reads", source: toolID, target: requireFile(path), confidence: "explicit" })

      return
    }

    if (tool.name === "edit" || tool.name === "write") {
      const path = stringField(input, "path")

      if (path) addEdge({ kind: "writes", source: toolID, target: recordFile(turnID, path), confidence: "explicit" })

      for (const file of metadataFilePaths(metadata))
        addEdge({ kind: "writes", source: toolID, target: recordFile(turnID, file), confidence: "explicit" })

      return
    }

    if (tool.name === "patch" || tool.name === "apply_patch") {
      for (const file of metadataFilePaths(metadata))
        addEdge({ kind: "writes", source: toolID, target: recordFile(turnID, file), confidence: "explicit" })

      return
    }

    if (SEARCH_TOOLS.has(tool.name)) {
      const scope = stringField(input, "path")

      if (scope) addEdge({ kind: "searches", source: toolID, target: requireFile(scope), confidence: "explicit" })

      return
    }
  }

  const openers = new Map<string, SessionMessageInfo>()

  for (const message of messages) {
    const owner = ownerOf(message.id)

    if (owner === message.id) openers.set(message.id, message)
  }

  for (const message of messages) {
    const owner = ownerOf(message.id)
    const turnID = ensureTurn(openers.get(owner ?? message.id) ?? message, owner)

    if (turnID !== previousTurn && previousTurn)
      addEdge({ kind: "sequence", source: previousTurn, target: turnID, confidence: "explicit" })

    if (turnID !== SESSION_NODE_ID) previousTurn = turnID

    const isOpener = owner === message.id

    if (isOpener && message.type === "user") {
      const nodeID = messageNodeID(message.id)
      addNode({
        id: nodeID,
        kind: "message",
        label: truncate(message.text),
        summary: message.text,
        status: "neutral",
        turnID,
        messageID: message.id,
        time: message.time.created,
        minLevel: "overview",
        data: { role: "user" },
      })
      partOf(nodeID, turnID)
      sequence(turnID, nodeID)

      if (goal && message.text === goal) nodes.find((node) => node.id === turnID)!.label = truncate(message.text)

      for (const file of attachmentPaths(message.files))
        addEdge({ kind: "references", source: nodeID, target: requireFile(file), confidence: "explicit" })
    } else if (!isOpener && message.type === "user") {
      // Steered prompt: rides the opener's turn.
      const nodeID = messageNodeID(message.id)
      addNode({
        id: nodeID,
        kind: "message",
        label: truncate(message.text),
        summary: message.text,
        status: "neutral",
        turnID,
        messageID: message.id,
        time: message.time.created,
        minLevel: "execution",
        data: { role: "user", steered: true },
      })
      partOf(nodeID, turnID)
      sequence(turnID, nodeID)

      for (const file of attachmentPaths(message.files))
        addEdge({ kind: "references", source: nodeID, target: requireFile(file), confidence: "explicit" })
    } else if (message.type === "shell") {
      appendShell(message, turnID)
    } else if (message.type === "assistant") {
      appendAssistant(message, turnID)
    } else if (message.type === "idle") {
      appendIdle(message, turnID)
    } else if (message.type === "compaction") {
      appendCompaction(message, turnID)
    } else if (isNotice(message)) {
      appendNotice(message, turnID)
    }
  }

  function appendShell(message: SessionMessageShell, turnID: string) {
    const nodeID = messageNodeID(message.id)
    const status = shellStatus(message)
    addNode({
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
    })
    partOf(nodeID, turnID)
    sequence(turnID, nodeID)
    cluster(turnID, nodeID, "verify")

    const resultID = resultNodeID(message.id)
    const resultStatus = shellStatus(message)

    addNode({
      id: resultID,
      kind: "result",
      label: message.status === "exited" ? `exit ${message.exit ?? 0}` : message.status,
      summary: message.output?.output ? truncate(message.output.output, 200) : undefined,
      status: resultStatus,
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
    })
    partOf(resultID, turnID)
    addEdge({ kind: "produces", source: nodeID, target: resultID, confidence: "explicit" })
    sequence(turnID, resultID)
    cluster(turnID, resultID, "verify")

    if (resultStatus === "failed") noteError(turnID, resultID)
  }

  function appendAssistant(message: SessionMessageAssistant, turnID: string) {
    message.snapshot?.files?.forEach((file) => {
      const id = recordFile(turnID, file)
      addEdge({ kind: "writes", source: turnID, target: id, confidence: "structural" })
    })

    let textOrdinal = 0
    let reasoningOrdinal = 0

    for (const content of message.content) {
      if (content.type === "text") {
        if (!content.text.trim()) continue
        const nodeID = textNodeID(message.id, textOrdinal++)
        addNode({
          id: nodeID,
          kind: "message",
          label: truncate(content.text),
          summary: content.text,
          status: "neutral",
          turnID,
          messageID: message.id,
          time: message.time.created,
          minLevel: "execution",
          data: { role: "assistant" },
        })
        partOf(nodeID, turnID)
        sequence(turnID, nodeID)

        continue
      }

      if (content.type === "reasoning") {
        if (!content.text.trim()) continue
        const nodeID = reasoningNodeID(message.id, reasoningOrdinal++)
        addNode({
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
        })
        partOf(nodeID, turnID)
        sequence(turnID, nodeID)

        continue
      }

      appendTool(content, message, turnID)
    }

    if (message.error && !isInterrupted(message.error)) {
      const nodeID = errorNodeID(message.id, "assistant")
      addNode({
        id: nodeID,
        kind: "error",
        label: truncate(message.error.message),
        summary: message.error.message,
        status: "failed",
        turnID,
        messageID: message.id,
        time: message.time.completed ?? message.time.created,
        minLevel: "execution",
        data: { type: message.error.type },
      })
      partOf(nodeID, turnID)
      sequence(turnID, nodeID)
      noteError(turnID, nodeID)
    }

    if (message.retry) {
      const nodeID = retryNodeID(message.id, message.retry.attempt)
      addNode({
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
      })
      partOf(nodeID, turnID)
      sequence(turnID, nodeID)
      const evidence = lastErrorByTurn.get(turnID)

      if (evidence) addEdge({ kind: "evidence", source: evidence, target: nodeID, confidence: "structural" })
    }
  }

  function appendTool(tool: SessionMessageAssistantTool, message: SessionMessageAssistant, turnID: string) {
    const status = toolStatus(tool)
    const category = toolCategory(tool)

    if (SUBAGENT_TOOLS.has(tool.name)) {
      const { metadata, input } = toolFacts(tool)
      const childID = stringField(metadata, "sessionID") ?? stringField(metadata, "sessionId")
      const nodeID = childID ? subagentNodeID(childID) : subagentToolNodeID(tool.id)
      addNode({
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
      })
      partOf(nodeID, turnID)
      sequence(turnID, nodeID)
      cluster(turnID, nodeID, "delegate")

      if (status === "failed") noteError(turnID, nodeID)

      return
    }

    const nodeID = toolNodeID(tool.id)
    const { input, metadata, error, output } = toolFacts(tool)
    addNode({
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
    })
    partOf(nodeID, turnID)
    sequence(turnID, nodeID)
    cluster(turnID, nodeID, phaseCategoryForTool(tool.name))

    if (SHELL_TOOLS.has(tool.name)) {
      const resultID = resultNodeID(tool.id)
      addNode({
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
      })
      partOf(resultID, turnID)
      addEdge({ kind: "produces", source: nodeID, target: resultID, confidence: "explicit" })
      sequence(turnID, resultID)
      cluster(turnID, resultID, "verify")

      if (status === "failed") noteError(turnID, resultID)
    } else if (status === "failed") {
      noteError(turnID, nodeID)
    }

    if (error) {
      const errorID = errorNodeID(message.id, tool.id)
      addNode({
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
      })
      partOf(errorID, turnID)
      addEdge({ kind: "produces", source: nodeID, target: errorID, confidence: "explicit" })
      sequence(turnID, errorID)
      noteError(turnID, errorID)
    }

    recordProvenance(tool, nodeID, turnID)
  }

  function appendIdle(message: Extract<SessionMessageInfo, { type: "idle" }>, turnID: string) {
    if (message.outcome === "failed" && message.error) {
      const nodeID = errorNodeID(message.id, "idle")
      addNode({
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
      })
      partOf(nodeID, turnID)
      sequence(turnID, nodeID)
      noteError(turnID, nodeID)
    } else if (message.outcome === "interrupted") {
      const nodeID = errorNodeID(message.id, "idle")
      addNode({
        id: nodeID,
        kind: "error",
        label: "Interrupted",
        status: "interrupted",
        turnID,
        messageID: message.id,
        time: message.time.created,
        minLevel: "execution",
      })
      partOf(nodeID, turnID)
      sequence(turnID, nodeID)
    }

    const files = turnFiles.get(turnID)

    if (!files || files.size === 0) return
    const nodeID = diffNodeID(message.id)
    addNode({
      id: nodeID,
      kind: "diff",
      label: `${files.size} file${files.size === 1 ? "" : "s"} changed`,
      status: "neutral",
      turnID,
      messageID: message.id,
      time: message.time.created,
      minLevel: "execution",
      data: { files: [...files].sort() },
    })
    partOf(nodeID, turnID)
    sequence(turnID, nodeID)

    for (const file of [...files].sort())
      addEdge({ kind: "produces", source: nodeID, target: requireFile(file), confidence: "explicit" })
  }

  function appendCompaction(message: Extract<SessionMessageInfo, { type: "compaction" }>, turnID: string) {
    const nodeID = messageNodeID(message.id)
    addNode({
      id: nodeID,
      kind: "compaction",
      label: message.status === "completed" ? "Compacted context" : `Compaction ${message.status}`,
      summary: message.status === "completed" ? truncate(message.summary, 200) : undefined,
      status: compactionStatus(message),
      turnID,
      messageID: message.id,
      time: message.time.created,
      minLevel: "execution",
      data: { reason: message.reason },
    })
    partOf(nodeID, turnID)
    sequence(turnID, nodeID)
    const previous = turns.at(-2)

    if (previous) addEdge({ kind: "compacts", source: nodeID, target: previous, confidence: "explicit" })
  }

  function appendNotice(message: GraphNotice, turnID: string) {
    const nodeID = messageNodeID(message.id)
    const metadata = message.metadata ?? {}
    const childID = stringField(metadata, "childID") ?? stringField(metadata, "sessionID")
    const label = noticeLabel(message)
    const summary = noticeSummary(message)

    addNode({
      id: nodeID,
      kind: "notice",
      label,
      summary,
      status: "neutral",
      turnID,
      messageID: message.id,
      time: message.time.created,
      minLevel: "detail",
      data: { type: message.type, source: stringField(metadata, "source") ?? null },
    })
    partOf(nodeID, turnID)
    sequence(turnID, nodeID)

    if (childID) addEdge({ kind: "delegates", source: nodeID, target: subagentNodeID(childID), confidence: "explicit" })
  }

  // A leading assistant turn has no user message; give the session goal from its text when absent.
  if (!goal) {
    const opener = messages.find((message) => message.type === "assistant")
    const textPart = opener?.content.find((part) => part.type === "text")

    if (textPart?.type === "text") nodes[0].summary = truncate(textPart.text)
  }

  const activeOwner = activeMessageID ? ownerOf(activeMessageID) : undefined
  const activeTurn = activeOwner ? turnNodeID(activeOwner) : undefined

  if (activeTurn && nodeIDs.has(activeTurn)) {
    const node = nodes.find((candidate) => candidate.id === activeTurn)!
    node.data = { ...node.data, active: status.type !== "idle" }
  }

  return {
    root: SESSION_NODE_ID,
    goal,
    nodes,
    edges,
    turns,
    turnByMessageID,
    activeTurn,
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
  return (
    message.type !== "user" &&
    message.type !== "assistant" &&
    message.type !== "shell" &&
    message.type !== "idle" &&
    message.type !== "compaction" &&
    message.type !== "agent-switched" &&
    message.type !== "model-switched" &&
    message.type !== "location-switched"
  )
}

export function buildGraph(messages: SessionMessageInfo[], status: SessionStatus): GraphModel {
  return buildGraphInternal(messages, status)
}
