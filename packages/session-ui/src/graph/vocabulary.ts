import type { GraphNode } from "./model"
import type { Lane } from "./layout"
import type { GraphEdge } from "./model"

/**
 * The session graph's vocabulary: the semantic levels a reader zooms through, the kinds a node can
 * have, the statuses it can carry, the phase categories its activity clusters into, and the box a
 * node occupies on the map.
 *
 * One table, so the model, the layout, the adapter and the host cannot drift apart: a kind is
 * called the same thing wherever it appears, and a new kind is added in one place.
 */

/** The depth projection modes (from spacegraphjs). */
export type DepthMode = "flat" | "layered" | "depth-stack" | "orbit"

/**
 * i18n keys for the vocabulary. These map vocabulary types to translation keys, providing a single
 * source of truth for all user-visible labels across the graph UI.
 */
export const VOCABULARY_KEYS = {
  /** The semantic zoom levels (§4.3), from the overview to the full detail. */
  level: {
    overview: "ui.sessionGraph.level.overview",
    execution: "ui.sessionGraph.level.execution",
    detail: "ui.sessionGraph.level.detail",
  } as const satisfies Record<ZoomLevel, string>,

  /** T17.1 — the layout axis. One name for every way the map can be drawn. */
  layout: {
    lanes: "ui.sessionGraph.layout.lanes",
    timeline: "ui.sessionGraph.layout.timeline",
    hierarchy: "ui.sessionGraph.layout.hierarchy",
    tree: "ui.sessionGraph.layout.tree",
    force: "ui.sessionGraph.layout.force",
    ribbon: "ui.sessionGraph.layout.ribbon",
    matrix: "ui.sessionGraph.layout.matrix",
    log: "ui.sessionGraph.layout.log",
  } as const satisfies Record<Layout, string>,

  /** What each layout encodes, in one sentence. The legend says it for the layout on screen. */
  layoutHint: {
    lanes: "ui.sessionGraph.layoutHint.lanes",
    timeline: "ui.sessionGraph.layoutHint.timeline",
    hierarchy: "ui.sessionGraph.layoutHint.hierarchy",
    tree: "ui.sessionGraph.layoutHint.tree",
    force: "ui.sessionGraph.layoutHint.force",
    ribbon: "ui.sessionGraph.layoutHint.ribbon",
    matrix: "ui.sessionGraph.layoutHint.matrix",
    log: "ui.sessionGraph.layoutHint.log",
  } as const satisfies Record<Layout, string>,

  /** The projection spectrum: flat through orbit. */
  depth: {
    flat: "ui.sessionGraph.depth.flat",
    layered: "ui.sessionGraph.depth.layered",
    "depth-stack": "ui.sessionGraph.depth.depthStack",
    orbit: "ui.sessionGraph.depth.orbit",
  } as const satisfies Record<DepthMode, string>,

  /** Where a selected node's detail is shown. The toolbar names the chosen surface. */
  detailMode: {
    off: "ui.sessionGraph.detailMode.off",
    panel: "ui.sessionGraph.detailMode.panel",
    popover: "ui.sessionGraph.detailMode.popover",
    window: "ui.sessionGraph.detailMode.window",
    auto: "ui.sessionGraph.detailMode.auto",
  } as const satisfies Record<DetailMode, string>,

  /** How the map and the log meet in the hybrid. The host owns the geometry; the toolbar names it. */
  arrangement: {
    stacked: "ui.sessionGraph.arrangement.stacked",
    side: "ui.sessionGraph.arrangement.side",
    floating: "ui.sessionGraph.arrangement.floating",
  } as const satisfies Record<GraphArrangement, string>,

  /** Which side of the split the map takes. */
  side: {
    start: "ui.sessionGraph.arrangement.side.start",
    end: "ui.sessionGraph.arrangement.side.end",
  } as const satisfies Record<GraphSide, string>,

  /** LE.10 lane gutter copy, in layout order. */
  lane: {
    phases: "ui.sessionGraph.lane.phases",
    prompt: "ui.sessionGraph.lane.prompt",
    narrative: "ui.sessionGraph.lane.narrative",
    explore: "ui.sessionGraph.lane.explore",
    edit: "ui.sessionGraph.lane.edit",
    verify: "ui.sessionGraph.lane.verify",
    delegate: "ui.sessionGraph.lane.delegate",
    artifacts: "ui.sessionGraph.lane.artifacts",
  } as const satisfies Record<Lane, string>,

  /** The kinds a node can have. */
  kind: {
    session: "ui.sessionGraph.kind.session",
    turn: "ui.sessionGraph.kind.turn",
    phase: "ui.sessionGraph.kind.phase",
    message: "ui.sessionGraph.kind.message",
    reasoning: "ui.sessionGraph.kind.reasoning",
    tool: "ui.sessionGraph.kind.tool",
    file: "ui.sessionGraph.kind.file",
    directory: "ui.sessionGraph.kind.directory",
    subagent: "ui.sessionGraph.kind.subagent",
    result: "ui.sessionGraph.kind.result",
    error: "ui.sessionGraph.kind.error",
    retry: "ui.sessionGraph.kind.retry",
    compaction: "ui.sessionGraph.kind.compaction",
    notice: "ui.sessionGraph.kind.notice",
    diff: "ui.sessionGraph.kind.diff",
    // T19-T26 derived kinds
    package: "ui.sessionGraph.kind.package",
    commit: "ui.sessionGraph.kind.commit",
    branch: "ui.sessionGraph.kind.branch",
    symbol: "ui.sessionGraph.kind.symbol",
    test: "ui.sessionGraph.kind.test",
    "test-run": "ui.sessionGraph.kind.testRun",
    process: "ui.sessionGraph.kind.process",
    port: "ui.sessionGraph.kind.port",
    issue: "ui.sessionGraph.kind.issue",
    note: "ui.sessionGraph.kind.note",
  } as const satisfies Record<NodeKind, string>,

  /** The outcomes a node can carry. */
  status: {
    pending: "ui.sessionGraph.status.pending",
    running: "ui.sessionGraph.status.running",
    success: "ui.sessionGraph.status.success",
    failed: "ui.sessionGraph.status.failed",
    interrupted: "ui.sessionGraph.status.interrupted",
    neutral: "ui.sessionGraph.status.neutral",
  } as const satisfies Record<NodeStatus, string>,

  /** The semantic relationships between nodes. */
  edge: {
    "part-of": "ui.sessionGraph.edge.partOf",
    sequence: "ui.sessionGraph.edge.sequence",
    delegates: "ui.sessionGraph.edge.delegates",
    reads: "ui.sessionGraph.edge.reads",
    writes: "ui.sessionGraph.edge.writes",
    searches: "ui.sessionGraph.edge.searches",
    produces: "ui.sessionGraph.edge.produces",
    references: "ui.sessionGraph.edge.references",
    compacts: "ui.sessionGraph.edge.compacts",
    evidence: "ui.sessionGraph.edge.evidence",
    "inferred-cause": "ui.sessionGraph.edge.inferredCause",
    touches: "ui.sessionGraph.edge.touches",
    "points-at": "ui.sessionGraph.edge.pointsAt",
    addresses: "ui.sessionGraph.edge.addresses",
    "listens-on": "ui.sessionGraph.edge.listensOn",
    calls: "ui.sessionGraph.edge.calls",
    covers: "ui.sessionGraph.edge.covers",
    executes: "ui.sessionGraph.edge.executes",
    annotates: "ui.sessionGraph.edge.annotates",
  } as const satisfies Record<GraphEdge["kind"], string>,

  /** Edge confidence levels. */
  confidence: {
    explicit: "ui.sessionGraph.confidence.explicit",
    structural: "ui.sessionGraph.confidence.structural",
    inferred: "ui.sessionGraph.confidence.inferred",
  } as const satisfies Record<GraphEdge["confidence"], string>,

  /** T27.1 — the domain checkboxes in the Domains menu. */
  domain: {
    session: "ui.sessionGraph.domain.session",
    directories: "ui.sessionGraph.domain.directories",
    history: "ui.sessionGraph.domain.history",
    code: "ui.sessionGraph.domain.code",
    verification: "ui.sessionGraph.domain.verification",
    runtime: "ui.sessionGraph.domain.runtime",
    work: "ui.sessionGraph.domain.work",
  } as const satisfies Record<Domain, string>,
} as const

/** The semantic zoom levels (§4.3), from the overview to the full detail. */
export const ZOOM_LEVELS = ["overview", "execution", "detail"] as const

export type ZoomLevel = (typeof ZOOM_LEVELS)[number]

/** The kinds a node can have (§4.1). */
export const NODE_KINDS = [
  "session",
  "turn",
  "phase",
  "message",
  "reasoning",
  "tool",
  "file",
  "directory",
  "subagent",
  "result",
  "error",
  "retry",
  "compaction",
  "notice",
  "diff",
  // T19-T26 derived kinds (added by foundation tasks)
  "package",
  "commit",
  "branch",
  "symbol",
  "test",
  "test-run",
  "process",
  "port",
  "issue",
  // C1 — reader-authored note (a node like any other).
  "note",
] as const

export type NodeKind = (typeof NODE_KINDS)[number]

/**
 * T30.1 — the domains a reader can put in the lens. They qualify what a node is about; they are not
 * an axis in every signature. `directories` owns the project's skeleton, while a touched file stays
 * in `session`.
 */
export const DOMAINS = ["session", "directories", "history", "code", "verification", "runtime", "work"] as const

export type Domain = (typeof DOMAINS)[number]

/** The domain of every kind. Exhaustive by type: a new kind without a domain does not compile. */
export const DOMAIN_OF_KIND: Record<NodeKind, Domain> = {
  session: "session",
  turn: "session",
  phase: "session",
  message: "session",
  reasoning: "session",
  tool: "session",
  file: "session",
  directory: "directories",
  subagent: "session",
  result: "session",
  error: "session",
  retry: "session",
  compaction: "session",
  notice: "session",
  diff: "session",
  // T19-T26 derived kinds
  package: "directories",
  commit: "history",
  branch: "history",
  symbol: "code",
  test: "verification",
  "test-run": "verification",
  process: "runtime",
  port: "runtime",
  issue: "work",
  note: "session",
}

/** The outcomes a node can carry. */
export const NODE_STATUSES = ["pending", "running", "success", "failed", "interrupted", "neutral"] as const

export type NodeStatus = (typeof NODE_STATUSES)[number]

/** Semantic phases (§5.1): runs of consecutive tool activity of one kind. */
export const PHASE_CATEGORIES = ["explore", "edit", "verify", "delegate", "result"] as const

export type PhaseCategory = (typeof PHASE_CATEGORIES)[number]

/** The name a phase cluster carries in the model. */
export const PHASE_LABELS: Record<PhaseCategory, string> = {
  explore: "Explore",
  edit: "Edit",
  verify: "Verify",
  delegate: "Delegate",
  result: "Result",
}

/**
 * Structural kinds are chrome, not activity: a session, a turn, a phase, a failure and a retry
 * read as compact chips. They draw as panels, they take the compact footprint, and they never
 * consume the activity card budget.
 */
export const STRUCTURAL_KINDS: ReadonlySet<NodeKind> = new Set(["session", "turn", "phase", "error", "retry"])

/** The tools that delegate work to another agent. */
export const SUBAGENT_TOOLS = new Set(["subagent", "task"])

/** The tools that run a command. */
export const SHELL_TOOLS = new Set(["shell", "execute", "bash"])

/** The tools that search the workspace. */
export const SEARCH_TOOLS = new Set(["glob", "grep", "list"])

/** The tools that change a file. */
export const EDIT_TOOLS = new Set(["edit", "write", "patch", "apply_patch"])

/** The tools that read a file. */
export const READ_TOOLS = new Set(["read", "glob", "grep", "list", "webfetch"])

/**
 * How the map is drawn. The layout strategies are the session's policy over the library's
 * geometries, so the vocabulary names them all in one place.
 */
export const LAYOUT_STRATEGIES = ["lanes", "timeline", "hierarchy", "tree", "force"] as const

export type LayoutStrategy = (typeof LAYOUT_STRATEGIES)[number]

/**
 * The layouts that pack the level's units into the session's own grammar: the turn ribbon and the
 * turn matrix. They are layouts like the others, not a different kind of thing.
 */
export const SUMMARY_LAYOUTS = ["ribbon", "matrix"] as const

export type SummaryLayout = (typeof SUMMARY_LAYOUTS)[number]

/**
 * T17.1 — one layout axis. The node-link strategies and the session's summary layouts answer the
 * same question — how are the nodes arranged — so they are one list, chosen the same way, and the
 * level means the same thing in each.
 */
export const LAYOUTS = [...LAYOUT_STRATEGIES, ...SUMMARY_LAYOUTS, "log"] as const

export type Layout = (typeof LAYOUTS)[number]

/** Whether a layout is a summary: the session's own grammar, not the library's node-link geometry. */
export function isSummaryLayout(layout: Layout): layout is SummaryLayout {
  return (SUMMARY_LAYOUTS as readonly Layout[]).includes(layout)
}

/** Whether a layout is the log layout: the session's reading order as a vertical spine. */
export function isLogLayout(layout: Layout): layout is "log" {
  return layout === "log"
}

/** Whether a layout is a summary or log layout (host-level geometry, not node-link). */
export function isSummaryOrLogLayout(layout: Layout): layout is SummaryLayout | "log" {
  return isSummaryLayout(layout) || isLogLayout(layout)
}

/** Where a selected node's detail is shown. The modes are alternatives, not stages. */
export const DETAIL_MODES = ["off", "panel", "popover", "window", "auto"] as const

export type DetailMode = (typeof DETAIL_MODES)[number]

/** Whether the camera frames the selected node (the "card" framing behavior). */
export type DetailFraming = "off" | "card"

/**
 * The retired transcript|map|both vocabulary. Only persisted state migration reads these values;
 * the UI composes independent surfaces and has no mode.
 */
export const GRAPH_MODES = ["transcript", "graph", "hybrid"] as const

/**
 * How the map and the log meet in the hybrid. The three arrangements are the same two surfaces
 * under different geometry: beside each other, one above the other, or the map floating over the
 * log. Every arrangement keeps the transcript mounted and scrollable — the choice is the reader's,
 * and none of them is the only one.
 */
export const GRAPH_ARRANGEMENTS = ["stacked", "side", "floating"] as const

export type GraphArrangement = (typeof GRAPH_ARRANGEMENTS)[number]

/** Which side of the split the map takes. The floating arrangement has no side. */
export const GRAPH_SIDES = ["start", "end"] as const

export type GraphSide = (typeof GRAPH_SIDES)[number]

/** The box an activity card occupies in layout space. Keep in sync with the adapter's card defaults. */
export const CARD_SIZE: readonly [number, number] = [220, 72]

/** The box a structural chip occupies (session, turn, phase, error, retry). */
export const COMPACT_SIZE: readonly [number, number] = [132, 44]

/** T30.1 — a node's domain, unless the snapshot placed it elsewhere (an untouched file). */
export function nodeDomain(node: GraphNode): Domain {
  return node.domain ?? DOMAIN_OF_KIND[node.kind]
}
