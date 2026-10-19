import type { JsonValue } from "@opencode/client/promise"
import { Option, Schema } from "effect"
import type { EdgeKind, GraphModel, GraphEdge, GraphNode, NodeKind } from "./model"

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

/**
 * Everything a breadcrumb selection should frame (U3.11): the node, its `part-of` descendants, the
 * members of a derived cluster, and the files those activities read or wrote. Provenance files are
 * not `part-of` a turn, so they are collected one hop out; a file shared across turns appears under
 * both. Returned in model order so the caller can fit the exact node set the bands draw.
 */
export function subtree(model: GraphModel, id: string): GraphNode[] {
  const node = nodeByID(model, id)

  if (!node) return []

  const children = new Map<string, string[]>()

  for (const edge of model.edges) {
    if (edge.kind !== "part-of") continue
    children.set(edge.target, [...(children.get(edge.target) ?? []), edge.source])
  }

  const members = new Set([id, ...(node.derived ? (node.clusterOf ?? []) : [])])
  const queue = [...members]
  const kindByID = new Map(model.nodes.map((node) => [node.id, node.kind]))

  while (queue.length > 0) {
    for (const child of children.get(queue.shift()!) ?? []) {
      if (members.has(child)) continue
      members.add(child)
      queue.push(child)
    }
  }

  const hierarchy = new Set(members)

  for (const edge of model.edges) {
    if (edge.kind === "part-of") continue
    const source = kindByID.get(edge.source)
    const target = kindByID.get(edge.target)

    if (hierarchy.has(edge.source) && target === "file") members.add(edge.target)

    if (hierarchy.has(edge.target) && source === "file") members.add(edge.source)
  }

  return model.nodes.filter((node) => members.has(node.id))
}

/** Breadcrumb line from the session root down to the node (root first). */
export function breadcrumbs(model: GraphModel, id: string, seen: Set<string> = new Set()): GraphNode[] {
  const node = nodeByID(model, id)

  if (!node || seen.has(id)) return []
  seen.add(id)

  const ancestry = ancestors(model, id)

  if (ancestry.length > 0) return [...ancestry.reverse(), node]

  // Provenance files have no `part-of` edge. Walk one provenance hop to the activity that touched
  // them so the path still reads Session → turn → tool → file (T1.9).
  const owner = provenanceOwner(model, node)

  return owner ? [...breadcrumbs(model, owner.id, seen), node] : [node]
}

const PROVENANCE: ReadonlySet<EdgeKind> = new Set(["writes", "reads", "produces", "searches", "compacts", "evidence"])

function provenanceOwner(model: GraphModel, node: GraphNode): GraphNode | undefined {
  const related = model.edges.filter((edge) => edge.source === node.id || edge.target === node.id)
  const ordered = [
    ...related.filter((edge) => PROVENANCE.has(edge.kind)),
    ...related.filter((edge) => !PROVENANCE.has(edge.kind)),
  ]

  for (const edge of ordered) {
    const other = nodeByID(model, edge.source === node.id ? edge.target : edge.source)

    if (!other || other.id === node.id) continue
    if (other.id === model.root || other.turnID || ancestors(model, other.id).length > 0) return other
  }
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

const READ_KINDS = new Set<EdgeKind>(["reads", "searches", "references"])

export type ChangedFile = {
  id: string
  path: string
  /** Activity node ids that wrote or produced this file, in model order. */
  writers: string[]
  /** Activity node ids that read, searched, or referenced this file, in model order. */
  readers: string[]
}

/**
 * The session's changed files, in first-write order (LE.12). Each entry is a `file` node with the
 * activity ids that wrote it (`writes`/`produces`), plus the ids that read it one hop out. The
 * file-first rail renders this; selecting a file inverts the "why did this change?" question by
 * focusing its writers. Files that were only read never appear.
 */
export function changedFiles(model: GraphModel): ChangedFile[] {
  const kindByID = new Map(model.nodes.map((node) => [node.id, node.kind]))
  const byID = new Map<string, ChangedFile>()
  const order: string[] = []

  for (const edge of model.edges) {
    if (kindByID.get(edge.target) !== "file") continue

    if (edge.kind !== "writes" && edge.kind !== "produces") continue

    let entry = byID.get(edge.target)

    if (!entry) {
      const node = nodeByID(model, edge.target)
      entry = { id: edge.target, path: dataString(node?.data?.path) ?? node?.label ?? edge.target, writers: [], readers: [] }
      byID.set(edge.target, entry)
      order.push(edge.target)
    }

    entry.writers.push(edge.source)
  }

  for (const edge of model.edges) {
    if (kindByID.get(edge.target) !== "file" || !READ_KINDS.has(edge.kind)) continue
    byID.get(edge.target)?.readers.push(edge.source)
  }

  return order.map((id) => byID.get(id)!)
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
