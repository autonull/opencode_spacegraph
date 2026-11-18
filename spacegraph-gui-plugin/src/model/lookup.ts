import type { GraphEdge, GraphNode } from "./model"

/**
 * The model's indexes.
 *
 * The model is immutable once built, so every index is built once per model object and reused. A
 * lookup in a hot path — a selection change, a render-model build, a file rail — costs a map read
 * instead of a scan of every node or edge.
 */

const NODE_INDEX = new WeakMap<object, ReadonlyMap<string, GraphNode>>()

/** Every node by id. */
export function nodeIndex(model: { nodes: readonly GraphNode[] }): ReadonlyMap<string, GraphNode> {
  const cached = NODE_INDEX.get(model)

  if (cached) return cached

  const index = new Map(model.nodes.map((node) => [node.id, node]))

  NODE_INDEX.set(model, index)

  return index
}

/** The node with this id, or undefined. */
export function lookupNode(model: { nodes: readonly GraphNode[] }, id: string): GraphNode | undefined {
  return nodeIndex(model).get(id)
}

const PARENT_INDEX = new WeakMap<object, ReadonlyMap<string, string>>()

/**
 * The `part-of` parent of each node: the turn that owns a message, the session that owns a turn.
 * A node has one parent, so the first `part-of` edge wins.
 * Edges go from child -> parent (source=child, target=parent).
 */
export function parentIndex(model: { edges: readonly GraphEdge[] }): ReadonlyMap<string, string> {
  const cached = PARENT_INDEX.get(model)

  if (cached) return cached

  const parents = new Map<string, string>()

  for (const edge of model.edges) {
    if (edge.kind !== "part-of") continue

    // part-of edges go from child -> parent, so source is the child
    if (parents.has(edge.source)) continue

    parents.set(edge.source, edge.target)
  }

  PARENT_INDEX.set(model, parents)

  return parents
}

const CHILD_INDEX = new WeakMap<object, ReadonlyMap<string, readonly string[]>>()

/** The `part-of` children of each node. */
export function childIndex(model: { edges: readonly GraphEdge[] }): ReadonlyMap<string, readonly string[]> {
  const cached = CHILD_INDEX.get(model)

  if (cached) return cached

  const children = new Map<string, string[]>()

  for (const edge of model.edges) {
    if (edge.kind !== "part-of") continue

    const existing = children.get(edge.target)

    if (existing) existing.push(edge.source)
    else children.set(edge.target, [edge.source])
  }

  CHILD_INDEX.set(model, children)

  return children
}

export type SequenceIndex = {
  /** The node that follows in the sequence chain. */
  next: ReadonlyMap<string, string>
  /** The node that came before in the sequence chain. */
  previous: ReadonlyMap<string, string>
}

const SEQUENCE_INDEX = new WeakMap<object, SequenceIndex>()

/**
 * The sequence chain: what follows what, and what came before. The chain is linear — each node has
 * at most one successor and one predecessor — so the first edge wins.
 */
export function sequenceIndex(model: { edges: readonly GraphEdge[] }): SequenceIndex {
  const cached = SEQUENCE_INDEX.get(model)

  if (cached) return cached

  const next = new Map<string, string>()
  const previous = new Map<string, string>()

  for (const edge of model.edges) {
    if (edge.kind !== "sequence") continue

    if (!next.has(edge.source)) next.set(edge.source, edge.target)

    if (!previous.has(edge.target)) previous.set(edge.target, edge.source)
  }

  const index = { next, previous }

  SEQUENCE_INDEX.set(model, index)

  return index
}
