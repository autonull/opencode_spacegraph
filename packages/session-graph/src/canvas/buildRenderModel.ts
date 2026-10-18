import type { NodeStatus, RenderEdge, RenderModel, RenderNode } from "@spacegraphjs/renderer"
import {
  clusterCount,
  domBudget,
  edgesAtLevel,
  isClusterExpanded,
  nodesAtLevel,
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

/** Host-owned, sanitized markup for a `card`. Text must be escaped by the template. */
export type CardTemplate = (node: GraphNode, level: ZoomLevel) => string

export type BuildRenderModelOptions = {
  level: ZoomLevel
  positions: ReadonlyMap<string, Position>
  /** Execution-level focus: narrows edges to the selected node's neighborhood (§5.4). */
  focus?: string
  /** Overrides the per-level DOM card budget; cards above it fall back to labels. */
  cardBudget?: number
  /** Replaces the default card markup, e.g. with localized copy. */
  renderCard?: CardTemplate
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

  let cards = 0

  const nodes = nodesAtLevel(model, level).map((node): RenderNode => {
    const position = positions.get(node.id) ?? ZERO
    const shape = NODE_SHAPE[node.kind]
    const chip = isClusterChip(node, level)
    const asCard = (shape === "card" || chip) && cards < budget

    if (asCard) cards += 1

    return {
      id: node.id,
      kind: node.kind,
      label: node.label,
      summary: node.summary,
      status: NODE_STATUS[node.status],
      shape: asCard ? "card" : shape === "card" ? "dot" : shape,
      html: asCard ? renderCard(node, level) : undefined,
      size: asCard && chip ? CHIP_SIZE : undefined,
      position: [position.x, position.y, position.z],
      data: nodeData(node, level),
    }
  })

  return { nodes, edges: edgesAtLevel(model, level, focus).map(toRenderEdge) }
}

/** A derived cluster collapsed at this level (§5.4): it shows a member count and expands later. */
function isClusterChip(node: GraphNode, level: ZoomLevel) {
  return node.derived === true && (node.clusterOf?.length ?? 0) > 0 && !isClusterExpanded(level)
}

/** Renderer-facing affordance data only; detail content is read back from the model via selectors. */
function nodeData(node: GraphNode, level: ZoomLevel): Record<string, unknown> {
  return {
    turnID: node.turnID,
    messageID: node.messageID,
    partID: node.partID,
    toolID: node.toolID,
    time: node.time,
    derived: node.derived ?? false,
    category: node.kind === "phase" ? node.data?.category : undefined,
    count: node.kind === "phase" ? clusterCount(node) : undefined,
    expanded: node.kind === "phase" ? isClusterExpanded(level) : undefined,
  }
}

function toRenderEdge(edge: GraphEdge): RenderEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    kind: edge.kind,
    label: edge.label,
    confidence: edge.confidence,
    style: edge.confidence === "inferred" ? "dashed" : "solid",
    directed: true,
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

  return `<div style="display:flex;flex-direction:column;gap:2px;padding:8px 10px;color:inherit;font-family:inherit"><span style="font-weight:600">${escapeHtml(node.label)}${badge}</span>${summary}</div>`
}
