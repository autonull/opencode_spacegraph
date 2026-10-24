import type { RenderModel } from "@spacegraphjs/renderer"
import type { ClusterBounds, GraphViewData, GraphNode, Position, ZoomLevel } from "@opencode/session-ui/graph"
import { sessionGraphAdapter } from "./sessionGraphAdapter"

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
 * Pure `GraphViewData` + level + positions → `RenderModel` (§5.4). Rendering-agnostic: it imports only
 * the contract, never a backend. The pipeline lives in the library's `ModelAdapter`; this module is
 * the session's vocabulary and the default adapter.
 */
export function buildRenderModel(model: GraphViewData, options: BuildRenderModelOptions): RenderModel {
  return sessionGraphAdapter.build(model, options)
}

export { escapeHtml } from "@spacegraphjs/adapter"
