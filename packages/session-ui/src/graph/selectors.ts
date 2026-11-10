import type { JsonValue } from "@opencode/client/promise"
import { Option, Schema } from "effect"
import { extractSubgraph } from "spacegraphjs/overlays"
import { Navigation } from "spacegraphjs/navigation"
import type { GraphViewData, GraphEdge, GraphNode, NodeKind } from "./model"
import { childIndex, lookupNode, nodeIndex, parentIndex, sequenceIndex } from "./lookup"
import { PROVENANCE_EDGE_KINDS, READ_EDGE_KINDS } from "./vocabulary"

export type Subgraph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type TranscriptRef = {
  messageID?: string
  partID?: string
}

/** Counts of key node kinds in a node array. Used for session/turn statistics. */
export function countNodeKinds(nodes: GraphNode[]): {
  filesTouched: Set<string>
  toolsRun: number
  errors: number
  retries: number
} {
  const filesTouched = new Set<string>()
  let toolsRun = 0
  let errors = 0
  let retries = 0

  for (const node of nodes) {
    if (node.kind === "file" && node.data?.path) filesTouched.add(node.data.path as string)
    if (node.kind === "tool") toolsRun++
    if (node.kind === "error") errors++
    if (node.kind === "retry") retries++
  }

  return { filesTouched, toolsRun, errors, retries }
}

/** Alias for lookupNode (for backward compatibility). */
export const nodeByID = lookupNode

export function incoming(model: GraphViewData, id: string) {
  return model.edges.filter((edge) => edge.target === id)
}

export function outgoing(model: GraphViewData, id: string) {
  return model.edges.filter((edge) => edge.source === id)
}

/** Direct neighbors in either direction, with the edges that connect them. */
export function neighbors(model: GraphViewData, id: string): Subgraph {
  const edges = model.edges.filter((edge) => edge.source === id || edge.target === id)
  const nodeIDs = new Set<string>()

  for (const edge of edges) {
    nodeIDs.add(edge.source === id ? edge.target : edge.source)
  }

  return { edges, nodes: model.nodes.filter((node) => nodeIDs.has(node.id)) }
}

/**
 * B3 — step through direct neighbors in edge order. `delta` is direction only; from an id that is
 * not itself a neighbor, `]` starts at the first and `[` at the last.
 */
export function neighborStep(model: GraphViewData, id: string, delta: number): string | undefined {
  const neighbors = [
    ...new Set(
      model.edges
        .filter((edge) => edge.source === id || edge.target === id)
        .map((edge) => (edge.source === id ? edge.target : edge.source)),
    ),
  ]

  if (neighbors.length === 0) return undefined

  const index = neighbors.indexOf(id)

  if (index === -1) return delta >= 0 ? neighbors[0] : neighbors[neighbors.length - 1]

  return neighbors[(index + delta + neighbors.length) % neighbors.length]
}

/** The `part-of` chain from a node up to the session root, nearest ancestor first. */
export function ancestors(model: GraphViewData, id: string): GraphNode[] {
  const result: GraphNode[] = []
  const seen = new Set([id])
  const parents = parentIndex(model)
  let current = id

  for (;;) {
    const parent = parents.get(current)

    if (!parent || seen.has(parent)) break

    seen.add(parent)

    const node = lookupNode(model, parent)

    if (!node) break

    result.push(node)
    current = parent
  }

  return result
}

/**
 * Everything a breadcrumb selection should frame (U3.11): the node, its `part-of` descendants, the
 * members of a derived cluster, and the files those activities read or wrote. Provenance files are
 * not `part-of` a turn, so they are collected one hop out; a file shared across turns appears under
 * both. Returned in model order so the caller can fit the exact node set the bands draw.
 */
export function subtree(model: GraphViewData, id: string): GraphNode[] {
  const node = lookupNode(model, id)

  if (!node) return []

  const children = childIndex(model)
  const members = new Set([id, ...(node.derived ? (node.clusterOf ?? []) : [])])
  const queue = [...members]

  while (queue.length > 0) {
    for (const child of children.get(queue.shift()!) ?? []) {
      if (members.has(child)) continue
      members.add(child)
      queue.push(child)
    }
  }

  const hierarchy = new Set(members)
  const nodes = nodeIndex(model)

  for (const edge of model.edges) {
    if (edge.kind === "part-of") continue
    const source = nodes.get(edge.source)?.kind
    const target = nodes.get(edge.target)?.kind

    if (hierarchy.has(edge.source) && target === "file") members.add(edge.target)

    if (hierarchy.has(edge.target) && source === "file") members.add(edge.source)
  }

  return model.nodes.filter((node) => members.has(node.id))
}

/** Breadcrumb line from the session root down to the node (root first). */
export function breadcrumbs(model: GraphViewData, id: string, seen: Set<string> = new Set()): GraphNode[] {
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

function provenanceOwner(model: GraphViewData, node: GraphNode): GraphNode | undefined {
  const related = model.edges.filter((edge) => edge.source === node.id || edge.target === node.id)

  const ordered = [
    ...related.filter((edge) => PROVENANCE_EDGE_KINDS.has(edge.kind)),
    ...related.filter((edge) => !PROVENANCE_EDGE_KINDS.has(edge.kind)),
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
export function why(model: GraphViewData, id: string) {
  const sequence = sequenceIndex(model)

  return {
    incoming: incoming(model, id),
    outgoing: outgoing(model, id),
    ancestors: ancestors(model, id),
    sequenceBefore: sequence.previous.get(id),
    sequenceAfter: sequence.next.get(id),
  }
}

/** Shortest undirected path between two nodes by node IDs, or undefined when disconnected. */
export function shortestPath(model: GraphViewData, from: string, to: string): string[] | undefined {
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
export function forwardChain(model: GraphViewData, id: string): GraphNode[] {
  const result: GraphNode[] = []
  const seen = new Set([id])
  const sequence = sequenceIndex(model)
  let current = id

  for (;;) {
    const next = sequence.next.get(current)

    if (!next || seen.has(next)) break

    seen.add(next)

    const node = lookupNode(model, next)

    if (!node) break

    result.push(node)
    current = next
  }

  return result
}

/**
 * Downstream impact: nodes reachable by following `sequence`/`produces`/`writes` edges forward.
 * Returns nodes in traversal order with their edge confidence.
 * Used for the "What happened after this?" trace.
 */
export function downstreamChain(
  model: GraphViewData,
  from: string,
): Array<{ node: GraphNode; edge: GraphEdge; confidence: "explicit" | "structural" | "inferred" }> {
  const result: Array<{ node: GraphNode; edge: GraphEdge; confidence: "explicit" | "structural" | "inferred" }> = []
  const seen = new Set([from])
  const nodes = nodeIndex(model)
  const downstreamKinds = new Set<GraphEdge["kind"]>(["sequence", "produces", "writes"])

  let current = from

  for (;;) {
    // Find outgoing edges of the relevant kinds
    const edges = model.edges.filter(
      (edge) => edge.source === current && downstreamKinds.has(edge.kind),
    )

    if (edges.length === 0) break

    // For now, follow the first edge (like forwardChain)
    // In the future, this could handle forks (ambiguity display)
    const edge = edges[0]
    const nextId = edge.target

    if (seen.has(nextId)) break

    const node = nodes.get(nextId)
    if (!node) break

    seen.add(nextId)
    result.push({ node, edge, confidence: edge.confidence })
    current = nextId
  }

  return result
}

const dataString = (value: JsonValue | undefined) => Option.getOrUndefined(Schema.decodeUnknownOption(Schema.String)(value))

/** The text a search matches against: the label, the summary, and the tool's name, path, and command. */
export const searchText = (node: GraphNode) =>
  [
    node.label,
    node.summary,
    dataString(node.data?.name),
    dataString(node.data?.path),
    dataString(node.data?.command),
    node.data?.input ? JSON.stringify(node.data.input) : undefined,
  ].filter((value): value is string => !!value)

export function search(model: GraphViewData, query: string): GraphNode[] {
  return Navigation.search(model, query, searchText)
}

/**
 * A2 — ranked search. The host decides what a match is worth; the kernel orders. The scorer is
 * deliberately coarse: a label prefix beats a label hit, which beats a tool name, a path, and the
 * body. Ties keep model order (the sort is stable), so the same query reads the same every time.
 */
const rank = (node: GraphNode, needle: string): number => {
  const label = node.label.toLowerCase()
  if (label.startsWith(needle)) return 0
  if (label.includes(needle)) return 1

  const name = dataString(node.data?.name)?.toLowerCase()
  if (name?.includes(needle)) return 2

  const path = dataString(node.data?.path)?.toLowerCase()
  if (path?.includes(needle)) return 3

  return searchText(node).join("\n").toLowerCase().includes(needle) ? 4 : -1
}

export function rankedSearch(model: GraphViewData, query: string): GraphNode[] {
  return Navigation.searchBy(model, query, rank)
}

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
export function changedFiles(model: GraphViewData): ChangedFile[] {
  const nodes = nodeIndex(model)
  const byID = new Map<string, ChangedFile>()
  const order: string[] = []

  for (const edge of model.edges) {
    if (nodes.get(edge.target)?.kind !== "file") continue

    if (edge.kind !== "writes" && edge.kind !== "produces") continue

    let entry = byID.get(edge.target)

    if (!entry) {
      const node = nodes.get(edge.target)
      entry = { id: edge.target, path: dataString(node?.data?.path) ?? node?.label ?? edge.target, writers: [], readers: [] }
      byID.set(edge.target, entry)
      order.push(edge.target)
    }

    entry.writers.push(edge.source)
  }

  for (const edge of model.edges) {
    if (nodes.get(edge.target)?.kind !== "file" || !READ_EDGE_KINDS.has(edge.kind)) continue
    byID.get(edge.target)?.readers.push(edge.source)
  }

  return order.map((id) => byID.get(id)!)
}

/** The message/part a node points back to in the transcript, when it has one. */
export function openInTranscript(model: GraphViewData, id: string): TranscriptRef | undefined {
  const node = nodeByID(model, id)

  if (!node?.messageID) return undefined

  return { messageID: node.messageID, partID: node.partID }
}

/**
 * All error and retry nodes in the session, in session order with turn context.
 * Returns nodes that represent failures (errors, retries) for the failure digest window.
 */
export function failures(model: GraphViewData): Array<{
  node: GraphNode
  turnID: string
  turnLabel: string
  turnNumber: number
}> {
  const turnNumbers = new Map(model.turns.map((id, index) => [id, index + 1]))
  return model.nodes
    .filter((node) => node.kind === "error" || node.kind === "retry")
    .map((node) => {
      const turnID = node.turnID ?? model.turns[0]
      return {
        node,
        turnID,
        turnLabel: node.turnID ? lookupNode(model, node.turnID)?.label ?? turnID : "Session",
        turnNumber: turnID ? turnNumbers.get(turnID) ?? 0 : 0,
      }
    })
    .sort((a, b) => a.turnNumber - b.turnNumber)
}

/**
 * Session progress summary: turns, files touched, tools run, errors.
 * Used for the failure digest header.
 */
export function sessionProgress(model: GraphViewData): {
  turns: number
  filesTouched: number
  toolsRun: number
  errors: number
  retries: number
} {
  const { filesTouched, toolsRun, errors, retries } = countNodeKinds(model.nodes)

  return {
    turns: model.turns.length,
    filesTouched: filesTouched.size,
    toolsRun,
    errors,
    retries,
  }
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
 * Session outline: turns with their phases, for the Unified Find panel.
 * Returns turns in session order with their phase children.
 */
export function sessionOutline(model: GraphViewData): Array<{
  turnID: string
  turnLabel: string
  phases: Array<{ id: string; category: string; label: string }>
}> {
  const turnNumbers = new Map(model.turns.map((id, index) => [id, index + 1]))
  const turnMap = new Map(model.turns.map((id) => [id, nodeByID(model, id)]))
  const children = childIndex(model)

  return model.turns.map((turnID) => {
    const turnNode = turnMap.get(turnID)
    const turnLabel = turnNode?.label ?? `Turn ${turnNumbers.get(turnID)}`
    const turnChildren = children.get(turnID) ?? []
    const phases = turnChildren
      .map((id) => nodeByID(model, id))
      .filter((node): node is GraphNode => !!node && node.kind === "phase")
      .map((phase) => ({
        id: phase.id,
        // SAFETY: `category` is always a string when present per GraphPhaseData schema
        category: phase.data?.category as string ?? "unknown",
        label: phase.label,
      }))

    return { turnID, turnLabel, phases }
  })
}

/**
 * Subagent contributions: for each subagent node, count descendant files, tools, and nodes.
 * Used for inspector polish.
 */
export function subagentContributions(model: GraphViewData): Map<string, { files: number; tools: number; nodes: number }> {
  const contributions = new Map<string, { files: number; tools: number; nodes: number }>()
  const children = childIndex(model)
  const nodeIndexMap = nodeIndex(model)

  for (const node of model.nodes) {
    if (node.kind !== "subagent") continue

    const descendantIds = new Set<string>()
    const queue = [...(children.get(node.id) ?? [])]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (descendantIds.has(current)) continue
      descendantIds.add(current)
      for (const child of children.get(current) ?? []) queue.push(child)
    }

    let files = 0
    let tools = 0
    let nodes = 0

    for (const id of descendantIds) {
      const descNode = nodeIndexMap.get(id)
      if (!descNode) continue
      nodes++
      if (descNode.kind === "file") files++
      if (descNode.kind === "tool") tools++
    }

    contributions.set(node.id, { files, tools, nodes })
  }

  return contributions
}

/**
 * File relations with totalActivity = reads + writes.
 * Extended for inspector hot-file ranking.
 */
export function fileRelations(model: GraphViewData): Map<
  string,
  { reads: number; writes: number; additions: number; deletions: number; totalActivity: number }
> {
  const relations = new Map<string, { reads: number; writes: number; additions: number; deletions: number }>()

  for (const edge of model.edges) {
    if (edge.kind !== "reads" && edge.kind !== "writes") continue

    const current = relations.get(edge.target) ?? { reads: 0, writes: 0, additions: 0, deletions: 0 }

    if (edge.kind === "reads") current.reads++
    else {
      current.writes++
      if (edge.data?.additions) current.additions += edge.data.additions
      if (edge.data?.deletions) current.deletions += edge.data.deletions
    }

    relations.set(edge.target, current)
  }

  // Add totalActivity
  const result = new Map<string, { reads: number; writes: number; additions: number; deletions: number; totalActivity: number }>()
  for (const [id, rel] of relations) {
    result.set(id, { ...rel, totalActivity: rel.reads + rel.writes })
  }

  return result
}

export type TurnStats = {
  turnID: string
  turnNumber: number
  filesTouched: number
  toolsRun: number
  errors: number
  retries: number
  durationMs: number
}

/**
 * @deprecated Use `reviewChanges` from `@opencode/session-ui/graph/review` instead.
 * This re-export is kept for backward compatibility.
 */
export { reviewChanges, type ReviewChanges } from "./review"

/**
 * The execution-level subgraph for one turn (H6.2/H6.4): the turn node plus its highest-signal
 * `part-of` children, capped so a compact overlay or inline graph stays legible. Phase chips and
 * failures rank above individual tools and files; ties keep model order, so the result is stable.
 *
 * The scope is the library's (`spacegraphjs/overlays`); the signal order below is the session's.
 */
export function turnSubgraph(model: GraphViewData, turnID: string, limit = 7): Subgraph {
  const scope = extractSubgraph(model, turnID, {
    limit,
    childEdgeKind: "part-of",
    rankFn: (node) => TURN_CHILD_PRIORITY[node.kind] ?? 99,
  })

  return { nodes: [...scope.nodes], edges: [...scope.edges] }
}

/**
 * The subgraph for a subagent: the subagent node plus all its `part-of` descendants.
 * Used for fractal drill-down (Phase 10.3) when double-clicking a subagent node.
 */
export function subagentSubgraph(model: GraphViewData, subagentID: string): Subgraph {
  const scope = extractSubgraph(model, subagentID, {
    limit: 100,
    childEdgeKind: "part-of",
    rankFn: () => 0,
  })

  return { nodes: [...scope.nodes], edges: [...scope.edges] }
}

/**
 * The trace kinds the host exposes. Each trace answers one question.
 */
export type TraceKind = "why" | "led-here" | "related" | "downstream"

/** The result of classifying a trace overlay over the model. */
export type TraceOverlay = {
  /** Nodes that are the answer to the question. */
  answerIds: ReadonlySet<string>
  /** Nodes that are context for the answer (lit but not the answer). */
  contextIds: ReadonlySet<string>
  /** Edges that are part of the answer paths. */
  answerEdgeIds: ReadonlySet<string>
  /** All edges that should be visible. */
  visibleEdgeIds: ReadonlySet<string>
}

/** Compute the answer node IDs for a trace kind. */
function traceAnswerIds(model: GraphViewData, kind: TraceKind, from: string): Set<string> {
  switch (kind) {
    case "why": {
      const result = new Set<string>()
      const whyResult = why(model, from)
      for (const edge of whyResult.incoming) result.add(edge.source)
      for (const node of whyResult.ancestors) result.add(node.id)
      if (whyResult.sequenceBefore) result.add(whyResult.sequenceBefore)
      return result
    }
    case "led-here": {
      const result = new Set<string>()
      const chain = forwardChain(model, from)
      for (const node of chain) result.add(node.id)
      return result
    }
    case "related": {
      const result = new Set<string>()
      for (const edge of incoming(model, from)) result.add(edge.source)
      for (const edge of outgoing(model, from)) result.add(edge.target)
      return result
    }
    case "downstream": {
      const result = new Set<string>()
      const chain = downstreamChain(model, from)
      for (const { node } of chain) result.add(node.id)
      return result
    }
  }
}

/** Compute context nodes (ancestors of answer nodes, up to root). */
function traceContextIds(model: GraphViewData, answerIds: Set<string>): Set<string> {
  const context = new Set<string>()
  for (const id of answerIds) {
    for (const ancestor of ancestors(model, id)) {
      context.add(ancestor.id)
    }
  }
  return context
}

/** Compute answer edges: edges between answer nodes, edges from context to answer, and edges to/from the trace source. */
function traceAnswerEdgeIds(
  model: GraphViewData,
  answerIds: Set<string>,
  contextIds: Set<string>,
  from: string,
): Set<string> {
  const result = new Set<string>()
  for (const edge of model.edges) {
    const sourceInAnswer = answerIds.has(edge.source)
    const targetInAnswer = answerIds.has(edge.target)
    const sourceInContext = contextIds.has(edge.source)
    const targetInContext = contextIds.has(edge.target)
    const sourceIsFrom = edge.source === from
    const targetIsFrom = edge.target === from

    // Edge between two answer nodes
    if (sourceInAnswer && targetInAnswer) {
      result.add(edge.id)
    }
    // Edge from context to answer (the "why" edge)
    else if (sourceInContext && targetInAnswer) {
      result.add(edge.id)
    }
    // Edge from answer to context
    else if (sourceInAnswer && targetInContext) {
      result.add(edge.id)
    }
    // Edge from answer to the trace source (e.g., writes edge to file)
    else if (sourceInAnswer && targetIsFrom) {
      result.add(edge.id)
    }
    // Edge from trace source to answer (e.g., reads edge from file)
    else if (sourceIsFrom && targetInAnswer) {
      result.add(edge.id)
    }
  }
  return result
}

/** Compute visible edges: answer edges plus edges between context nodes. */
function traceVisibleEdgeIds(
  model: GraphViewData,
  answerIds: Set<string>,
  contextIds: Set<string>,
  answerEdgeIds: Set<string>,
  from: string,
): Set<string> {
  const result = new Set(answerEdgeIds)
  for (const edge of model.edges) {
    const sourceInAnswer = answerIds.has(edge.source)
    const targetInAnswer = answerIds.has(edge.target)
    const sourceInContext = contextIds.has(edge.source)
    const targetInContext = contextIds.has(edge.target)
    const sourceIsFrom = edge.source === from
    const targetIsFrom = edge.target === from

    // Edges between context nodes (to show hierarchy)
    if (sourceInContext && targetInContext && !(sourceInAnswer || targetInAnswer)) {
      result.add(edge.id)
    }
    // Edges from context to trace source
    else if (sourceInContext && targetIsFrom) {
      result.add(edge.id)
    }
    // Edges from trace source to context
    else if (sourceIsFrom && targetInContext) {
      result.add(edge.id)
    }
  }
  return result
}

/**
 * Classify a trace overlay over the model.
 * @param model The graph view data
 * @param kind The trace kind ("why" | "led-here" | "related")
 * @param from The node ID to trace from
 * @returns The trace overlay classification
 */
export function classifyTrace(model: GraphViewData, kind: TraceKind, from: string): TraceOverlay {
  const answerIds = traceAnswerIds(model, kind, from)
  const contextIds = traceContextIds(model, answerIds)
  const answerEdgeIds = traceAnswerEdgeIds(model, answerIds, contextIds, from)
  const visibleEdgeIds = traceVisibleEdgeIds(model, answerIds, contextIds, answerEdgeIds, from)

  return {
    answerIds,
    contextIds,
    answerEdgeIds,
    visibleEdgeIds,
  }
}

/**
 * Get all lit node IDs (answer + context) for a trace overlay.
 */
export function litNodeIds(overlay: TraceOverlay): ReadonlySet<string> {
  const result = new Set(overlay.answerIds)
  for (const id of overlay.contextIds) result.add(id)
  return result
}

/**
 * Check if a node is lit (answer or context) in a trace overlay.
 */
export function isLit(overlay: TraceOverlay, nodeId: string): boolean {
  return overlay.answerIds.has(nodeId) || overlay.contextIds.has(nodeId)
}

/**
 * Check if a node is an answer node in a trace overlay.
 */
export function isAnswer(overlay: TraceOverlay, nodeId: string): boolean {
  return overlay.answerIds.has(nodeId)
}

/**
 * Check if an edge is visible in a trace overlay.
 */
export function isEdgeVisible(overlay: TraceOverlay, edgeId: string): boolean {
  return overlay.visibleEdgeIds.has(edgeId)
}

/**
 * Check if an edge is an answer edge in a trace overlay.
 */
export function isAnswerEdge(overlay: TraceOverlay, edgeId: string): boolean {
  return overlay.answerEdgeIds.has(edgeId)
}

/**
 * Build a trace overlay for "Why?" — the edges that point at the node, its ancestors, and sequence predecessor.
 */
export function traceWhy(model: GraphViewData, from: string): TraceOverlay {
  return classifyTrace(model, "why", from)
}

/**
 * Build a trace overlay for "What led here?" — the forward chain in the turn's sequence.
 */
export function traceLedHere(model: GraphViewData, from: string): TraceOverlay {
  return classifyTrace(model, "led-here", from)
}

/**
 * Build a trace overlay for "Related" — incoming and outgoing neighbors.
 */
export function traceRelated(model: GraphViewData, from: string): TraceOverlay {
  return classifyTrace(model, "related", from)
}

/**
 * Build a trace overlay for "Downstream impact" — follow sequence/produces/writes edges forward.
 */
export function traceDownstream(model: GraphViewData, from: string): TraceOverlay {
  return classifyTrace(model, "downstream", from)
}

/**
 * Step through lit nodes in a trace overlay.
 * @param overlay The trace overlay
 * @param current The current node ID (or undefined for first)
 * @param direction 1 for next, -1 for previous
 * @returns The next/previous lit node ID, or undefined
 */
export function stepLitNode(
  overlay: TraceOverlay,
  current: string | undefined,
  direction: 1 | -1,
): string | undefined {
  const litIds = Array.from(litNodeIds(overlay))
  if (litIds.length === 0) return undefined

  if (!current) {
    return direction === 1 ? litIds[0] : litIds[litIds.length - 1]
  }

  const index = litIds.indexOf(current)
  if (index === -1) {
    return direction === 1 ? litIds[0] : litIds[litIds.length - 1]
  }

  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= litIds.length) return undefined
  return litIds[nextIndex]
}

/**
 * Copy a trace overlay as a markdown outline using breadcrumbs for each lit node.
 */
export function copyTraceAsOutline(
  model: GraphViewData,
  overlay: TraceOverlay,
  breadcrumbs: (model: GraphViewData, id: string) => GraphNode[],
): string {
  const lines: string[] = []
  const litIds = Array.from(litNodeIds(overlay))

  for (const id of litIds) {
    const node = breadcrumbs(model, id)
    if (node.length === 0) continue

    const path = node.map((n) => n.label).join(" › ")
    const prefix = overlay.answerIds.has(id) ? "▸ " : "  "
    lines.push(`${prefix}${path}`)
  }

  return lines.join("\n")
}
