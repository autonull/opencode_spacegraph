/**
 * The session graph's vocabulary: the semantic levels a reader zooms through, the kinds a node can
 * have, the statuses it can carry, and the phase categories its activity clusters into.
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
  "subagent",
  "result",
  "error",
  "retry",
  "compaction",
  "notice",
  "diff",
] as const

export type NodeKind = (typeof NODE_KINDS)[number]

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
 * What the map is: the node-link graph, or one of the two summary representations. The summaries
 * are overview-first, so the semantic level control drives the graph only.
 */
export const REPRESENTATIONS = ["graph", "ribbon", "matrix"] as const

export type Representation = (typeof REPRESENTATIONS)[number]

/** Where a selected node's detail is shown. The modes are alternatives, not stages. */
export const DETAIL_MODES = ["off", "card", "popover", "panel"] as const

export type DetailMode = (typeof DETAIL_MODES)[number]
