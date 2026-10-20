import { Levels, type LabelMode, type LevelConfig } from "spacegraphjs/levels"
import type { EdgeKind, GraphEdge, GraphModel, GraphNode, NodeKind, ZoomLevel } from "./model"

/**
 * Semantic zoom policy (§5.4). The model carries each node's own `minLevel`; this table supplies the
 * fallback for kinds whose node did not set one and the edge/DOM budgets that the model cannot own.
 * The library owns the filtering; this table is the session's answer to "what does a level mean".
 */
const LEVELS: LevelConfig<ZoomLevel, NodeKind, EdgeKind, GraphNode, GraphEdge> = {
  levelRank: { overview: 0, execution: 1, detail: 2 },
  kindMinLevel: {
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
    compaction: "execution",
    reasoning: "detail",
    notice: "detail",
  },
  edgeMinLevel: {
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
  },
  domBudget: { overview: 12, execution: 40, detail: 24 },
  isClusterExpanded: (level) => level !== "overview",
  edgeFilterFn: (model, level, focus, candidates, visible) => {
    const kindByID = new Map(model.nodes.map((node) => [node.id, node.kind]))

    const allowed = candidates.filter(
      (edge) =>
        // RF.4: hierarchy is demoted to the turn bands at execution, so the root does not fan out.
        !(level === "execution" && edge.kind === "part-of") &&
        // LE.6: a turn→session `part-of` wire spans the whole canvas at overview and adds nothing (the
        // columns and bands already group a turn), so the root is not wired at overview.
        !(
          level === "overview" &&
          edge.kind === "part-of" &&
          (kindByID.get(edge.source) === "session" || kindByID.get(edge.target) === "session")
        ),
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
  },
}

export const LEVEL_RANK = LEVELS.levelRank

export function minLevelOf(node: GraphNode) {
  return Levels.minLevelOf(node, LEVELS)
}

export function isVisibleAt(node: GraphNode, level: ZoomLevel) {
  return Levels.isVisibleAt(node, level, LEVELS)
}

export function nodesAtLevel(model: GraphModel, level: ZoomLevel) {
  return Levels.nodesAtLevel(model, level, LEVELS)
}

export function visibleNodeIDs(model: GraphModel, level: ZoomLevel) {
  return Levels.visibleNodeIDs(model, level, LEVELS)
}

export function edgesAtLevel(model: GraphModel, level: ZoomLevel, focus?: string) {
  return Levels.edgesAtLevel(model, level, focus, LEVELS)
}

export function domBudget(level: ZoomLevel) {
  return Levels.domBudget(level, LEVELS)
}

/** Phase clusters are collapsed chips at overview and expanded from execution on (§5.4). */
export function isClusterExpanded(level: ZoomLevel) {
  return LEVELS.isClusterExpanded(level)
}

/** The member count a phase or cluster chip shows at overview. */
export function clusterCount(node: GraphNode) {
  return Levels.clusterCount(node)
}

/** Labels keep a constant screen size at every level (§5.4); decluttering is a renderer concern. */
export function labelMode(level: ZoomLevel): LabelMode {
  return Levels.labelMode(level)
}

export type { LabelMode }
