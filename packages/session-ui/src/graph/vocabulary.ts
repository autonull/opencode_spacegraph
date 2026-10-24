import type { GraphNode } from "./model"

/**
 * The session graph's vocabulary: the semantic levels a reader zooms through, the kinds a node can
 * have, the statuses it can carry, the phase categories its activity clusters into, and the box a
 * node occupies on the map.
 *
 * One table, so the model, the layout, the adapter and the host cannot drift apart: a kind is
 * called the same thing wherever it appears, and a new kind is added in one place.
 */

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
