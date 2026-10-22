import type { DepthMode } from "@spacegraphjs/renderer"
import type {
  DetailMode,
  GraphArrangement,
  GraphEdge,
  GraphNode,
  GraphSide,
  Lane,
  Layout,
  NodeKind,
  ZoomLevel,
} from "@opencode/session-ui/graph"

/**
 * The session graph's vocabulary as i18n keys. The inspector, the toolbar, the legend, and the
 * gallery all read the same names, so a kind is called the same thing wherever it appears.
 */

export const LEVEL_KEY = {
  overview: "ui.sessionGraph.level.overview",
  execution: "ui.sessionGraph.level.execution",
  detail: "ui.sessionGraph.level.detail",
} as const satisfies Record<ZoomLevel, string>

/**
 * T17.1 — the layout axis. One name for every way the map can be drawn, so the reader meets one
 * list and one control instead of a family beside a strategy.
 */
export const LAYOUT_KEY = {
  lanes: "ui.sessionGraph.layout.lanes",
  timeline: "ui.sessionGraph.layout.timeline",
  hierarchy: "ui.sessionGraph.layout.hierarchy",
  tree: "ui.sessionGraph.layout.tree",
  force: "ui.sessionGraph.layout.force",
  ribbon: "ui.sessionGraph.layout.ribbon",
  matrix: "ui.sessionGraph.layout.matrix",
  log: "ui.sessionGraph.layout.log",
} as const satisfies Record<Layout, string>

/** What each layout encodes, in one sentence. The legend says it for the layout on screen. */
export const LAYOUT_HINT_KEY = {
  lanes: "ui.sessionGraph.layoutHint.lanes",
  timeline: "ui.sessionGraph.layoutHint.timeline",
  hierarchy: "ui.sessionGraph.layoutHint.hierarchy",
  tree: "ui.sessionGraph.layoutHint.tree",
  force: "ui.sessionGraph.layoutHint.force",
  ribbon: "ui.sessionGraph.layoutHint.ribbon",
  matrix: "ui.sessionGraph.layoutHint.matrix",
  log: "ui.sessionGraph.layoutHint.log",
} as const satisfies Record<Layout, string>

export const DEPTH_KEY = {
  flat: "ui.sessionGraph.depth.flat",
  layered: "ui.sessionGraph.depth.layered",
  "depth-stack": "ui.sessionGraph.depth.depthStack",
  orbit: "ui.sessionGraph.depth.orbit",
} as const satisfies Record<DepthMode, string>

/** Where a selected node's detail is shown. The toolbar names the chosen surface. */
export const DETAIL_MODE_KEY = {
  off: "ui.sessionGraph.detailMode.off",
  card: "ui.sessionGraph.detailMode.card",
  popover: "ui.sessionGraph.detailMode.popover",
  panel: "ui.sessionGraph.detailMode.panel",
} as const satisfies Record<DetailMode, string>

/** How the map and the log meet in the hybrid. The host owns the geometry; the toolbar names it. */
export const ARRANGEMENT_KEY = {
  stacked: "ui.sessionGraph.arrangement.stacked",
  side: "ui.sessionGraph.arrangement.side",
  floating: "ui.sessionGraph.arrangement.floating",
} as const satisfies Record<GraphArrangement, string>

/** Which side of the split the map takes. */
export const SIDE_KEY = {
  start: "ui.sessionGraph.arrangement.side.start",
  end: "ui.sessionGraph.arrangement.side.end",
} as const satisfies Record<GraphSide, string>

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
