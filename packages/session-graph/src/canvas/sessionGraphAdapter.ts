import { ModelAdapter, type AdapterConfig, type AdapterPosition } from "@spacegraphjs/adapter"
import type { NodeStatus, RenderEdge, RenderNode } from "@spacegraphjs/renderer"
import {
  STRUCTURAL_KINDS,
  clusterCount,
  domBudget,
  edgesAtLevel,
  isClusterExpanded,
  neighbors,
  nodeIndex,
  nodeSize,
  nodesAtLevel,
  type ClusterBounds,
  type EdgeKind,
  type GraphEdge,
  type GraphModel,
  type GraphNode,
  type NodeKind,
  type ZoomLevel,
} from "@opencode/session-ui/graph"

type Shape = NonNullable<RenderNode["shape"]>

/**
 * The semantic level decides which nodes exist; the shape decides how the renderer draws one. Rich
 * activity kinds become DOM `card`s (host markup), structural kinds stay vector `panel`/`badge`, and
 * unclassified tools fall to a `badge` so nothing silently disappears.
 */
const NODE_SHAPE: Record<NodeKind, Shape> = {
  session: "panel",
  turn: "panel",
  phase: "panel",
  message: "card",
  reasoning: "panel",
  tool: "card",
  file: "card",
  directory: "card",
  subagent: "card",
  result: "card",
  error: "badge",
  retry: "badge",
  compaction: "panel",
  notice: "panel",
  diff: "card",
  // T19-T26 derived kinds
  package: "card",
  commit: "card",
  branch: "card",
  symbol: "card",
  test: "card",
  "test-run": "card",
  process: "card",
  port: "card",
  issue: "card",
}

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

export type SessionGraphAdapterConfig = AdapterConfig<GraphNode, GraphEdge, ZoomLevel, GraphModel>

/**
 * The session's answer to the renderer contract: the vocabulary (kinds, statuses, structural
 * kinds), the level policy, the swimlane bands, and the provenance bundling. The pipeline itself
 * lives in the library's `ModelAdapter`.
 */
export class SessionGraphAdapter extends ModelAdapter<GraphNode, GraphEdge, ZoomLevel, GraphModel> {
  constructor(config: SessionGraphAdapterConfig = {}) {
    super({
      cardBudget: (level) => domBudget(level),
      nodeFilter: (model, level) => nodesAtLevel(model, level),
      edgeFilter: (model, level, focus) => edgesAtLevel(model, level, focus),
      isClusterExpanded: (level) => isClusterExpanded(level),
      neighbors: (model, id) => neighbors(model, id).nodes.map((node) => node.id),
      // T1.17: the box each node occupies, so a band is sized around the cards it groups.
      nodeSizeFn: (node) => nodeSize(node),
      ...config,
    })
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
      category: node.kind === "phase" ? node.data?.category : undefined,
      count: node.kind === "phase" ? clusterCount(node) : undefined,
      expanded: node.kind === "phase" ? isClusterExpanded(level) : undefined,
    }
  }

  /**
   * Edge strength by kind/confidence (RF.4): the sequence spine and provenance are strong; hierarchy
   * and inferred links are dashed, and hierarchy is dropped at execution in `edgesAtLevel`.
   */
  toRenderEdge(edge: GraphEdge, _level: ZoomLevel): RenderEdge {
    const inferred = edge.confidence === "inferred"
    const hierarchy = edge.kind === "part-of" || edge.kind === "compacts"
    const dashed = inferred || hierarchy

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
    model: GraphModel,
    level: ZoomLevel,
    positions: ReadonlyMap<string, AdapterPosition>,
    renderBand: (node: GraphNode, count: number, bounds: ClusterBounds) => string,
    visible: ReadonlySet<string>,
  ): RenderNode[] {
    const bands: RenderNode[] = []

    const emit = (node: GraphNode, ids: readonly string[]) => {
      const drawn = ids.filter((id) => visible.has(id))
      if (drawn.length === 0) return
      const box = this.bandBox(model, drawn, positions, visible)
      if (!box) return
      bands.push({
        id: `band:${node.id}`,
        kind: "band",
        label: node.label,
        shape: "panel",
        interactive: false,
        html: renderBand(node, drawn.length, box),
        size: [box.max.x - box.min.x, box.max.y - box.min.y, 0],
        position: [(box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, 0],
        // T1.3: bands are backdrops. Keep them flat on the content plane and facing the camera, so a
        // tilted depth treatment does not turn a large band into a trapezoid across the cards.
        data: { band: node.kind === "turn" ? "turn" : "phase", count: drawn.length, cluster: node.id, billboard: true },
      })
    }

    // LE.3: a turn band would span every lane a turn touches — at overview the phase chips sit on one
    // row and the delegated/message members sit lanes away, so the band is a large near-empty box. The
    // columns already group the turn there, so bands are suppressed at overview and kept where the
    // members fill the lanes (execution/detail).
    if (level !== "overview") {
      // One pass over the model builds the per-turn buckets: a filter per turn was quadratic, and a
      // long session paid for it in the render-model build (T6.6).
      const byTurn = new Map<string, GraphNode[]>()

      for (const node of model.nodes) {
        if (!node.turnID) continue
        const bucket = byTurn.get(node.turnID)

        if (bucket) bucket.push(node)
        else byTurn.set(node.turnID, [node])
      }

      const byID = this.nodeIndex(model)

      for (const turnID of model.turns) {
        const turn = byID.get(turnID)
        if (!turn) continue
        emit(turn, (byTurn.get(turnID) ?? []).map((node) => node.id))
      }
    }

    for (const node of model.nodes) {
      if (node.kind !== "phase" || !node.clusterOf) continue
      if (!isClusterExpanded(level)) continue
      emit(node, node.clusterOf)
    }

    return bands
  }

  /**
   * LE.13 — provenance bundling. Every per-activity edge into a `file` is rebased to the owning turn
   * node and deduped, so a file links to a short per-turn spine (one connector per turn) instead of one
   * crossing wire per writer/reader. Edges that do not target a file, or whose activity has no turn, are
   * kept verbatim. The rebased id is stable (`bundle:${source}:${target}:${kind}`) for renderer diffing.
   */
  bundleEdges(model: GraphModel, edges: readonly GraphEdge[]): GraphEdge[] {
    const byID = nodeIndex(model)
    // `GraphNode.turnID` is already the owning turn node id (`turn:<opener>`), not the opener message id.
    const turnOf = (id: string) => byID.get(id)?.turnID ?? id
    const seen = new Set<string>()
    const bundled: GraphEdge[] = []

    for (const edge of edges) {
      if (!BUNDLED_KINDS.has(edge.kind) || byID.get(edge.target)?.kind !== "file") {
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

/**
 * The DOM budget of the Cytoscape renderer: it declares `maxDomNodes: 20` and draws the first nodes
 * that carry markup. The host must not import a renderer package at module scope, so the number is
 * declared here and a test checks it against the renderer's own capabilities.
 */
export const CYTOSCAPE_DOM_NODES = 20

/**
 * The Cytoscape policy: the same session vocabulary, with the DOM card budget capped at what the
 * renderer declares it can draw. The model then never promises more cards than the canvas shows.
 *
 * It is not live yet: the render model is the camera's frame of reference, so it must be built
 * *before* the renderer mounts. The host has no renderer switch (the app always asks for the
 * SpaceGraph renderer), so the adapter is selected when it does. Switching it per mounted renderer
 * was tried and reverted — the model changed after the fit, and the Cytoscape frames drifted.
 */
export class CytoscapeSessionAdapter extends SessionGraphAdapter {
  constructor() {
    super({ cardBudget: (level) => Math.min(domBudget(level), CYTOSCAPE_DOM_NODES) })
  }
}

/** The default adapter: the SpaceGraph renderer draws every card the level's budget allows. */
export const sessionGraphAdapter = new SessionGraphAdapter()

/** The Cytoscape adapter: the same model, with the renderer's DOM cap applied to the card budget. */
export const cytoscapeSessionAdapter = new CytoscapeSessionAdapter()
