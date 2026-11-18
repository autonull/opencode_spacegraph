import { createSignal, createEffect, onCleanup, type Accessor } from "solid-js"
import type { Position } from "@opencode/session-ui/graph"
import type { GraphViewportTrackerReturn } from "./useGraphViewport"

export type UseBudgetCenterOptions = {
  selection: () => string[]
  displayPositions: () => ReadonlyMap<string, Position>
  viewportTracker: Accessor<GraphViewportTrackerReturn | undefined>
}

export type UseBudgetCenterReturn = {
  budgetCenter: Accessor<{ x: number; y: number; z: number } | undefined>
  setBudgetCenter: (center: { x: number; y: number; z: number } | undefined) => void
}

export function useBudgetCenter(options: UseBudgetCenterOptions): UseBudgetCenterReturn {
  const [budgetCenter, setBudgetCenter] = createSignal<{ x: number; y: number; z: number } | undefined>()
  let budgetRestTimer: ReturnType<typeof setTimeout> | undefined
  const BUDGET_REST_MS = 500

  createEffect(() => {
    const sel = options.selection()
    if (sel.length > 0) {
      const pos = options.displayPositions().get(sel[0])
      if (pos) setBudgetCenter(pos)
    }
  })

  const updateBudgetCenterFromRest = () => {
    const r = options.viewportTracker()?.resting()
    if (r) setBudgetCenter({ x: r[0], y: r[1], z: r[2] })
  }

  createEffect(() => {
    const resting = options.viewportTracker()?.resting()
    if (!resting) return
    if (budgetRestTimer) clearTimeout(budgetRestTimer)
    budgetRestTimer = setTimeout(updateBudgetCenterFromRest, BUDGET_REST_MS)
  })

  onCleanup(() => {
    if (budgetRestTimer) clearTimeout(budgetRestTimer)
  })

  return { budgetCenter, setBudgetCenter }
}