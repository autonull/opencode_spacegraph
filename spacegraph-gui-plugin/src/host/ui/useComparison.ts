import { createMemo, createSignal, type Accessor } from "solid-js"
import { nodeByID, type GraphViewData } from "../../model"
import { compareParked, compareTurns, type ComparisonChanges } from "./comparison"

export type ComparisonInput = {
  /** The unparked model: comparisons scope their turns from here even while the view is parked. */
  model: Accessor<GraphViewData>
  checkpoint: Accessor<number | undefined>
  selection: Accessor<readonly string[]>
}

export type Comparison = {
  comparedTurns: Accessor<readonly [string, string] | null>
  comparison: Accessor<ComparisonChanges | undefined>
  compareSelectedTurns: () => void
  compareVisibleTurns: () => void
  clearComparison: () => void
  setComparedTurns: (turns: readonly [string, string] | null) => void
}

/**
 * Headless counterpart of the fork's `useComparison`. It keeps the explicit turn pair in a signal and
 * derives the changes from the plugin-owned pure comparison helpers; a parked checkpoint is compared
 * against the live model when no pair is set.
 */
export function createComparison(input: ComparisonInput): Comparison {
  const [comparedTurns, setComparedTurns] = createSignal<readonly [string, string] | null>(null)

  const selectedTurns = () =>
    input
      .selection()
      .map((id) => nodeByID(input.model(), id))
      .filter((node): node is NonNullable<typeof node> => node?.kind === "turn")

  const comparison = createMemo(() => {
    const pair = comparedTurns()
    if (pair) return compareTurns(input.model(), pair[0], pair[1])
    return compareParked(input.model(), input.checkpoint())
  })

  const compareSelectedTurns = () => {
    const turns = selectedTurns()
    if (turns.length >= 2) setComparedTurns([turns[0]!.id, turns[1]!.id])
  }

  const compareVisibleTurns = () => {
    const turns = input.model().turns
    if (turns.length >= 2) setComparedTurns([turns[0]!, turns[1]!])
  }

  const clearComparison = () => setComparedTurns(null)

  return {
    comparedTurns,
    comparison,
    compareSelectedTurns,
    compareVisibleTurns,
    clearComparison,
    setComparedTurns,
  }
}
