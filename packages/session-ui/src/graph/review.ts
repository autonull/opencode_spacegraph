import { diffKernels } from "@spacegraphjs/kernel"
import type { GraphViewData } from "./model"
import { graphModelToKernel, graphViewMeta, toGraphView } from "./view"
import { countNodeKinds, type TurnStats } from "./selectors"

export type ReviewChanges = {
  added: readonly string[]
  removed: readonly string[]
  changed: readonly string[]
  turnStats?: TurnStats[]
}

export const reviewChanges = (before: GraphViewData, after: GraphViewData): ReviewChanges => {
  const diff = diffKernels(graphModelToKernel(before), graphModelToKernel(after))
  const baseChanges = {
    added: diff.nodes.added.map((node) => node.id),
    removed: diff.nodes.removed.map((node) => node.id),
    changed: diff.nodes.changed.map((change) => change.id),
  }

  // Compute per-turn stats
  const turnStats: TurnStats[] = []
  const beforeTurns = new Map(before.turns.map((id, index) => [id, index]))
  const afterTurns = new Map(after.turns.map((id, index) => [id, index]))
  const allTurns = new Set([...before.turns, ...after.turns])

  for (const turnID of allTurns) {
    const beforeTurnEntry = beforeTurns.get(turnID)
    const afterTurnEntry = afterTurns.get(turnID)
    const beforeTurn = beforeTurnEntry !== undefined ? beforeTurnEntry : -1
    const afterTurn = afterTurnEntry !== undefined ? afterTurnEntry : -1

    // If turn exists in both, compute stats
    if (beforeTurn !== -1 && afterTurn !== -1) {
      const turnNodes = before.nodes.filter((n) => n.turnID === turnID)
      const { filesTouched, toolsRun, errors, retries } = countNodeKinds(turnNodes)
      let minTime = Infinity
      let maxTime = -Infinity

      for (const node of turnNodes) {
        if (node.time) {
          minTime = Math.min(minTime, node.time)
          maxTime = Math.max(maxTime, node.time)
        }
      }

      turnStats.push({
        turnID,
        turnNumber: beforeTurn + 1,
        filesTouched: filesTouched.size,
        toolsRun,
        errors,
        retries,
        durationMs: maxTime > minTime ? maxTime - minTime : 0,
      })
    }
  }

  return { ...baseChanges, turnStats }
}

export const reviewModel = (before: GraphViewData, after: GraphViewData): GraphViewData => {
  const beforeKernel = graphModelToKernel(before)
  const afterKernel = graphModelToKernel(after)
  const diff = diffKernels(beforeKernel, afterKernel)
  const ids = new Set<string>()
  for (const node of diff.nodes.added) ids.add(node.id)
  for (const change of diff.nodes.changed) ids.add(change.id)
  for (const edge of diff.edges.added) {
    ids.add(edge.source)
    ids.add(edge.target)
  }
  for (const change of diff.edges.changed) {
    ids.add(change.after.source)
    ids.add(change.after.target)
  }
  return toGraphView(afterKernel.subgraph(ids), graphViewMeta(after))
}
