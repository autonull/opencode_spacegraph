import type { DepthMode } from "@spacegraphjs/renderer"
import type { GraphEdge, GraphNode, Lane, NodeKind, Representation, ZoomLevel } from "@opencode/session-ui/graph"

/**
 * The session graph's vocabulary as i18n keys. The inspector, the toolbar, and the legend all read
 * the same names, so a kind is called the same thing wherever it appears.
 */

export const LEVEL_KEY = {
  overview: "ui.sessionGraph.level.overview",
  execution: "ui.sessionGraph.level.execution",
  detail: "ui.sessionGraph.level.detail",
} as const satisfies Record<ZoomLevel, string>

export const REPRESENTATION_KEY = {
  graph: "ui.sessionGraph.representation.graph",
  ribbon: "ui.sessionGraph.representation.ribbon",
  matrix: "ui.sessionGraph.representation.matrix",
} as const satisfies Record<Representation, string>

export const DEPTH_KEY = {
  flat: "ui.sessionGraph.depth.flat",
  layered: "ui.sessionGraph.depth.layered",
  "depth-stack": "ui.sessionGraph.depth.depthStack",
  orbit: "ui.sessionGraph.depth.orbit",
} as const satisfies Record<DepthMode, string>

/** LE.10 lane gutter copy, in layout order. */
export const LANE_KEY = {
  phases: "ui.sessionGraph.lane.phases",
  prompt: "ui.sessionGraph.lane.prompt",
  narrative: "ui.sessionGraph.lane.narrative",
  explore: "ui.sessionGraph.lane.explore",
  edit: "ui.sessionGraph.lane.edit",
  verify: "ui.sessionGraph.lane.verify",
  delegate: "ui.sessionGraph.lane.delegate",
  artifacts: "ui.sessionGraph.lane.artifacts",
} as const satisfies Record<Lane, string>

export const KIND_KEY = {
  session: "ui.sessionGraph.kind.session",
  turn: "ui.sessionGraph.kind.turn",
  phase: "ui.sessionGraph.kind.phase",
  message: "ui.sessionGraph.kind.message",
  reasoning: "ui.sessionGraph.kind.reasoning",
  tool: "ui.sessionGraph.kind.tool",
  file: "ui.sessionGraph.kind.file",
  subagent: "ui.sessionGraph.kind.subagent",
  result: "ui.sessionGraph.kind.result",
  error: "ui.sessionGraph.kind.error",
  retry: "ui.sessionGraph.kind.retry",
  compaction: "ui.sessionGraph.kind.compaction",
  notice: "ui.sessionGraph.kind.notice",
  diff: "ui.sessionGraph.kind.diff",
  approval: "ui.sessionGraph.kind.approval",
} as const satisfies Record<NodeKind, string>

export const STATUS_KEY = {
  pending: "ui.sessionGraph.status.pending",
  running: "ui.sessionGraph.status.running",
  success: "ui.sessionGraph.status.success",
  failed: "ui.sessionGraph.status.failed",
  interrupted: "ui.sessionGraph.status.interrupted",
  neutral: "ui.sessionGraph.status.neutral",
} as const satisfies Record<GraphNode["status"], string>

export const CONFIDENCE_KEY = {
  explicit: "ui.sessionGraph.confidence.explicit",
  structural: "ui.sessionGraph.confidence.structural",
  inferred: "ui.sessionGraph.confidence.inferred",
} as const satisfies Record<GraphEdge["confidence"], string>
