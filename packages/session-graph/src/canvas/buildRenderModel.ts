import type { NodeStatus, RenderEdge, RenderModel, RenderNode } from "@spacegraphjs/renderer"
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
  type Position,
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

const ZERO: Position = { x: 0, y: 0, z: 0 }

/** A collapsed derived cluster draws as a compact counted chip rather than a bare panel label. */
const CHIP_SIZE: [number, number, number] = [132, 44, 0]

/**
 * LE.2 — structural kinds (`session`/`turn`/`phase`/`error`/`retry`/`approval`) are chrome, not
 * activity: they render as compact DOM panels so they read with the theme's surface/border/text
 * instead of a near-invisible vector box. They never consume the activity card budget.
 */
const STRUCTURAL_KINDS = new Set<NodeKind>(["session", "turn", "phase", "error", "retry", "approval"])

/** Minimum legible footprint for a structural panel. */
const PANEL_SIZE: [number, number, number] = [132, 44, 0]

/** Opacity applied to a node outside the selected neighborhood at execution (RF.10). */
const DIM_OPACITY = 0.3

/** Padding added to a cluster band so members sit inside it. */
const BAND_PAD = 28

/** LE.10 lane-label chip footprint and the gap between it and the leftmost content. */
const LANE_LABEL_SIZE: [number, number, number] = [132, 28, 0]

const LANE_GUTTER = 20

/** Summary row/column captions; wide enough for "Hierarchy" and a tool name. */
const AXIS_LABEL_SIZE: [number, number, number] = [132, 24, 0]

/** Host-owned, sanitized markup for a `card`. Text must be escaped by the template. */
export type CardTemplate = (node: GraphNode, level: ZoomLevel) => string

/** Host-owned markup for a turn/phase swimlane band. */
export type BandTemplate = (node: GraphNode, count: number, bounds: ClusterBounds) => string

export type BuildRenderModelOptions = {
  level: ZoomLevel
  positions: ReadonlyMap<string, Position>
  /** Execution-level focus: narrows edges to the selected node's neighborhood (§5.4). */
  focus?: string
  /** Enables turn/phase swimlane bands (RF.5); their bounds wrap the members visible at the level. */
  bands?: boolean
  /** Emits edges; the ribbon/matrix representations are edge-free summaries (LE.8/LE.9). */
  edges?: boolean
  /**
   * LE.13: bundles per-activity provenance edges to their owning turn node, so a file is connected to
   * a short turn spine instead of one crossing wire per reader/writer. The file-first lens enables it.
   */
  bundle?: boolean
  /** Overrides the per-level DOM card budget; cards above it fall back to labels. */
  cardBudget?: number
  /** Replaces the default card markup, e.g. with localized copy. */
  renderCard?: CardTemplate
  /** Replaces the default swimlane band markup. */
  renderBand?: BandTemplate
  /**
   * LE.10: localized lane labels (with the lanes layout's Y anchors) drawn as a non-interactive
   * gutter to the left of the content, so the spatial grammar is visible.
   */
  laneLabels?: readonly { id: string; label: string; y: number }[]
  /**
   * T1.11: non-interactive row/column captions for the summary representations, positioned in layout
   * space by the host (it owns the turn/category axes).
   */
  axisLabels?: readonly { id: string; label: string; x: number; y: number; role: "row" | "column" }[]
}

/**
 * Pure `GraphModel` + level + positions → `RenderModel` (§5.4). Rendering-agnostic: it imports only
 * the contract, never a backend. It hides nodes below the level, emits absolute positions, maps
 * statuses, and attaches sanitized card markup for the DOM budget, above which cards degrade to dots.
 */
export function buildRenderModel(model: GraphModel, options: BuildRenderModelOptions): RenderModel {
  const { level, positions, focus } = options
  const budget = options.cardBudget ?? domBudget(level)
  const renderCard = options.renderCard ?? defaultCard
  const renderBand = options.renderBand ?? defaultBand

  let cards = 0

  // RF.10: at execution a selected node dims everything outside its neighborhood (the edges are
  // already narrowed by `edgesAtLevel`), so the neighbourhood reads without hunting.
  const lit = focus ? new Set([focus, ...neighbors(model, focus).nodes.map((node) => node.id)]) : undefined

  const content = nodesAtLevel(model, level).map((node): RenderNode => {
    const position = positions.get(node.id) ?? ZERO
    const shape = NODE_SHAPE[node.kind]
    const chip = isClusterChip(node, level)
    const structural = STRUCTURAL_KINDS.has(node.kind)
    const asCard = (shape === "card" || chip || structural) && (structural || cards < budget)
    const dimmed = lit ? !lit.has(node.id) : false

    if (asCard && !structural) cards += 1

    // Cards fade through their host markup; vector panels/badges have no markup, so they carry the
    // opacity for the renderer to apply to the node itself. It is sent even when lit because the core
    // merges node data, so a stale dim would otherwise stick.
    const data = nodeData(node, level, dimmed)
    if (!asCard) data.opacity = dimmed ? DIM_OPACITY : 1

    return {
      id: node.id,
      kind: node.kind,
      label: node.label,
      summary: node.summary,
      status: NODE_STATUS[node.status],
      shape: asCard ? "card" : shape === "card" ? "dot" : shape,
      html: asCard ? wrapDim(renderCard(node, level), dimmed) : undefined,
      size: chip || structural ? (chip ? CHIP_SIZE : PANEL_SIZE) : undefined,
      position: [position.x, position.y, position.z],
      data,
    }
  })

  const visible = new Set(content.map((node) => node.id))
  const bands = options.bands ? buildBands(model, level, positions, renderBand, visible) : []
  const lanes = buildLaneLabels(options.laneLabels, content)
  const axes = (options.axisLabels ?? []).map(
    (label): RenderNode => ({
      id: `axis:${label.id}`,
      kind: "lane",
      label: label.label,
      shape: "panel",
      interactive: false,
      html: `<div data-axis="${label.role}" style="display:flex;align-items:center;height:100%;box-sizing:border-box;padding:0 8px;font-family:inherit;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(label.label)}</div>`,
      size: [AXIS_LABEL_SIZE[0], AXIS_LABEL_SIZE[1], AXIS_LABEL_SIZE[2]],
      position: [label.x, label.y, ZERO.z - 1],
      data: { axis: label.role },
    }),
  )
  const rawEdges = (options.edges ?? true) ? edgesAtLevel(model, level, focus) : []
  const edges = (options.bundle ? bundleEdges(model, rawEdges) : rawEdges).map((edge) => toRenderEdge(edge, level))

  return { nodes: [...bands, ...lanes, ...axes, ...content], edges }
}

/**
 * LE.10 — the lane gutter: one non-interactive label chip per lane, left-aligned to the drawn
 * content, so explore/edit/verify/delegate read as labelled bands. The x is derived from the
 * leftmost content so the gutter tracks the layout without a screen-space overlay.
 */
function buildLaneLabels(
  labels: BuildRenderModelOptions["laneLabels"],
  content: readonly RenderNode[],
): RenderNode[] {
  if (!labels || labels.length === 0 || content.length === 0) return []

  const minX = Math.min(...content.map((node) => node.position[0]))
  const x = minX - LANE_GUTTER - LANE_LABEL_SIZE[0] / 2

  return labels.map((lane) => ({
    id: `lane:${lane.id}`,
    kind: "lane",
    label: lane.label,
    shape: "panel" as const,
    interactive: false,
    // T1.10: use textMuted so lane labels have sufficient contrast in both light and dark.
    // The SpaceGraph adapter maps textMuted to the label color for lane nodes.
    html: `<div data-lane="${escapeHtml(lane.id)}" style="display:flex;align-items:center;height:100%;box-sizing:border-box;padding:0 10px;font-family:inherit;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--lane-label-color);opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(lane.label)}</div>`,
    size: LANE_LABEL_SIZE,
    position: [x, lane.y, ZERO.z - 1],
    data: { lane: lane.id, colorToken: "textMuted" },
  }))
}

/** LE.13: provenance edges that a file-first lens rebases onto the owning turn node. */
const BUNDLED_KINDS = new Set<EdgeKind>(["writes", "reads", "searches", "references", "produces"])

/**
 * LE.13 — provenance bundling. Every per-activity edge into a `file` is rebased to the owning turn
 * node and deduped, so a file links to a short per-turn spine (one connector per turn) instead of one
 * crossing wire per writer/reader. Edges that do not target a file, or whose activity has no turn, are
 * kept verbatim. The rebased id is stable (`bundle:${source}:${target}:${kind}`) for renderer diffing.
 */
function bundleEdges(model: GraphModel, edges: readonly GraphEdge[]): GraphEdge[] {
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

/** A derived cluster collapsed at this level (§5.4): it shows a member count and expands later. */
function isClusterChip(node: GraphNode, level: ZoomLevel) {
  return node.derived === true && (node.clusterOf?.length ?? 0) > 0 && !isClusterExpanded(level)
}

/**
 * RF.5 — turn swimlanes and phase groups drawn behind the content as non-interactive DOM bands.
 * Each band is a translucent rounded box sized to its cluster bounds, so the canvas shows where a
 * turn starts and ends and which activity a phase groups.
 */
function buildBands(
  model: GraphModel,
  level: ZoomLevel,
  positions: ReadonlyMap<string, Position>,
  renderBand: BandTemplate,
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
    const width = bounds.max.x - bounds.min.x + BAND_PAD * 2
    const height = bounds.max.y - bounds.min.y + BAND_PAD * 2
    bands.push({
      id: `band:${node.id}`,
      kind: "band",
      label: node.label,
      shape: "panel",
      interactive: false,
      html: renderBand(node, drawn.length, bounds),
      size: [width, height, 0],
      position: [(bounds.min.x + bounds.max.x) / 2, (bounds.min.y + bounds.max.y) / 2, ZERO.z],
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

/** Renderer-facing affordance data only; detail content is read back from the model via selectors. */
function nodeData(node: GraphNode, level: ZoomLevel, dimmed: boolean): Record<string, unknown> {
  return {
    turnID: node.turnID,
    messageID: node.messageID,
    partID: node.partID,
    toolID: node.toolID,
    time: node.time,
    derived: node.derived ?? false,
    dimmed,
    category: node.kind === "phase" ? node.data?.category : undefined,
    count: node.kind === "phase" ? clusterCount(node) : undefined,
    expanded: node.kind === "phase" ? isClusterExpanded(level) : undefined,
  }
}

/** Card markup is host-owned; out-of-neighborhood cards are faded without touching their content. */
function wrapDim(html: string, dimmed: boolean) {
  return dimmed ? `<div style="width:100%;height:100%;opacity:.3">${html}</div>` : html
}

/** Edge strength by kind/confidence (RF.4): the sequence spine and provenance are strong; hierarchy
 * and inferred links are dashed, and hierarchy is dropped at execution in `edgesAtLevel`. */
function toRenderEdge(edge: GraphEdge, _level: ZoomLevel): RenderEdge {
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

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!)
}

/**
 * Default activity card. It carries only content derived from the model (labels, summaries, counts)
 * and inherits color/font from the host, so no palette or copy is baked in here.
 */
function defaultCard(node: GraphNode, level: ZoomLevel) {
  const count = isClusterChip(node, level) ? (node.clusterOf?.length ?? 0) : 0
  const badge = count ? ` <span style="opacity:.6">${count}</span>` : ""
  const summary = node.summary ? `<span style="opacity:.7">${escapeHtml(node.summary)}</span>` : ""

  return `<div data-kind="${node.kind}" data-status="${node.status}" style="display:flex;flex-direction:column;gap:2px;padding:8px 10px;color:inherit;font-family:inherit"><span style="font-weight:600">${escapeHtml(node.label)}${badge}</span>${summary}</div>`
}

/** Default swimlane band: a translucent rounded box with a small header label and count. */
function defaultBand(node: GraphNode, count: number, _bounds: ClusterBounds) {
  const header = escapeHtml(node.label)

  return `<div data-band="${node.kind}" style="width:100%;height:100%;box-sizing:border-box;border:1px dashed currentColor;border-radius:12px;opacity:.28;pointer-events:none;position:relative;font-family:inherit"><span style="position:absolute;top:4px;left:10px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase">${header} · ${count}</span></div>`
}
