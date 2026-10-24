import { applyNodeBudget as budgetKernel, type NodeBudget } from "@spacegraphjs/kernel"
import type { GraphViewData } from "./model"
import type { Position } from "./layout"
import { graphModelToKernel, graphViewMeta, toGraphView } from "./view"

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
  model: GraphViewData,
  positions: ReadonlyMap<string, Position>,
  centre: readonly [number, number, number],
): GraphViewData {
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
export function sessionOrder(model: GraphViewData): Map<string, number> {
  return new Map(model.nodes.map((node, index) => [node.id, index]))
}

export type VisibilityBudget = NodeBudget

export const DEFAULT_BUDGET: VisibilityBudget = {
  maxNodes: 2_000,
  weights: {
    session: 1_000,
    turn: 500,
    phase: 300,
    subagent: 200,
    message: 100,
    notice: 90,
    error: 90,
    diff: 80,
    compaction: 70,
    tool: 60,
    result: 50,
    file: 40,
    directory: 30,
    symbol: 20,
    package: 15,
    commit: 10,
    branch: 10,
    process: 8,
    port: 8,
    issue: 8,
    retry: 20,
  },
}

export const applyNodeBudget = (
  model: GraphViewData,
  budget: VisibilityBudget = DEFAULT_BUDGET,
): GraphViewData => {
  if (model.nodes.length <= budget.maxNodes) return model
  return toGraphView(budgetKernel(graphModelToKernel(model), budget), graphViewMeta(model))
}
