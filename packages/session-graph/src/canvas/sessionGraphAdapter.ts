import { ModelAdapter, type AdapterConfig, type AdapterPosition } from "@spacegraphjs/adapter"
import type { NodeStatus, RenderEdge, RenderNode } from "@spacegraphjs/renderer"
import {
  clusterCount,
  domBudget,
  edgesAtLevel,
  isClusterExpanded,
  neighbors,
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
  subagent: "card",
  result: "card",
  error: "badge",
  retry: "badge",
  compaction: "panel",
  notice: "panel",
  diff: "card",
  approval: "badge",
}

const NODE_STATUS: Record<GraphNode["status"], NodeStatus> = {
  pending: "pending",
  running: "running",
  success: "success",
  failed: "error",
  interrupted: "warning",
  neutral: "neutral",
}

/**
 * LE.2 — structural kinds (`session`/`turn`/`phase`/`error`/`retry`/`approval`) are chrome, not
 * activity: they render as compact DOM panels so they read with the theme's surface/border/text
 * instead of a near-invisible vector box. They never consume the activity card budget.
 */
const STRUCTURAL_KINDS = new Set<NodeKind>(["session", "turn", "phase", "error", "retry", "approval"])

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
      // T3.6: the session identity of the root, so an exported map names its session.
      sessionID: node.data?.sessionID,
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
   * Each band is a translucent rounded box sized to its cluster bounds, so the canvas shows where a
   * turn starts and ends and which activity a phase groups.
   */
  buildBands(
    model: GraphModel,
    level: ZoomLevel,
    positions: ReadonlyMap<string, AdapterPosition>,
    renderBand: (node: GraphNode, count: number, bounds: ClusterBounds) => string,
    visible: ReadonlySet<string>,
  ): RenderNode[] {
    const bands: RenderNode[] = []

    // Bands wrap the members actually drawn at this level, so an overview turn band frames its phase
    // chips rather than the full execution extent (which is empty at that level).
    const boundsOf = (ids: readonly string[]): ClusterBounds | undefined => {
      const points = ids.flatMap((id) => {
        const point = positions.get(id)
        return visible.has(id) && point ? [point] : []
      })
      if (points.length === 0) return undefined

      return {
        min: { x: Math.min(...points.map((point) => point.x)), y: Math.min(...points.map((point) => point.y)), z: 0 },
        max: { x: Math.max(...points.map((point) => point.x)), y: Math.max(...points.map((point) => point.y)), z: 0 },
      }
    }

    const emit = (node: GraphNode, ids: readonly string[]) => {
      const drawn = ids.filter((id) => visible.has(id))
      if (drawn.length === 0) return
      const bounds = boundsOf(drawn)
      if (!bounds) return
      const width = bounds.max.x - bounds.min.x + this.geometry.bandPadding * 2
      const height = bounds.max.y - bounds.min.y + this.geometry.bandPadding * 2
      bands.push({
        id: `band:${node.id}`,
        kind: "band",
        label: node.label,
        shape: "panel",
        interactive: false,
        html: renderBand(node, drawn.length, bounds),
        size: [width, height, 0],
        position: [(bounds.min.x + bounds.max.x) / 2, (bounds.min.y + bounds.max.y) / 2, 0],
        // T1.3: bands are backdrops. Keep them flat on the content plane and facing the camera, so a
        // tilted depth treatment does not turn a large band into a trapezoid across the cards.
        data: { band: node.kind === "turn" ? "turn" : "phase", count: drawn.length, cluster: node.id, billboard: true },
      })
    }

    // LE.3: a turn band would span every lane a turn touches — at overview the phase chips sit on one
    // row and the delegated/message members sit lanes away, so the band is a large near-empty box. The
    // columns already group the turn there, so bands are suppressed at overview and kept where the
    // members fill the lanes (execution/detail).
    if (level !== "overview")
      for (const turnID of model.turns) {
        const turn = model.nodes.find((node) => node.id === turnID)
        if (!turn) continue
        emit(turn, model.nodes.filter((node) => node.turnID === turnID).map((node) => node.id))
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
    const byID = new Map(model.nodes.map((node) => [node.id, node]))
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
