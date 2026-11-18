import type { RendererViewport } from "@spacegraphjs/renderer"
import { Navigation } from "spacegraphjs/navigation"

export type Point = { x: number; y: number }

export const MINIMAP_BOX = { width: 176, height: 132 }
export const MINIMAP_PADDING = 8

/** The overview projection, shared by the SVG dots and the pointer-to-graph conversion. */
export function minimapProjection(positions: ReadonlyMap<string, Point>, viewport?: RendererViewport) {
  return Navigation.project({
    positions,
    box: MINIMAP_BOX,
    padding: MINIMAP_PADDING,
    viewport: viewport?.extent
      ? { center: [viewport.center[0], viewport.center[1]], extent: viewport.extent }
      : undefined,
  })
}

/** Convert a pointer position within the SVG into graph-space coordinates. */
export function minimapPanPoint(clientX: number, clientY: number, rect: DOMRect, projection: ReturnType<typeof minimapProjection>): Point {
  return projection.unproject({
    x: ((clientX - rect.left) / rect.width) * MINIMAP_BOX.width,
    y: ((clientY - rect.top) / rect.height) * MINIMAP_BOX.height,
  })
}

/** The nearest laid-out node to a graph-space point; the minimap has no camera seam, so it focuses a node. */
export function nearestNode(point: Point, positions: ReadonlyMap<string, Point>): string | undefined {
  let best: string | undefined
  let bestDistance = Number.POSITIVE_INFINITY
  for (const [id, position] of positions) {
    const distance = (position.x - point.x) ** 2 + (position.y - point.y) ** 2
    if (distance < bestDistance) {
      bestDistance = distance
      best = id
    }
  }
  return best
}
