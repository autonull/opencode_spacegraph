import type { EdgeKind, GraphEdge, GraphModel, GraphNode, NodeKind, ZoomLevel } from "./model"

/**
 * Semantic zoom policy (§5.4). The model carries each node's own `minLevel`; this table supplies the
 * fallback for kinds whose node did not set one and the edge/DOM budgets that the model cannot own.
 */
export const LEVEL_RANK: Record<ZoomLevel, number> = { overview: 0, execution: 1, detail: 2 }

const KIND_MIN_LEVEL: Record<NodeKind, ZoomLevel> = {
  session: "overview",
  turn: "overview",
  phase: "overview",
  subagent: "overview",
  error: "overview",
  retry: "overview",
  message: "execution",
  tool: "execution",
  file: "execution",
  result: "execution",
  diff: "execution",
  approval: "execution",
  compaction: "execution",
  reasoning: "detail",
  notice: "detail",
}

const EDGE_MIN_LEVEL: Record<EdgeKind, ZoomLevel> = {
  "part-of": "overview",
  delegates: "overview",
  evidence: "overview",
  sequence: "execution",
  produces: "execution",
  reads: "execution",
  writes: "execution",
  searches: "execution",
  references: "execution",
  compacts: "execution",
  "inferred-cause": "detail",
}

/** DOM activity cards budget per level (§5.4); above the cap the UI falls back to simple labels. */
export const DOM_BUDGET: Record<ZoomLevel, number> = { overview: 12, execution: 40, detail: 24 }

export type LabelMode = "scale" | "constant" | "hide"

/** Labels keep a constant screen size at every level (§5.4); decluttering is a renderer concern. */
export function labelMode(_level: ZoomLevel): LabelMode {
  return "constant"
}

/** Phase clusters are collapsed chips at overview and expanded from execution on (§5.4). */
export function isClusterExpanded(level: ZoomLevel) {
  return level !== "overview"
}

export function domBudget(level: ZoomLevel) {
  return DOM_BUDGET[level]
}

export function minLevelOf(node: GraphNode): ZoomLevel {
  return node.minLevel ?? KIND_MIN_LEVEL[node.kind]
}

export function isVisibleAt(node: GraphNode, level: ZoomLevel) {
  return LEVEL_RANK[minLevelOf(node)] <= LEVEL_RANK[level]
}

/** Nodes visible at a level, in model order. Hidden nodes must not be interactive. */
export function nodesAtLevel(model: GraphModel, level: ZoomLevel): GraphNode[] {
  return model.nodes.filter((node) => isVisibleAt(node, level))
}

export function visibleNodeIDs(model: GraphModel, level: ZoomLevel): Set<string> {
  return new Set(nodesAtLevel(model, level).map((node) => node.id))
}

/** The member count a phase or cluster chip shows at overview. */
export function clusterCount(node: GraphNode) {
  return node.clusterOf?.length ?? 0
}

/**
 * Edges visible at a level. Both endpoints must be visible, so an edge is never drawn to a hidden
 * node. At execution a focus narrows the neighborhood to the selected node plus its sequence and
 * hierarchy context; overview keeps only hierarchy and failure/evidence edges; detail keeps all.
 */
export function edgesAtLevel(model: GraphModel, level: ZoomLevel, focus?: string): GraphEdge[] {
  const visible = visibleNodeIDs(model, level)
  const kindByID = new Map(model.nodes.map((node) => [node.id, node.kind]))

  const allowed = model.edges.filter(
    (edge) =>
      LEVEL_RANK[EDGE_MIN_LEVEL[edge.kind]] <= LEVEL_RANK[level] &&
      // RF.4: hierarchy is demoted to the turn bands at execution, so the root does not fan out.
      !(level === "execution" && edge.kind === "part-of") &&
      // LE.6: a turn→session `part-of` wire spans the whole canvas at overview and adds nothing (the
      // columns and bands already group a turn), so the root is not wired at overview.
      !(
        level === "overview" &&
        edge.kind === "part-of" &&
        (kindByID.get(edge.source) === "session" || kindByID.get(edge.target) === "session")
      ) &&
      visible.has(edge.source) &&
      visible.has(edge.target),
  )

  if (level !== "execution" || !focus || !visible.has(focus)) return allowed

  const neighborhood = new Set([focus])

  for (const edge of allowed) {
    if (edge.source === focus) neighborhood.add(edge.target)

    if (edge.target === focus) neighborhood.add(edge.source)
  }

  return allowed.filter(
    (edge) => neighborhood.has(edge.source) || neighborhood.has(edge.target) || edge.kind === "part-of",
  )
}
