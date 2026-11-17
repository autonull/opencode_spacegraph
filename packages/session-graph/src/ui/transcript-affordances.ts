import type { GraphViewData, GraphNode } from "@opencode/session-ui/graph"

export type TurnAffordance = { why?: boolean; expand?: boolean; subagent?: boolean }

/**
 * M4 — the graph affordances of every turn, in one pass over the model. A transcript row looks up
 * this map instead of scanning the graph per render, so a collapsed transcript does no per-row
 * graph work. "Why" names a turn with a failure; "Expand"/"Subagent" name a turn that delegated.
 */
export function buildTurnAffordances(model: GraphViewData): Map<string, TurnAffordance> {
  const byTurn = new Map<string, GraphNode[]>()
  const affordances = new Map<string, TurnAffordance>()

  for (const node of model.nodes) {
    if (!node.turnID) continue
    const bucket = byTurn.get(node.turnID)

    if (bucket) bucket.push(node)
    else byTurn.set(node.turnID, [node])
  }

  for (const [turnID, nodes] of byTurn) {
    const failed = nodes.some((node) => node.status === "failed" || node.status === "interrupted" || node.kind === "error")
    const delegated = nodes.some((node) => node.kind === "subagent")

    if (!failed && !delegated) continue

    affordances.set(turnID, {
      ...(failed ? { why: true } : {}),
      ...(delegated ? { expand: true, subagent: true } : {}),
    })
  }

  return affordances
}
