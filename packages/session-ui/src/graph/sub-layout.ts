import type { GraphNode, GraphViewData, ZoomLevel } from "./model"
import type { Layout } from "./vocabulary"
import type { ClusterBounds, Position } from "./layout"
import { nodeIndex } from "./lookup"
import { applySubLayouts as kernelApplySubLayouts, type SubLayoutGroup as KernelSubLayoutGroup, type GraphViewData as KernelGraphViewData, type ClusterBounds as KernelClusterBounds, type PositionsMap as KernelPositionsMap } from "@spacegraphjs/kernel"

/** Type alias for adapter positions. */
type AdapterPosition = Position

/** Sub-layout policy function signature. */
export type SubLayoutPolicy = (
  model: GraphViewData,
  positions: Map<string, AdapterPosition>,
  groupID: string,
  groupBounds: ClusterBounds,
  level: ZoomLevel,
  layout: Layout,
) => Map<string, AdapterPosition>

/** Sub-layout policy for phase groups: inner lanes (turn ordinal × lane), cell from card size. */
export function phaseSubLayout(
  model: GraphViewData,
  positions: Map<string, AdapterPosition>,
  groupID: string,
  groupBounds: ClusterBounds,
  _level: ZoomLevel,
  _layout: Layout,
): Map<string, AdapterPosition> {
  const idx = nodeIndex(model)
  const group = idx.get(groupID)
  if (!group || group.kind !== "phase" || !group.clusterOf) return positions

  const newPositions = new Map(positions)
  const members = group.clusterOf
    .map((id) => idx.get(id))
    .filter((n): n is GraphNode => n !== undefined)

  // Group members by their lane (y-coordinate)
  const byLane = new Map<number, GraphNode[]>()
  for (const member of members) {
    const pos = positions.get(member.id)
    if (!pos) continue
    const lane = Math.round(pos.y / 56) // laneGap from layout.ts
    const bucket = byLane.get(lane)
    if (bucket) bucket.push(member)
    else byLane.set(lane, [member])
  }

  // Sort lanes and members within each lane by X position
  const sortedLanes = [...byLane.entries()].sort(([a], [b]) => a - b)
  const cardWidth = 220
  const cardHeight = 72
  const laneGap = 56
  const padding = 24

  let currentY = groupBounds.min.y + padding
  for (const [, laneMembers] of sortedLanes) {
    // Sort by original X position (turn ordinal)
    laneMembers.sort((a, b) => {
      const pa = positions.get(a.id)
      const pb = positions.get(b.id)
      return (pa?.x ?? 0) - (pb?.x ?? 0)
    })

    let currentX = groupBounds.min.x + padding
    for (const member of laneMembers) {
      newPositions.set(member.id, {
        x: currentX,
        y: currentY,
        z: 0,
      })
      currentX += cardWidth + 16 // cardWidth + gap
    }
    currentY += cardHeight + laneGap
  }

  return newPositions
}

/** Sub-layout policy for error groups: radial fan around the evidence root, retries adjacent. */
export function errorSubLayout(
  model: GraphViewData,
  positions: Map<string, AdapterPosition>,
  groupID: string,
  groupBounds: ClusterBounds,
  _level: ZoomLevel,
  _layout: Layout,
): Map<string, AdapterPosition> {
  const idx = nodeIndex(model)
  const group = idx.get(groupID)
  if (!group || group.kind !== "error" || !group.clusterOf) return positions

  const newPositions = new Map(positions)
  const members = group.clusterOf
    .map((id) => idx.get(id))
    .filter((n): n is GraphNode => n !== undefined)

  // Find the evidence root (the tool that caused the error)
  const evidenceRoot = members.find((m) => m.kind === "tool" && (m.data?.evidence as boolean) === true)
  const centerX = (groupBounds.min.x + groupBounds.max.x) / 2
  const centerY = (groupBounds.min.y + groupBounds.max.y) / 2
  const radius = Math.max(groupBounds.max.x - groupBounds.min.x, groupBounds.max.y - groupBounds.min.y) / 2

  if (evidenceRoot) {
    newPositions.set(evidenceRoot.id, { x: centerX, y: centerY, z: 0 })
  }

  // Place other members in a fan
  const otherMembers = members.filter((m) => m !== evidenceRoot)
  const angleStep = (Math.PI * 2) / Math.max(1, otherMembers.length)
  for (let i = 0; i < otherMembers.length; i++) {
    const angle = i * angleStep - Math.PI / 2
    newPositions.set(otherMembers[i].id, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      z: 0,
    })
  }

  return newPositions
}

/** Sub-layout policy for file groups: grid, path-sorted, worst-offender first. */
export function fileSubLayout(
  model: GraphViewData,
  positions: Map<string, AdapterPosition>,
  groupID: string,
  groupBounds: ClusterBounds,
  _level: ZoomLevel,
  _layout: Layout,
): Map<string, AdapterPosition> {
  const idx = nodeIndex(model)
  const group = idx.get(groupID)
  if (!group || group.kind !== "file" || !group.clusterOf) return positions

  const newPositions = new Map(positions)
  const members = group.clusterOf
    .map((id) => idx.get(id))
    .filter((n): n is GraphNode => n !== undefined)

  // Sort by path (lexicographic), then by writes first (worst offender)
  members.sort((a, b) => {
    const pathA = String(a.data?.path ?? "")
    const pathB = String(b.data?.path ?? "")
    if (pathA !== pathB) return pathA.localeCompare(pathB)
    const writesA = (a.data?.writes as boolean) === true ? 0 : 1
    const writesB = (b.data?.writes as boolean) === true ? 0 : 1
    return writesA - writesB
  })

  const cols = 3
  const cardWidth = 220
  const cardHeight = 72
  const gap = 16

  for (let i = 0; i < members.length; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    newPositions.set(members[i].id, {
      x: groupBounds.min.x + 24 + col * (cardWidth + gap),
      y: groupBounds.min.y + 24 + row * (cardHeight + gap),
      z: 0,
    })
  }

  return newPositions
}

/** Sub-layout policy for subagent groups: vertical stack in delegation order. */
export function subagentSubLayout(
  model: GraphViewData,
  positions: Map<string, AdapterPosition>,
  groupID: string,
  groupBounds: ClusterBounds,
  _level: ZoomLevel,
  _layout: Layout,
): Map<string, AdapterPosition> {
  const idx = nodeIndex(model)
  const group = idx.get(groupID)
  if (!group || group.kind !== "subagent-group" || !group.clusterOf) return positions

  const newPositions = new Map(positions)
  const members = group.clusterOf
    .map((id) => idx.get(id))
    .filter((n): n is GraphNode => n !== undefined)

  // Sort by turn order (delegation order)
  members.sort((a, b) => {
    const turnA = idx.get(a.turnID ?? "")
    const turnB = idx.get(b.turnID ?? "")
    return (Number(turnA?.data?.ordinal ?? 0)) - (Number(turnB?.data?.ordinal ?? 0))
  })

  const cardHeight = 72
  const gap = 16

  for (let i = 0; i < members.length; i++) {
    newPositions.set(members[i].id, {
      x: groupBounds.min.x + 24,
      y: groupBounds.min.y + 24 + i * (cardHeight + gap),
      z: 0,
    })
  }

  return newPositions
}

/** Sub-layout policy for compaction groups: chronological stack with boundary markers. */
export function compactionSubLayout(
  model: GraphViewData,
  positions: Map<string, AdapterPosition>,
  groupID: string,
  groupBounds: ClusterBounds,
  _level: ZoomLevel,
  _layout: Layout,
): Map<string, AdapterPosition> {
  const idx = nodeIndex(model)
  const group = idx.get(groupID)
  if (!group || group.kind !== "compaction-group" || !group.clusterOf) return positions

  const newPositions = new Map(positions)
  const members = group.clusterOf
    .map((id) => idx.get(id))
    .filter((n): n is GraphNode => n !== undefined)

  // Sort by time (chronological order of compaction events)
  members.sort((a, b) => {
    const timeA = a.time ?? 0
    const timeB = b.time ?? 0
    return timeA - timeB
  })

  const cardHeight = 72
  const gap = 16

  for (let i = 0; i < members.length; i++) {
    newPositions.set(members[i].id, {
      x: groupBounds.min.x + 24,
      y: groupBounds.min.y + 24 + i * (cardHeight + gap),
      z: 0,
    })
  }

  return newPositions
}

/** Sub-layout policy for facet groups: grid by domain, sorted by count. */
export function facetSubLayout(
  model: GraphViewData,
  positions: Map<string, AdapterPosition>,
  groupID: string,
  groupBounds: ClusterBounds,
  _level: ZoomLevel,
  _layout: Layout,
): Map<string, AdapterPosition> {
  const idx = nodeIndex(model)
  const group = idx.get(groupID)
  if (!group || group.kind !== "facet-group" || !group.clusterOf) return positions

  const newPositions = new Map(positions)
  const members = group.clusterOf
    .map((id) => idx.get(id))
    .filter((n): n is GraphNode => n !== undefined)

  // Sort by domain, then by count (worst first)
  members.sort((a, b) => {
    const domainA = String(a.data?.domain ?? "")
    const domainB = String(b.data?.domain ?? "")
    if (domainA !== domainB) return domainA.localeCompare(domainB)
    const countA = Number(a.data?.count ?? 0)
    const countB = Number(b.data?.count ?? 0)
    return countB - countA // descending: worst first
  })

  const cols = 3
  const cardWidth = 220
  const cardHeight = 72
  const gap = 16

  for (let i = 0; i < members.length; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    newPositions.set(members[i].id, {
      x: groupBounds.min.x + 24 + col * (cardWidth + gap),
      y: groupBounds.min.y + 24 + row * (cardHeight + gap),
      z: 0,
    })
  }

  return newPositions
}

/** Default sub-layout (no-op for turn bands). */
export function defaultSubLayout(
  _model: GraphViewData,
  positions: Map<string, AdapterPosition>,
  _groupID: string,
  _groupBounds: ClusterBounds,
  _level: ZoomLevel,
  _layout: Layout,
): Map<string, AdapterPosition> {
  return positions
}

/** Get the sub-layout policy for a group kind. */
export function getSubLayoutPolicy(kind: GraphNode["kind"]): SubLayoutPolicy {
  switch (kind) {
    case "phase":
      return phaseSubLayout
    case "error-group":
      return errorSubLayout
    case "file-group":
      return fileSubLayout
    case "subagent-group":
      return subagentSubLayout
    case "compaction-group":
      return compactionSubLayout
    case "facet-group":
      return facetSubLayout
    default:
      return defaultSubLayout
  }
}

/**
 * Apply sub-layout to all expanded groups in the model.
 * This is a post-pass: layoutGraph runs first (positions stable), then this places members in group-local coordinates.
 * Uses the generic kernel applySubLayouts with a dispatching policy.
 */
export function applySubLayouts(
  model: GraphViewData,
  positions: Map<string, AdapterPosition>,
  level: ZoomLevel,
  layout: Layout,
): Map<string, AdapterPosition> {
  // Only apply sub-layouts at execution/detail level where groups are expanded
  if (level === "overview") return new Map(positions)

  // Collect groups that need sub-layout
  const kernelGroups: KernelSubLayoutGroup[] = []
  for (const node of model.nodes) {
    if (node.kind !== "phase" && node.kind !== "error-group" && node.kind !== "file-group" && node.kind !== "subagent-group" && node.kind !== "compaction-group" && node.kind !== "facet-group") continue
    if (!node.clusterOf || node.clusterOf.length === 0) continue
    if (!isClusterExpanded(level)) continue

    kernelGroups.push({ id: node.id, kind: node.kind, clusterOf: node.clusterOf })
  }

  if (kernelGroups.length === 0) return new Map(positions)

  // Dispatching policy that routes to host-specific policy functions
  // Uses type assertions to bridge kernel's minimal types with session-ui's full types
  const dispatchingPolicy = (
    group: KernelSubLayoutGroup,
    _model: KernelGraphViewData,
    positions: KernelPositionsMap,
    bounds: KernelClusterBounds,
  ): KernelPositionsMap => {
    const policy = getSubLayoutPolicy(group.kind as GraphNode["kind"])
    // Convert kernel types to session-ui types for the policy function
    const sessionModel = model as unknown as GraphViewData
    const sessionPositions = positions as unknown as Map<string, AdapterPosition>
    const sessionBounds = bounds as unknown as ClusterBounds
    const result = policy(sessionModel, sessionPositions, group.id, sessionBounds, level, layout)
    return result as unknown as KernelPositionsMap
  }

  // Use kernel's generic applySubLayouts
  const kernelModel = model as unknown as KernelGraphViewData
  const kernelPositions = new Map(positions) as unknown as KernelPositionsMap
  const kernelResult = kernelApplySubLayouts(kernelModel, kernelPositions, kernelGroups, dispatchingPolicy)
  return kernelResult as unknown as Map<string, AdapterPosition>
}

/** Check if clusters are expanded at the given level. */
export function isClusterExpanded(level: ZoomLevel): boolean {
  return level !== "overview"
}

/**
 * Compute the bounding box for a cluster of nodes.
 * This mirrors the adapter's bandBox logic.
 */
export function computeBandBox(
  model: GraphViewData,
  ids: readonly string[],
  positions: ReadonlyMap<string, AdapterPosition>,
  visible: ReadonlySet<string>,
): ClusterBounds | undefined {
  const idx = nodeIndex(model)
  const boxes = ids.flatMap((id) => {
    if (!visible.has(id)) return []
    const position = positions.get(id)
    if (!position) return []
    const node = idx.get(id)
    const size = node ? nodeSize(node) : [220, 72]
    const halfWidth = size[0] / 2
    const halfHeight = size[1] / 2

    return [
      {
        min: { x: position.x - halfWidth, y: position.y - halfHeight, z: 0 },
        max: { x: position.x + halfWidth, y: position.y + halfHeight, z: 0 },
      },
    ]
  })

  if (boxes.length === 0) return undefined

  const padding = 24

  return {
    min: {
      x: Math.min(...boxes.map((box) => box.min.x)) - padding,
      y: Math.min(...boxes.map((box) => box.min.y)) - padding,
      z: 0,
    },
    max: {
      x: Math.max(...boxes.map((box) => box.max.x)) + padding,
      y: Math.max(...boxes.map((box) => box.max.y)) + padding,
      z: 0,
    },
  }
}

/** Get the size of a node for layout purposes. */
function nodeSize(node: GraphNode): [number, number] {
  const STRUCTURAL_KINDS = new Set(["session", "turn", "phase", "error", "retry"])
  const COMPACT_SIZE: [number, number] = [132, 44]
  const CARD_SIZE: [number, number] = [220, 72]
  return STRUCTURAL_KINDS.has(node.kind) ? COMPACT_SIZE : CARD_SIZE
}

export type { ClusterBounds, Position } from "./layout"