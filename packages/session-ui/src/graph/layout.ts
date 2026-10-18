import type { GraphModel, GraphNode, NodeKind } from "./model"
import { phaseCategoryOf } from "./model"

/**
 * Deterministic, append-only layout (§5.5): no physics, no re-layout on mutation. X advances by turn
 * and by event ordinal within a turn, Y is the activity lane, Z is hierarchy depth for 3D. Positions
 * depend only on model order, so appending a turn or a part leaves earlier coordinates unchanged.
 */
export type Position = { x: number; y: number; z: number }

export type LayoutOptions = {
  /** Horizontal distance between turn bases. */
  turnGap?: number
  /** Horizontal step between events inside one turn. */
  step?: number
  /** Vertical distance between lanes. */
  laneGap?: number
  /** Z distance between hierarchy depths. */
  depthStep?: number
}

export const LANES = ["prompt", "narrative", "explore", "edit", "verify", "delegate", "artifacts"] as const

export type Lane = (typeof LANES)[number]

export type ClusterBounds = { min: Position; max: Position }

export type GraphLayout = {
  positions: Map<string, Position>
  clusters: Map<string, ClusterBounds>
  bounds: ClusterBounds
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

  if (node.kind === "message") {
    const role = node.data?.role

    if (role === "user") return "prompt"

    if (role === "shell") return "verify"

    return "narrative"
  }

  if (node.kind === "reasoning" || node.kind === "notice" || node.kind === "compaction") return "narrative"

  if (node.kind === "error" || node.kind === "retry") return "narrative"

  if (node.kind === "result") return "verify"

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
  const turnGap = options.turnGap ?? 320
  const step = options.step ?? 48
  const laneGap = options.laneGap ?? 56
  const depthStep = options.depthStep ?? 64

  const positions = new Map<string, Position>()

  const place = (id: string, x: number, lane: Lane, depth: number) => {
    positions.set(id, { x, y: LANES.indexOf(lane) * laneGap, z: depth * depthStep })
  }

  const baseX = new Map<string, number>()
  model.turns.forEach((turnID, index) => baseX.set(turnID, (index + 1) * turnGap))

  const root = model.nodes.find((node) => node.id === model.root)

  if (root) place(root.id, 0, laneOf(root), DEPTH[root.kind])

  const ordinals = new Map<string, number>()

  // Pass A: turns and their primary children, in model order (append-only within a turn).
  for (const node of model.nodes) {
    if (node.id === model.root || node.kind === "file" || node.kind === "phase") continue
    const turnID = node.turnID

    if (!turnID) continue
    const turnX = baseX.get(turnID)

    if (turnX === undefined) continue

    if (node.kind === "turn") {
      place(node.id, turnX, laneOf(node), DEPTH[node.kind])

      continue
    }

    const ordinal = (ordinals.get(turnID) ?? 0) + 1
    ordinals.set(turnID, ordinal)
    place(node.id, turnX + ordinal * step, laneOf(node), DEPTH[node.kind])
  }

  // Pass B: phase clusters sit at their first member's X on the phase's lane.
  for (const node of model.nodes) {
    if (node.kind !== "phase") continue
    const anchor = node.clusterOf?.[0]
    const memberX = anchor ? positions.get(anchor)?.x : undefined
    const turnX = node.turnID ? baseX.get(node.turnID) : undefined

    place(node.id, memberX ?? turnX ?? 0, laneOf(node), DEPTH[node.kind])
  }

  // Pass C: file nodes sit near their first write, on the artifacts lane.
  for (const node of model.nodes) {
    if (node.kind !== "file") continue
    const anchor = firstFileEdge(model, node)
    const other = anchor ? (anchor.source === node.id ? anchor.target : anchor.source) : undefined

    place(node.id, (other ? positions.get(other)?.x : undefined) ?? 0, laneOf(node), DEPTH[node.kind])
  }

  const clusters = new Map<string, ClusterBounds>()

  for (const node of model.nodes) {
    if (node.kind !== "phase" || !node.clusterOf) continue

    const members = node.clusterOf.flatMap((id) => {
      const position = positions.get(id)

      return position ? [position] : []
    })

    if (members.length > 0) clusters.set(node.id, boundsOf(members))
  }

  const all = [...positions.values()]

  return {
    positions,
    clusters,
    bounds: all.length > 0 ? boundsOf(all) : { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
  }
}

/** A file's anchor edge: its first tool write, else the first write, else the first incident edge. */
function firstFileEdge(model: GraphModel, node: GraphNode) {
  const writes = model.edges.filter((edge) => edge.kind === "writes" && edge.target === node.id)
  const toolWrite = writes.find((edge) => model.nodes.find((candidate) => candidate.id === edge.source)?.kind === "tool")

  return toolWrite ?? writes[0] ?? model.edges.find((edge) => edge.source === node.id || edge.target === node.id)
}
