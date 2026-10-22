import type { GraphModel } from "./model"
import type { Position } from "./layout"

/**
 * T17.5 — the DOM card budget follows the camera.
 *
 * The adapter spends the budget in the order it walks the model's nodes, so the order decides which
 * nodes get a card and which fall back to a dot. Ordering the nodes by their distance from the
 * camera's centre spends the budget on what the reader is looking at: the card under the reader's
 * hand is a card, not a dot.
 *
 * The order is the *render* model's, never the model's. A screen reader reads the session, and a
 * saved map reads the same whoever opens it.
 */
export function byProximity(
  model: GraphModel,
  positions: ReadonlyMap<string, Position>,
  centre: readonly [number, number, number],
): GraphModel {
  const distance = new Map<string, number>()

  for (const node of model.nodes) {
    const point = positions.get(node.id)

    // A node the layout did not place is nowhere near the reader, so it never takes a card.
    distance.set(
      node.id,
      point ? Math.hypot(point.x - centre[0], point.y - centre[1]) : Number.POSITIVE_INFINITY,
    )
  }

  return {
    ...model,
    nodes: [...model.nodes].sort((a, b) => distance.get(a.id)! - distance.get(b.id)!),
  }
}

/** Where each node sits in the session's own order, so a surface that reads the session can say so. */
export function sessionOrder(model: GraphModel): Map<string, number> {
  return new Map(model.nodes.map((node, index) => [node.id, index]))
}
