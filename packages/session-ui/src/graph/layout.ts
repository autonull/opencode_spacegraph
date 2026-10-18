import type { GraphModel, GraphNode, NodeKind } from "./model"
import { phaseCategoryOf } from "./model"

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

  return bandedLayout(model, options, strategy)
}

/**
 * Lanes and Timeline share the banded skeleton: the session column, then one column per turn whose
 * width is its own widest lane. They differ only in how Y is chosen — semantic activity lanes
 * (`lanes`) or a strict chronological single row (`timeline`).
 */
function bandedLayout(model: GraphModel, options: LayoutOptions, strategy: LayoutStrategy): GraphLayout {
  const gap = options.gap ?? 24
  const laneGap = options.laneGap ?? 24
  const turnGap = options.turnGap ?? 96
  const depthStep = options.depthStep ?? 64
  const laneHeight = CARD_SIZE[1] + laneGap

  const positions = new Map<string, Position>()

  const yFor = (node: GraphNode): number =>
    strategy === "timeline" ? DEPTH[node.kind] * laneHeight : LANES.indexOf(laneOf(node)) * laneHeight

  const place = (node: GraphNode, x: number) => positions.set(node.id, { x, y: yFor(node), z: DEPTH[node.kind] * depthStep })

  const fileOwners = new Map<string, string>()

  for (const node of model.nodes) {
    if (node.kind !== "file") continue
    const turnID = fileOwnerTurn(model, node)

    if (turnID) fileOwners.set(node.id, turnID)
  }

  const groups: NodeGroup[] = []

  const sessionNodes = model.nodes.filter(
    (node) => node.id === model.root || (node.kind === "file" && !fileOwners.has(node.id)),
  )

  if (sessionNodes.length > 0) groups.push({ nodes: sessionNodes, turnID: undefined })

  for (const turnID of model.turns)
    groups.push({
      nodes: model.nodes.filter((node) => node.turnID === turnID || fileOwners.get(node.id) === turnID),
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
      const lane = strategy === "timeline" ? "prompt" : laneOf(node)
      const start = cursorFor(lane)
      const width = nodeSize(node)[0]
      cursors.set(lane, start + width + gap)

      // Positions are node centres (the renderer places boxes on their centre), so add half-width.
      return { node, x: start + width / 2 }
    })

    for (const entry of staged) place(entry.node, entry.x)

    const width = Math.max(...[...cursors.values()].map((end) => end - gap - columnX), CARD_SIZE[0])
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
    strategy,
  }
}

/**
 * Hierarchy (RF.2): indentation by turn and depth. X grows with hierarchy depth, Y with the turn
 * index, so ancestry reads as an indent rather than a horizontal fan.
 */
function hierarchyLayout(model: GraphModel, options: LayoutOptions): GraphLayout {
  const gap = options.gap ?? 24
  const laneGap = options.laneGap ?? 16
  const depthStep = options.depthStep ?? 64
  const rowHeight = COMPACT_SIZE[1] + laneGap

  const positions = new Map<string, Position>()
  const indent = (depth: number) => depth * (CARD_SIZE[0] / 2 + gap)
  const cursorByDepth = new Map<number, number>()

  const order = [...model.turns.flatMap((turnID) => model.nodes.filter((node) => node.turnID === turnID))]
  const seen = new Set(order.map((node) => node.id))
  const rest = model.nodes.filter((node) => !seen.has(node.id))

  let row = 0

  for (const node of [...rest, ...order]) {
    const depth = DEPTH[node.kind]
    const width = nodeSize(node)[0]
    const start = Math.max(cursorByDepth.get(depth) ?? 0, indent(depth))
    cursorByDepth.set(depth, start + width + gap)
    positions.set(node.id, { x: start + width / 2, y: row * rowHeight, z: depth * depthStep })
    row += 1
  }

  const clusters = new Map<string, ClusterBounds>()

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
    strategy: "hierarchy",
  }
}

type NodeGroup = { nodes: GraphNode[]; turnID?: string }

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
