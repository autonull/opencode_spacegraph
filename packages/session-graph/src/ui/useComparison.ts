import { createSignal, createMemo } from "solid-js"
import { scopeToTurns, reviewChanges, type GraphViewData, type TurnStats } from "@opencode/session-ui/graph"

export type ComparisonChanges = {
  added: ReadonlySet<string>
  removed: ReadonlySet<string>
  changed: ReadonlySet<string>
  counts: { added: number; removed: number; changed: number }
  label: "turns" | "parked"
  turnStats?: TurnStats[]
}

export type UseComparisonOptions = {
  model: () => GraphViewData
  liveModel: () => GraphViewData
  checkpoint: () => number | undefined
  turnCount: () => number | undefined
  selection: () => readonly string[]
  nodeByID: (id: string) => { kind: string; id: string } | undefined
}

export type UseComparisonReturn = {
  comparedTurns: () => readonly [string, string] | null
  comparison: () => ComparisonChanges | undefined
  compareSelectedTurns: () => void
  clearComparison: () => void
  setComparedTurns: (turns: readonly [string, string] | null) => void
}

export function useComparison(options: UseComparisonOptions): UseComparisonReturn {
  const [comparedTurns, setComparedTurns] = createSignal<readonly [string, string] | null>(null)

  const selectedTurns = () =>
    options
      .selection()
      .map((id) => options.nodeByID(id))
      .filter((node): node is { kind: string; id: string } => node?.kind === "turn")

  const comparison = createMemo(() => {
    const pair = comparedTurns()
    if (pair) {
      const before = scopeToTurns(options.model(), new Set([pair[0]]))
      const after = scopeToTurns(options.model(), new Set([pair[1]]))
      const changes = reviewChanges(before, after)
      return {
        added: new Set(changes.added),
        removed: new Set(changes.removed),
        changed: new Set(changes.changed),
        counts: {
          added: changes.added.length,
          removed: changes.removed.length,
          changed: changes.changed.length,
        },
        turnStats: changes.turnStats,
        label: "turns" as const,
      }
    }
    const checkpoint = options.checkpoint()
    const live = options.liveModel()
    const turns = live.turns
    if (checkpoint === undefined || options.turnCount() === undefined) return undefined
    if (checkpoint >= turns.length - 1 || checkpoint < 0) return undefined
    const parked = scopeToTurns(live, new Set(turns.slice(0, checkpoint + 1)))
    const current = scopeToTurns(live, new Set(turns))
    const changes = reviewChanges(parked, current)
    return {
      added: new Set(changes.added),
      removed: new Set(changes.removed),
      changed: new Set(changes.changed),
      counts: {
        added: changes.added.length,
        removed: changes.removed.length,
        changed: changes.changed.length,
      },
      turnStats: changes.turnStats,
      label: "parked" as const,
    }
  })

  const compareSelectedTurns = () => {
    const turns = selectedTurns()
    if (turns.length < 2) return
    setComparedTurns([turns[0]!.id, turns[1]!.id])
  }

  const clearComparison = () => {
    if (comparedTurns()) {
      setComparedTurns(null)
      return
    }
    // Return to live (handled by caller via onCheckpoint)
  }

  return {
    comparedTurns,
    comparison,
    compareSelectedTurns,
    clearComparison,
    setComparedTurns,
  }
}