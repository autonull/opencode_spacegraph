import { Strategies, type LayoutConfig, type Position } from "spacegraphjs/layout"
import type { GraphEdge, GraphModel, GraphNode, NodeKind, ZoomLevel } from "./model"
import { phaseCategoryOf } from "./model"
import { isVisibleAt } from "./levels"

export type { Position }

/**
 * Deterministic, append-only layout (§5.5): no physics, no re-layout on mutation. Positions depend
 * only on model order, so appending a turn or a part leaves earlier coordinates unchanged.
 *
 * The geometry is card-aware (RF.1): nodes render as ~220×72 activity cards, so a lane advances by
 * each node's width plus a gap rather than a fixed 48px step. Turn columns are sized from their own
 * content, so no two cards overlap at any zoom level.
 *
 * The strategies live in SpaceGraphJS; this module is the session's vocabulary for them.
 */
export type LayoutStrategy = "lanes" | "timeline" | "hierarchy"

export const LAYOUT_STRATEGIES: LayoutStrategy[] = ["lanes", "timeline", "hierarchy"]

export type LayoutOptions = {
  strategy?: LayoutStrategy
  /** Horizontal distance between adjacent nodes in a lane. */
  gap?: number
  /** Vertical distance between lanes (added to the tallest card in the lane). */
  laneGap?: number
  /** Horizontal distance between turn columns. */
  turnGap?: number
  /** Z distance between hierarchy depths. */
  depthStep?: number
  /** Timeline: cards per wrapped row before a turn's block folds to the next row. */
  columns?: number
  /** Timeline/hierarchy: vertical distance between rows. */
  rowGap?: number
  /** Hierarchy: rows per column before the outline wraps into the next column. */
  rows?: number
  /**
   * Semantic level the layout is sized for. Only `overview` changes the geometry: columns are sized
   * from the nodes overview draws instead of reserving execution card widths for hidden work.
   * Stability is per level; switching levels may move a node, but streaming never moves an existing
   * node within the same level. `undefined` means every node participates (execution/detail).
   */
  level?: ZoomLevel
}

/** Rendered card footprint; keep in sync with the SpaceGraph adapter's HTML card defaults. */
export const CARD_SIZE: readonly [number, number] = [220, 72]

/** Compact footprint for structural chips (session, turn, phase, error, retry, approval). */
export const COMPACT_SIZE: readonly [number, number] = [132, 44]

const COMPACT_KINDS = new Set<NodeKind>(["session", "turn", "phase", "error", "retry", "approval"])

/** The box a node occupies in layout space, chosen from the shape the renderer will draw. */
export function nodeSize(node: GraphNode): readonly [number, number] {
  return COMPACT_KINDS.has(node.kind) ? COMPACT_SIZE : CARD_SIZE
}

export const LANES = [
  "phases",
  "prompt",
  "narrative",
  "explore",
  "edit",
  "verify",
  "delegate",
  "artifacts",
] as const

export type Lane = (typeof LANES)[number]

export type ClusterBounds = { min: Position; max: Position }

export type GraphLayout = {
  positions: ReadonlyMap<string, Position>
  clusters: Map<string, ClusterBounds>
  bounds: ClusterBounds
  strategy: LayoutStrategy
}

const DEPTH: Record<NodeKind, number> = {
  session: 0,
  turn: 1,
  phase: 1,
  message: 2,
  reasoning: 2,
  tool: 2,
  subagent: 2,
  notice: 2,
  compaction: 2,
  approval: 2,
  file: 3,
  result: 3,
  diff: 3,
  error: 3,
  retry: 3,
}

/**
 * The session's layout vocabulary: the lane a node belongs to, the depth of a kind, the turn a node
 * belongs to, and the turn that owns a file. The library owns the geometry.
 */
const LAYOUT: LayoutConfig<GraphNode, GraphEdge, Lane> = {
  nodeSizeFn: nodeSize,
  laneList: LANES,
  laneOfFn: laneOf,
  depthMap: DEPTH,
  turnIdFn: (node) => node.turnID,
  ownerTurnFn: (model, node) => (node.kind === "file" ? fileOwners(model).get(node.id) : undefined),
  clusterOfFn: (node) => (node.kind === "phase" ? node.clusterOf : undefined),
  geometry: {
    standardSize: CARD_SIZE,
    // Indent step must be large enough to read at fit; 120px gives a clear visual hierarchy.
    indentStep: 120,
    // The depth levels the hierarchy outline budgets for (session, turn, work, artifact).
    depthLevels: 4,
    // The extra room around a turn column.
    padding: 48,
  },
}

/** The vertical centre of each lane (LE.10), for a lane-label overlay aligned to the lanes layout. */
export function laneAnchors(options: LayoutOptions = {}): { name: Lane; y: number }[] {
  return Strategies.laneAnchors(LAYOUT, { laneGap: options.laneGap })
}

export function layoutGraph(model: GraphModel, options: LayoutOptions = {}): GraphLayout {
  return Strategies.layoutGraph(model, LAYOUT, {
    strategy: options.strategy,
    gap: options.gap,
    laneGap: options.laneGap,
    turnGap: options.turnGap,
    depthStep: options.depthStep,
    columns: options.columns,
    rowGap: options.rowGap,
    rows: options.rows,
    // T1.2: at overview only the nodes overview draws consume column width. Hidden execution cards
    // would otherwise leave wide empty gutters between the compact overview chips.
    include: options.level === "overview" ? (node) => isVisibleAt(node, "overview") : undefined,
    minColumnWidth: options.level === "overview" ? COMPACT_SIZE[0] : undefined,
  })
}

function laneOf(node: GraphNode): Lane {
  if (node.kind === "session" || node.kind === "turn") return "prompt"

  if (node.kind === "phase") return "phases"

  if (node.kind === "file" || node.kind === "diff") return "artifacts"

  if (node.kind === "message") {
    const role = node.data?.role

    if (role === "user") return "prompt"

    if (role === "shell") return "verify"

    return "narrative"
  }

  if (node.kind === "result") return "verify"

  if (node.kind === "reasoning" || node.kind === "notice" || node.kind === "compaction") return "narrative"

  if (node.kind === "error" || node.kind === "retry") return "narrative"

  const category = phaseCategoryOf(node)

  if (category === "explore" || category === "edit" || category === "verify" || category === "delegate")
    return category

  return "artifacts"
}

/**
 * The turn that owns each file: the turn of the other endpoint of its first incident edge. The
 * answer is the same for every call on the same model, so it is built once per model — asking each
 * file for its owner one edge at a time was quadratic in the size of the session (T6.6).
 */
const FILE_OWNERS = new WeakMap<object, ReadonlyMap<string, string>>()

function fileOwners(model: { nodes: readonly GraphNode[]; edges: readonly GraphEdge[] }) {
  const cached = FILE_OWNERS.get(model)

  if (cached) return cached

  const turnByNode = new Map(model.nodes.map((node) => [node.id, node.turnID]))
  const owners = new Map<string, string>()

  const claim = (node: string, turn: string | undefined) => {
    if (turn === undefined || owners.has(node)) return
    owners.set(node, turn)
  }

  // A write names the turn that produced the file, so it outranks the file's other incident edges.
  for (const edge of model.edges) {
    if (edge.kind !== "writes") continue
    claim(edge.target, turnByNode.get(edge.source))
  }

  for (const edge of model.edges) {
    claim(edge.target, turnByNode.get(edge.source))
    claim(edge.source, turnByNode.get(edge.target))
  }

  FILE_OWNERS.set(model, owners)

  return owners
}
