import { deriveZoom } from "@spacegraphjs/kernel"
import type { Node } from "@spacegraphjs/kernel"
import type { GraphModel, GraphNode } from "./model"
import { graphModelToKernel, graphViewMeta, toGraphNode, toGraphView } from "./view"
import type { ZoomLevel } from "./vocabulary"

export const ZOOM_RANK: Readonly<Record<ZoomLevel, number>> = {
  overview: 0,
  execution: 1,
  detail: 2,
}

export type ZoomExpansion = ReadonlySet<string> | ((node: GraphNode) => boolean)

export const zoomModel = (
  model: GraphModel,
  level: ZoomLevel,
  expansion?: ZoomExpansion,
): GraphModel => {
  const expanded =
    expansion === undefined
      ? undefined
      : typeof expansion === "function"
        ? (node: Node) => expansion(toGraphNode(node))
        : expansion
  const zoomed = deriveZoom(graphModelToKernel(model), {
    levelOf: (node) => toGraphNode(node).minLevel ?? "detail",
    rank: ZOOM_RANK,
    level,
    expansion: expanded,
  })
  return toGraphView(zoomed, graphViewMeta(model))
}
