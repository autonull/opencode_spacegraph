import type { RenderModel } from "@spacegraphjs/renderer"
import { layoutGraph, turnSubgraph, type GraphModel, type ZoomLevel } from "@opencode/session-ui/graph"
import { buildRenderModel, type CardTemplate } from "../canvas/buildRenderModel"

/** A turn-scoped `GraphModel` subset for the hybrid overlay and inline graph (H6.2/H6.4). */
export function turnGraphModel(model: GraphModel, turnID: string, limit: number): GraphModel {
  const { nodes, edges } = turnSubgraph(model, turnID, limit)

  return { ...model, nodes, edges }
}

/**
 * The compact, execution-level `RenderModel` for one turn: the turn and its highest-signal children,
 * laid out with the same deterministic layout the full graph uses so positions look consistent.
 */
export function buildTurnRenderModel(
  model: GraphModel,
  turnID: string,
  options: { limit: number; level?: ZoomLevel; renderCard?: CardTemplate },
): RenderModel {
  const scoped = turnGraphModel(model, turnID, options.limit)
  const level = options.level ?? "execution"

  return buildRenderModel(scoped, {
    level,
    positions: layoutGraph(scoped, { level }).positions,
    renderCard: options.renderCard,
  })
}
