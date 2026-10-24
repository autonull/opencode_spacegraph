import type { GraphNode, GraphViewData } from "@opencode/session-ui/graph"
import { ancestors, incoming, outgoing, forwardChain, why } from "@opencode/session-ui/graph"

/** The trace kinds the host exposes. Each trace answers one question. */
export type TraceKind = "why" | "led-here" | "related"

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