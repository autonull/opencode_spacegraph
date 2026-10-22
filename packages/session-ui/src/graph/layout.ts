import { Strategies, type LayoutConfig, type Position } from "spacegraphjs/layout"
import type { GraphEdge, GraphModel, GraphNode, NodeKind, ZoomLevel } from "./model"
import { phaseCategoryOf } from "./model"
import { isVisibleAt } from "./levels"
import { nodeIndex, parentIndex } from "./lookup"
import { CARD_SIZE, COMPACT_SIZE, STRUCTURAL_KINDS, type LayoutStrategy } from "./vocabulary"

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
export type { LayoutStrategy } from "./vocabulary"

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
  /** Tree: leaves a block holds before it folds to the next row. */
  treeColumns?: number
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
  /**
   * T7: the positions the previous layout assigned. The tree re-centres a parent and the force
   * simulation relaxes, so both read the positions they already gave and only place the boxes they
   * have not seen — a streamed session never moves a node the reader is looking at.
   */
  previous?: ReadonlyMap<string, Position>
  /**
   * T15: the card's box. The layout's cell cursor reads it, so a size rule reaches the geometry —
   * and it costs a re-layout, which is why a size rule is a deliberate act and not a background
   * process.
   */
  nodeSizeFn?: (node: GraphNode) => readonly [number, number]
}

/** The box a node occupies in layout space, chosen from the shape the renderer will draw. */
export function nodeSize(node: GraphNode): readonly [number, number] {
  return STRUCTURAL_KINDS.has(node.kind) ? COMPACT_SIZE : CARD_SIZE
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
  // T7: the tree hangs a node under the parent it belongs to, and the force layout pulls a node
  // towards the structure around it. Both are the session's vocabulary, not the library's. A file
  // belongs to the turn that wrote it, so it hangs there too.
  parentOfFn: (model, node) =>
    parentIndex(model).get(node.id) ?? (node.kind === "file" ? fileOwners(model).get(node.id) : undefined),
  forceLinksFn: (model, node) => neighbours(model, node.id),
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
  const config = options.nodeSizeFn ? { ...LAYOUT, nodeSizeFn: options.nodeSizeFn } : LAYOUT
  return Strategies.layoutGraph(model, config, {
    strategy: options.strategy,
    gap: options.gap,
    laneGap: options.laneGap,
    turnGap: options.turnGap,
    depthStep: options.depthStep,
    columns: options.columns,
    treeColumns: options.treeColumns,
    rowGap: options.rowGap,
    rows: options.rows,
    previous: options.previous,
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

  const nodes = nodeIndex(model)
  const owners = new Map<string, string>()

  const claim = (node: string, turn: string | undefined) => {
    if (turn === undefined || owners.has(node)) return
    owners.set(node, turn)
  }

  // A write names the turn that produced the file, so it outranks the file's other incident edges.
  for (const edge of model.edges) {
    if (edge.kind !== "writes") continue
    claim(edge.target, nodes.get(edge.source)?.turnID)
  }

  for (const edge of model.edges) {
    claim(edge.target, nodes.get(edge.source)?.turnID)
    claim(edge.source, nodes.get(edge.target)?.turnID)
  }

  FILE_OWNERS.set(model, owners)

  return owners
}

/**
 * The nodes the force layout pulls a node towards: the structure around it — what it belongs to and
 * what came before it. A link is a claim about the session's shape, not about cause, so the
 * inferred edges stay out of it.
 */
const NEIGHBOURS = new WeakMap<object, ReadonlyMap<string, readonly string[]>>()

function neighbours(model: { nodes: readonly GraphNode[]; edges: readonly GraphEdge[] }, id: string) {
  const cached = NEIGHBOURS.get(model)

  if (cached) return cached.get(id) ?? []

  const links = new Map<string, string[]>()

  const link = (from: string, to: string) => {
    const existing = links.get(from)

    if (existing) existing.push(to)
    else links.set(from, [to])
  }

  for (const edge of model.edges) {
    if (edge.kind !== "part-of" && edge.kind !== "sequence") continue
    link(edge.source, edge.target)
    link(edge.target, edge.source)
  }

  NEIGHBOURS.set(model, links)

  return links.get(id) ?? []
}
