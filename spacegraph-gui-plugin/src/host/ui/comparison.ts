import { reviewChanges, scopeToTurns, type GraphViewData, type TurnStats } from "../../model"

export type ComparisonChanges = {
  added: ReadonlySet<string>
  removed: ReadonlySet<string>
  changed: ReadonlySet<string>
  counts: { added: number; removed: number; changed: number }
  label: "turns" | "parked"
  turnStats?: TurnStats[]
}

function fromChanges(changes: ReturnType<typeof reviewChanges>, label: ComparisonChanges["label"]): ComparisonChanges {
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
    label,
  }
}

/** Compare two turns of the same model. */
export function compareTurns(model: GraphViewData, before: string, after: string): ComparisonChanges {
  return fromChanges(reviewChanges(scopeToTurns(model, new Set([before])), scopeToTurns(model, new Set([after]))), "turns")
}

/** Compare the parked checkpoint against the live model, or undefined when live. */
export function compareParked(live: GraphViewData, checkpoint: number | undefined): ComparisonChanges | undefined {
  if (checkpoint === undefined || checkpoint < 0 || checkpoint >= live.turns.length - 1) return undefined
  const parked = scopeToTurns(live, new Set(live.turns.slice(0, checkpoint + 1)))
  const current = scopeToTurns(live, new Set(live.turns))
  return fromChanges(reviewChanges(parked, current), "parked")
}
