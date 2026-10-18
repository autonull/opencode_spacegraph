import type { JsonValue } from "@opencode/client/promise"
import { Option, Schema } from "effect"
import type { GraphModel, GraphEdge, GraphNode, NodeKind } from "./model"

export type Subgraph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type TranscriptRef = {
  messageID?: string
  partID?: string
}

export function nodeByID(model: GraphModel, id: string) {
  return model.nodes.find((node) => node.id === id)
}

export function incoming(model: GraphModel, id: string) {
  return model.edges.filter((edge) => edge.target === id)
}

export function outgoing(model: GraphModel, id: string) {
  return model.edges.filter((edge) => edge.source === id)
}

/** Direct neighbors in either direction, with the edges that connect them. */
export function neighbors(model: GraphModel, id: string): Subgraph {
  const edges = model.edges.filter((edge) => edge.source === id || edge.target === id)
  const nodeIDs = new Set<string>()

  for (const edge of edges) {
    nodeIDs.add(edge.source === id ? edge.target : edge.source)
  }

  return { edges, nodes: model.nodes.filter((node) => nodeIDs.has(node.id)) }
}

/** The `part-of` chain from a node up to the session root, nearest ancestor first. */
export function ancestors(model: GraphModel, id: string): GraphNode[] {
  const result: GraphNode[] = []
  const seen = new Set([id])
  let current = id

  for (;;) {
    const edge = model.edges.find((candidate) => candidate.kind === "part-of" && candidate.source === current)

    if (!edge || seen.has(edge.target)) break
    seen.add(edge.target)
    const node = nodeByID(model, edge.target)

    if (!node) break
    result.push(node)
    current = edge.target
  }

  return result
}

/** Breadcrumb line from the session root down to the node (root first). */
export function breadcrumbs(model: GraphModel, id: string): GraphNode[] {
  const node = nodeByID(model, id)

  if (!node) return []

  return [...ancestors(model, id).reverse(), node]
}

/**
 * Why a node exists: the edges that point at it (`writes`/`reads`/`produces`/`evidence`), the
 * hierarchy it belongs to, and its ordered `sequence` neighbors. Causality is never inferred here.
 */
export function why(model: GraphModel, id: string) {
  return {
    incoming: incoming(model, id),
    outgoing: outgoing(model, id),
    ancestors: ancestors(model, id),
    sequenceBefore: model.edges.find((edge) => edge.kind === "sequence" && edge.target === id)?.source,
    sequenceAfter: model.edges.find((edge) => edge.kind === "sequence" && edge.source === id)?.target,
  }
}

/** Shortest undirected path between two nodes by node IDs, or undefined when disconnected. */
export function shortestPath(model: GraphModel, from: string, to: string): string[] | undefined {
  if (from === to) return [from]
  const adjacency = new Map<string, string[]>()

  for (const edge of model.edges) {
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target])
    adjacency.set(edge.target, [...(adjacency.get(edge.target) ?? []), edge.source])
  }

  const previous = new Map<string, string>()
  const queue = [from]
  const visited = new Set([from])

  while (queue.length > 0) {
    const current = queue.shift()!

    for (const next of adjacency.get(current) ?? []) {
      if (visited.has(next)) continue
      visited.add(next)
      previous.set(next, current)

      if (next === to) {
        const path = [to]

        for (let step = to; previous.has(step); ) {
          step = previous.get(step)!
          path.unshift(step)
        }

        return path
      }

      queue.push(next)
    }
  }

  return undefined
}

/** Nodes that follow `id` in its turn's `sequence` stream, in order. */
export function forwardChain(model: GraphModel, id: string): GraphNode[] {
  const result: GraphNode[] = []
  const seen = new Set([id])
  let current = id

  for (;;) {
    const edge = model.edges.find((candidate) => candidate.kind === "sequence" && candidate.source === current)

    if (!edge || seen.has(edge.target)) break
    seen.add(edge.target)
    const node = nodeByID(model, edge.target)

    if (!node) break
    result.push(node)
    current = edge.target
  }

  return result
}

const dataString = (value: JsonValue | undefined) => Option.getOrUndefined(Schema.decodeUnknownOption(Schema.String)(value))

const searchable = (node: GraphNode) =>
  [
    node.label,
    node.summary,
    dataString(node.data?.name),
    dataString(node.data?.path),
    dataString(node.data?.command),
    node.data?.input ? JSON.stringify(node.data.input) : undefined,
  ]
    .filter((value): value is string => !!value)
    .join("\n")
    .toLowerCase()

export function search(model: GraphModel, query: string): GraphNode[] {
  const needle = query.trim().toLowerCase()

  if (!needle) return []

  return model.nodes.filter((node) => searchable(node).includes(needle))
}

/** The message/part a node points back to in the transcript, when it has one. */
export function openInTranscript(model: GraphModel, id: string): TranscriptRef | undefined {
  const node = nodeByID(model, id)

  if (!node?.messageID) return undefined

  return { messageID: node.messageID, partID: node.partID }
}

/** The active turn node with its immediate children, when the session still owns work. */
export function currentActivity(model: GraphModel): Subgraph | undefined {
  if (!model.activeTurn) return undefined
  const turn = nodeByID(model, model.activeTurn)

  if (!turn) return undefined
  const edges = incoming(model, turn.id).filter((edge) => edge.kind === "part-of")
  const children = new Set(edges.map((edge) => edge.source))

  return { nodes: [turn, ...model.nodes.filter((node) => children.has(node.id))], edges }
}

/** Signal order for a turn's children: phases and failures summarize a turn better than raw tools. */
const TURN_CHILD_PRIORITY: Partial<Record<NodeKind, number>> = {
  phase: 0,
  error: 1,
  retry: 2,
  subagent: 3,
  result: 4,
  tool: 5,
  file: 6,
  diff: 7,
  message: 8,
  compaction: 9,
  notice: 10,
  reasoning: 11,
}

/**
 * The execution-level subgraph for one turn (H6.2/H6.4): the turn node plus its highest-signal
 * `part-of` children, capped so a compact overlay or inline graph stays legible. Phase chips and
 * failures rank above individual tools and files; ties keep model order, so the result is stable.
 */
export function turnSubgraph(model: GraphModel, turnID: string, limit = 7): Subgraph {
  const turn = nodeByID(model, turnID)

  if (!turn) return { nodes: [], edges: [] }

  const children = model.edges
    .filter((edge) => edge.kind === "part-of" && edge.target === turnID)
    .map((edge) => nodeByID(model, edge.source))
    .filter((node): node is GraphNode => !!node)
    .sort((a, b) => (TURN_CHILD_PRIORITY[a.kind] ?? 99) - (TURN_CHILD_PRIORITY[b.kind] ?? 99))

  const chosen = new Set([turn.id, ...children.slice(0, Math.max(0, limit - 1)).map((node) => node.id)])

  return {
    nodes: model.nodes.filter((node) => chosen.has(node.id)),
    edges: model.edges.filter((edge) => chosen.has(edge.source) && chosen.has(edge.target)),
  }
}
