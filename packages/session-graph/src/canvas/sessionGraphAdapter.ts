import { ModelAdapter, type AdapterConfig, type AdapterPosition, type BuildOptions } from "@spacegraphjs/adapter"
import type { NodeStatus, RenderEdge, RenderModel, RenderNode } from "@spacegraphjs/renderer"
import {
  STRUCTURAL_KINDS,
  NODE_SHAPE,
  clusterCount,
  domBudget,
  edgesAtLevel,
  isClusterExpanded,
  isSummaryOrLogLayout,
  neighbors,
  nodeIndex,
  nodeSize,
  nodesAtLevel,
  summaryUnits,
  type ClusterBounds,
  type EdgeKind,
  type GraphEdge,
  type GraphViewData,
  type GraphNode,
  type Layout,
  type NodeKind,
  type ZoomLevel,
} from "@opencode/session-ui/graph"
import { BAND_PADDING } from "./constants"

type Shape = NonNullable<RenderNode["shape"]>

const NODE_STATUS: Record<GraphNode["status"], NodeStatus> = {
  pending: "pending",
  running: "running",
  success: "success",
  failed: "error",
  interrupted: "warning",
  neutral: "neutral",
}

/** LE.13: provenance edges that a file-first lens rebases onto the owning turn node. */
const BUNDLED_KINDS = new Set<EdgeKind>(["writes", "reads", "searches", "references", "produces"])

export type SessionGraphAdapterConfig = AdapterConfig<GraphNode, GraphEdge, ZoomLevel, GraphViewData>

/**
 * The session's answer to the renderer contract: the vocabulary (kinds, statuses, structural
 * kinds), the level policy, the swimlane bands, and the provenance bundling. The pipeline itself
 * lives in the library's `ModelAdapter`.
 */
export class SessionGraphAdapter extends ModelAdapter<GraphNode, GraphEdge, ZoomLevel, GraphViewData> {
  constructor(config: SessionGraphAdapterConfig = {}) {
    const baseConfig: AdapterConfig<GraphNode, GraphEdge, ZoomLevel, GraphViewData> = {
      cardBudget: (level: ZoomLevel) => domBudget(level),
      nodeFilter: (model: GraphViewData, level: ZoomLevel) => nodesAtLevel(model, level),
      edgeFilter: (model: GraphViewData, level: ZoomLevel, focus: string | undefined) => edgesAtLevel(model, level, focus),
      isClusterExpanded: (level: ZoomLevel) => isClusterExpanded(level),
      neighbors: (model: GraphViewData, id: string) => neighbors(model, id).nodes.map((node) => node.id),
      nodeSizeFn: (node: GraphNode) => nodeSize(node),
      geometry: { bandPadding: BAND_PADDING },
      renderCardTemplate: config.renderCardTemplate,
    }
    super({ ...baseConfig, ...config })
  }

  /**
   * Returns the nodes that should be rendered for a given layout and level.
   * This replaces host-side filtering in buildRenderModelHelpers.ts.
   */
  getNodesForLayout(model: GraphViewData, level: ZoomLevel, layout: Layout): GraphNode[] {
    if (isSummaryOrLogLayout(layout)) {
      const units = summaryUnits(model, level)
      return model.nodes.filter((node) => units.has(node.id))
    }
    return nodesAtLevel(model, level)
  }

  /**
   * Override build to use layout-aware node filtering.
   * The host passes the layout via options.layout.
   */
  build(model: GraphViewData, options: BuildOptions<GraphNode, ZoomLevel>): RenderModel {
    const layout = (options as BuildOptions<GraphNode, ZoomLevel> & { layout?: Layout }).layout ?? "lanes"
    const filteredModel = {
      ...model,
      nodes: this.getNodesForLayout(model, options.level ?? "overview", layout),
    }
    return super.build(filteredModel, options)
  }

  nodeShape(node: GraphNode): Shape {
    return NODE_SHAPE[node.kind]
  }

  nodeStatus(node: GraphNode): NodeStatus {
    return NODE_STATUS[node.status]
  }

  isStructuralKind(kind: NodeKind): boolean {
    return STRUCTURAL_KINDS.has(kind)
  }

  /** Renderer-facing affordance data only; detail content is read back from the model via selectors. */
  nodeData(node: GraphNode, level: ZoomLevel, dimmed: boolean): Record<string, unknown> {
    const isPhase = node.kind === "phase"
    return {
      turnID: node.turnID,
      messageID: node.messageID,
      partID: node.partID,
      toolID: node.toolID,
      time: node.time,
      derived: node.derived ?? false,
      dimmed,
      // T3.6: the session identity of the root, so an exported map names its session. T6.5: so does
      // the lineage, so an exported map says where the session came from.
      sessionID: node.data?.sessionID,
      forkedFrom: node.data?.forkedFrom,
      forkBoundary: node.data?.forkBoundary,
      parentSessionID: node.data?.parentSessionID,
      // Phase-specific fields
      category: isPhase ? node.data?.category : undefined,
      count: isPhase ? clusterCount(node) : undefined,
      expanded: isPhase ? isClusterExpanded(level) : undefined,
    }
  }

  /**
   * Edge strength by kind/confidence (RF.4): the sequence spine and provenance are strong; hierarchy
   * and inferred links are dashed, and hierarchy is dropped at execution in `edgesAtLevel`.
   */
  toRenderEdge(edge: GraphEdge, _level: ZoomLevel): RenderEdge {
    const hierarchy = edge.kind === "part-of" || edge.kind === "compacts"
    const dashed = edge.confidence === "inferred" || hierarchy

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      kind: edge.kind,
      label: edge.label,
      confidence: edge.confidence,
      style: dashed ? "dashed" : "solid",
      directed: !hierarchy,
      visible: true,
    }
  }

  /**
   * RF.5 — turn swimlanes and phase groups drawn behind the content as non-interactive DOM bands.
   * Each band is a translucent rounded box sized to the boxes of the members it groups, so the
   * canvas shows where a turn starts and ends and which activity a phase groups. The band is padded
   * around its members, which leaves the header its own slot above them (T1.17).
   */
  buildBands(
    model: GraphViewData,
    level: ZoomLevel,
    positions: ReadonlyMap<string, AdapterPosition>,
    renderBand: (node: GraphNode, count: number, bounds: ClusterBounds) => string,
    visible: ReadonlySet<string>,
  ): RenderNode[] {
    const bands: RenderNode[] = []
    const byID = this.nodeIndex(model)

    const emit = (node: GraphNode, ids: readonly string[]) => {
      const drawn = ids.filter((id) => visible.has(id))
      if (drawn.length === 0) return
      const box = this.bandBox(model, drawn, positions, visible)
      if (!box) return
      bands.push({
        id: `band:${node.id}`,
        kind: "band",
        label: node.label,
        shape: "group",
        interactive: true,
        html: renderBand(node, drawn.length, box),
        size: [box.max.x - box.min.x, box.max.y - box.min.y, 0],
        position: [(box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, 0],
        data: {
          band: node.kind === "turn" ? "turn" : "phase",
          count: drawn.length,
          cluster: node.id,
          members: drawn,
          group: true,
          billboard: true,
        },
      })
    }

    // Turn bands: suppressed at overview (LE.3), built in one pass (T6.6)
    if (level !== "overview") {
      const byTurn = new Map<string, GraphNode[]>()

      for (const node of model.nodes) {
        if (!node.turnID) continue
        const bucket = byTurn.get(node.turnID)
        if (bucket) bucket.push(node)
        else byTurn.set(node.turnID, [node])
      }

      for (const turnID of model.turns) {
        const turn = byID.get(turnID)
        if (turn) emit(turn, (byTurn.get(turnID) ?? []).map((n) => n.id))
      }
    }

    // Phase bands: only when expanded at this level
    for (const node of model.nodes) {
      if (node.kind === "phase" && node.clusterOf && isClusterExpanded(level)) {
        emit(node, node.clusterOf)
      }
      // File groups, error groups, subagent groups, compaction groups, facet groups
      if ((node.kind === "file-group" || node.kind === "error-group" || node.kind === "subagent-group" || node.kind === "compaction-group" || node.kind === "facet-group") && node.clusterOf && isClusterExpanded(level)) {
        emit(node, node.clusterOf)
      }
    }

    return bands
  }

  /**
   * LE.13 — provenance bundling. Every per-activity edge into a `file` is rebased to the owning turn
   * node and deduped, so a file links to a short per-turn spine (one connector per turn) instead of one
   * crossing wire per writer/reader. Edges that do not target a file, or whose activity has no turn, are
   * kept verbatim. The rebased id is stable (`bundle:${source}:${target}:${kind}`) for renderer diffing.
   */
  bundleEdges(model: GraphViewData, edges: readonly GraphEdge[]): GraphEdge[] {
    const byID = nodeIndex(model)
    const turnOf = (id: string) => byID.get(id)?.turnID ?? id
    const seen = new Set<string>()
    const bundled: GraphEdge[] = []

    for (const edge of edges) {
      const target = byID.get(edge.target)
      if (!BUNDLED_KINDS.has(edge.kind) || target?.kind !== "file") {
        bundled.push(edge)
        continue
      }

      const source = turnOf(edge.source)
      const key = `${source}:${edge.target}:${edge.kind}`
      if (seen.has(key)) continue
      seen.add(key)

      bundled.push(source === edge.source ? edge : { ...edge, id: `bundle:${key}`, source })
    }

    return bundled
  }
}

/** Factory for creating session graph adapters with optional DOM node cap. */
function createSessionGraphAdapter(domNodeCap?: number): SessionGraphAdapter {
  return new SessionGraphAdapter(
    domNodeCap
      ? {
          cardBudget: (level) => Math.min(domBudget(level), domNodeCap),
        }
      : undefined,
  )
}

/** The default adapter: the SpaceGraph renderer draws every card the level's budget allows. */
export const sessionGraphAdapter = createSessionGraphAdapter()