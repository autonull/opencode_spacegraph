import type { GraphModel, GraphNode, NodeKind, ZoomLevel } from "./model"
import { phaseCategoryOf } from "./model"
import { nodesAtLevel } from "./levels"

/**
 * Deterministic, append-only layout (§5.5): no physics, no re-layout on mutation. Positions depend
 * only on model order, so appending a turn or a part leaves earlier coordinates unchanged.
 *
 * The geometry is card-aware (RF.1): nodes render as ~220×72 activity cards, so a lane advances by
 * each node's width plus a gap rather than a fixed 48px step. Turn columns are sized from their own
 * content, so no two cards overlap at any zoom level.
 */
export type Position = { x: number; y: number; z: number }

/** Named layout strategies (RF.2). `lanes` is the semantic default; the others are alternates. */
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

/** The vertical centre of each lane (LE.10), for a lane-label overlay aligned to the lanes layout. */
export function laneAnchors(options: LayoutOptions = {}): { name: Lane; y: number }[] {
  const laneGap = options.laneGap ?? 24
  const laneHeight = CARD_SIZE[1] + laneGap

  return LANES.map((name, index) => ({ name, y: index * laneHeight }))
}

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

function boundsOf(points: Position[]): ClusterBounds {
  const [first, ...rest] = points
  const seed = { x: first.x, y: first.y, z: first.z }

  return rest.reduce(
    (acc, point) => ({
      min: { x: Math.min(acc.min.x, point.x), y: Math.min(acc.min.y, point.y), z: Math.min(acc.min.z, point.z) },
      max: { x: Math.max(acc.max.x, point.x), y: Math.max(acc.max.y, point.y), z: Math.max(acc.max.z, point.z) },
    }),
    { min: { ...seed }, max: { ...seed } },
  )
}

export function layoutGraph(model: GraphModel, options: LayoutOptions = {}): GraphLayout {
  const strategy = options.strategy ?? "lanes"

  if (strategy === "hierarchy") return hierarchyLayout(model, options)

  if (strategy === "timeline") return timelineLayout(model, options)

  return bandedLayout(model, options)
}

type NodeGroup = { nodes: GraphNode[]; turnID?: string }

/**
 * Lanes: the session column, then one column per turn whose width is its own widest lane. Y is the
 * semantic activity lane, so explore/edit/verify/delegate read as horizontal bands.
 */
function bandedLayout(model: GraphModel, options: LayoutOptions): GraphLayout {
  const gap = options.gap ?? 24
  const laneGap = options.laneGap ?? 24
  const turnGap = options.turnGap ?? 96
  const depthStep = options.depthStep ?? 64
  const laneHeight = CARD_SIZE[1] + laneGap

  const positions = new Map<string, Position>()

  // T1.2: at overview only the nodes overview draws consume column width. Hidden execution cards
  // would otherwise leave wide empty gutters between the compact overview chips.
  const nodes = options.level === "overview" ? nodesAtLevel(model, "overview") : model.nodes

  const yFor = (node: GraphNode): number => LANES.indexOf(laneOf(node)) * laneHeight

  const place = (node: GraphNode, x: number) => positions.set(node.id, { x, y: yFor(node), z: DEPTH[node.kind] * depthStep })

  const fileOwners = new Map<string, string>()

  for (const node of nodes) {
    if (node.kind !== "file") continue
    const turnID = fileOwnerTurn(model, node)

    if (turnID) fileOwners.set(node.id, turnID)
  }

  const groups: NodeGroup[] = []

  const sessionNodes = nodes.filter(
    (node) => node.id === model.root || (node.kind === "file" && !fileOwners.has(node.id)),
  )

  if (sessionNodes.length > 0) groups.push({ nodes: sessionNodes, turnID: undefined })

  for (const turnID of model.turns)
    groups.push({
      nodes: nodes.filter((node) => node.turnID === turnID || fileOwners.get(node.id) === turnID),
      turnID,
    })

  const clusters = new Map<string, ClusterBounds>()
  let columnX = 0

  for (const group of groups) {
    const cursors = new Map<Lane, number>()

    const cursorFor = (lane: Lane) => {
      if (!cursors.has(lane)) cursors.set(lane, columnX)

      return cursors.get(lane)!
    }

    const staged = group.nodes.map((node) => {
      const lane = laneOf(node)
      const start = cursorFor(lane)
      const width = nodeSize(node)[0]
      cursors.set(lane, start + width + gap)

      // Positions are node centres (the renderer places boxes on their centre), so add half-width.
      return { node, x: start + width / 2 }
    })

    for (const entry of staged) place(entry.node, entry.x)

    const minColumnWidth = options.level === "overview" ? COMPACT_SIZE[0] : CARD_SIZE[0]
    const width = Math.max(...[...cursors.values()].map((end) => end - gap - columnX), minColumnWidth)
    columnX += width + turnGap
  }

  // Phase clusters keep their membership order; their bounds drive the RF.5 bands.
  for (const node of model.nodes) {
    if (node.kind !== "phase" || !node.clusterOf) continue

    const members = memberPositions(node.clusterOf, positions)

    if (members) clusters.set(node.id, members)
  }

  // Turn bands span all of a turn's members and the turn node itself.
  for (const turnID of model.turns) {
    const members = memberPositions(
      [turnID, ...model.nodes.filter((node) => node.turnID === turnID).map((node) => node.id)],
      positions,
    )

    if (members) clusters.set(turnID, members)
  }

  const all = [...positions.values()]

  return {
    positions,
    clusters,
    bounds: all.length > 0 ? boundsOf(all) : { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    strategy: "lanes",
  }
}

/**
 * Timeline (LE.11): one chronological block per turn, wrapping every `columns` cards so it reads as
 * rows rather than one long smear. Row 0 is the session/global block; each turn starts a fresh row so
 * the sequence stays legible without shrinking to slivers.
 */
function timelineLayout(model: GraphModel, options: LayoutOptions): GraphLayout {
  const gap = options.gap ?? 24
  const rowGap = options.rowGap ?? 20
  const depthStep = options.depthStep ?? 64
  const columns = Math.max(1, options.columns ?? 6)
  const rowHeight = CARD_SIZE[1] + rowGap

  const positions = new Map<string, Position>()
  let row = 0

  // T1.13: each block starts a fresh row band and leaves one empty row before the next, so turn
  // boundaries read top-to-bottom instead of interleaving unrelated activity.
  for (const nodes of turnBlocks(model)) {
    for (let i = 0; i < nodes.length; i += columns) {
      let cursor = 0

      for (const node of nodes.slice(i, i + columns)) {
        const width = nodeSize(node)[0]
        positions.set(node.id, { x: cursor + width / 2, y: row * rowHeight, z: DEPTH[node.kind] * depthStep })
        cursor += width + gap
      }

      row += 1
    }

    row += 1
  }

  const clusters = new Map<string, ClusterBounds>()

  // Turn bands label each chronological block; without them the timeline has no visible boundaries.
  for (const turnID of model.turns) {
    const members = memberPositions(
      [turnID, ...model.nodes.filter((node) => node.turnID === turnID).map((node) => node.id)],
      positions,
    )

    if (members) clusters.set(turnID, members)
  }

  for (const node of model.nodes) {
    if (node.kind !== "phase" || !node.clusterOf) continue

    const members = memberPositions(node.clusterOf, positions)

    if (members) clusters.set(node.id, members)
  }

  const all = [...positions.values()]

  return {
    positions,
    clusters,
    bounds: all.length > 0 ? boundsOf(all) : { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    strategy: "timeline",
  }
}

/**
 * Hierarchy (LE.11): an indented outline. Each node takes one row and X is the hierarchy indent, so
 * ancestry reads as a staircase rather than the diagonal scatter a shared per-depth cursor produced.
 * No turn/phase bands: an indent outline has no per-turn rectangle.
 */
function hierarchyLayout(model: GraphModel, options: LayoutOptions): GraphLayout {
  const rowGap = options.rowGap ?? 12
  const depthStep = options.depthStep ?? 64
  const rowHeight = CARD_SIZE[1] + rowGap
  // T1.12: a single 60-row column shrinks to an illegible sliver when fitted. Cap the column height
  // and wrap the outline into columns so the fit stays above the legibility floor.
  const rowsPerColumn = Math.max(1, options.rows ?? 14)
  const indentStep = 96
  const columnWidth = indentStep * 3 + CARD_SIZE[0]

  const positions = new Map<string, Position>()
  const indent = (depth: number) => depth * indentStep

  let column = 0

  for (const nodes of turnBlocks(model)) {
    let row = 0

    for (const node of nodes) {
      if (row >= rowsPerColumn) {
        row = 0
        column += 1
      }

      const depth = DEPTH[node.kind]
      positions.set(node.id, {
        x: column * columnWidth + indent(depth) + CARD_SIZE[0] / 2,
        y: row * rowHeight,
        z: depth * depthStep,
      })
      row += 1
    }

    column += 1
  }

  const all = [...positions.values()]

  return {
    positions,
    clusters: new Map(),
    bounds: all.length > 0 ? boundsOf(all) : { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    strategy: "hierarchy",
  }
}

/**
 * Chronological blocks shared by the timeline and hierarchy: the session/global group first (the root
 * and any node without an owning turn), then one block per turn with its header leading its members
 * in model order.
 */
function turnBlocks(model: GraphModel): GraphNode[][] {
  const global: GraphNode[] = []
  const byTurn = new Map<string, GraphNode[]>()

  for (const node of model.nodes) {
    const key = node.kind === "turn" ? node.id : node.turnID

    if (!key) {
      global.push(node)
      continue
    }

    const bucket = byTurn.get(key)

    if (bucket) bucket.push(node)
    else byTurn.set(key, [node])
  }

  const blocks: GraphNode[][] = []

  if (global.length > 0) blocks.push(global)

  for (const turnID of model.turns) {
    const nodes = byTurn.get(turnID)

    if (nodes && nodes.length > 0) blocks.push(nodes)
  }

  return blocks
}

/** Bounds over the placed positions of a set of node ids; undefined when none are placed. */
function memberPositions(ids: string[] | undefined, positions: ReadonlyMap<string, Position>) {
  const members = (ids ?? []).flatMap((id) => {
    const position = positions.get(id)

    return position ? [position] : []
  })

  return members.length > 0 ? boundsOf(members) : undefined
}

/** The turn a file belongs to: the turn of the other endpoint of its first incident edge. */
function fileOwnerTurn(model: GraphModel, node: GraphNode): string | undefined {
  const writes = model.edges.filter((edge) => edge.target === node.id && edge.kind === "writes")

  const ordered = [...writes, ...model.edges.filter((edge) => edge.source === node.id || edge.target === node.id)]

  for (const edge of ordered) {
    const otherID = edge.source === node.id ? edge.target : edge.source
    const other = model.nodes.find((candidate) => candidate.id === otherID)

    if (other?.turnID) return other.turnID
  }

  return undefined
}
