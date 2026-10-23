import type { JsonValue, WorkspaceSnapshot } from "@opencode/client/promise"
import { Option, Schema } from "effect"
import type { Domain, NodeKind, NodeStatus, PhaseCategory, ZoomLevel } from "./vocabulary"
import {
  EDIT_TOOLS,
  PHASE_CATEGORIES,
  READ_TOOLS,
  SHELL_TOOLS,
  SUBAGENT_TOOLS,
} from "./vocabulary"

export type { NodeKind, NodeStatus, PhaseCategory, ZoomLevel }

/** A source range in a file. */
export type Range = {
  start: { line: number; character: number }
  end: { line: number; character: number }
}

export type Confidence = "explicit" | "structural" | "inferred"

/** T30.1 — what a derived fact came from. The snapshot's own source vocabulary. */
export type SnapshotSource = WorkspaceSnapshot["missing"][number]["source"]

/** T30.3 — every derived node and edge can be attributed and dated. */
export type Provenance = {
  source: SnapshotSource
  asOf?: number
  confidence: Confidence
}

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
  /** T30.1 — set only when the node's kind does not decide its domain. */
  domain?: Domain
  /** T30.3 — the source and age of a derived fact. */
  provenance?: Provenance
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

/**
 * T29.3 — the snapshot facts the model carries for the inspector and the legend. The snapshot
 * itself never rides on the model: only the revision, the per-source stamps and what is absent.
 */
export type GraphSnapshotMeta = {
  revision: string
  asOf: WorkspaceSnapshot["asOf"]
  missing: WorkspaceSnapshot["missing"]
}

export type GraphModel = {
  root: string
  /** T29.3 — the workspace root when a snapshot is present; `root` stays the literal session id. */
  workspaceRoot?: string
  /** T29.4 — how old the derived facts are and which sources are absent. */
  snapshot?: GraphSnapshotMeta
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

/**
 * T6.5 — where a session came from.
 *
 * A fork names the session it branched off and the message it branched at; a child session names its
 * parent. The graph records that attribution on the root node and never draws an edge into the
 * other session: a cross-session edge would be a claim about work this session did not do, and the
 * plan's invariant is that the graph never infers causality from adjacency.
 */
export type SessionLineage = {
  forkedFrom?: {
    sessionID: string
    boundary?: { type: "before" | "through"; messageID: string }
  }
  /** The parent session, when this session is a child of another (a subagent's own session). */
  parentSessionID?: string
}

export const SESSION_NODE_ID = "session"

export const turnNodeID = (openerID: string) => `turn:${openerID}`

export const messageNodeID = (messageID: string) => `msg:${messageID}`

export const toolNodeID = (toolID: string) => `tool:${toolID}`

export const fileNodeID = (path: string) => `file:${normalizePath(path)}`

export const directoryNodeID = (path: string) => `dir:${normalizePath(path)}`

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

const decodePhaseCategory = Schema.decodeUnknownOption(Schema.Literals(PHASE_CATEGORIES))

/** Reads a string out of a node's `data`, which is untyped JSON. */
export const decodeString = Schema.decodeUnknownOption(Schema.String)

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
