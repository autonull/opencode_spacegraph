import { createSignal, createEffect, onCleanup } from "solid-js"
import type { GraphViewData } from "@opencode/session-ui/graph"
import type { UseGroupCollapseReturn } from "./useGroupCollapse"

/**
 * Tracks group member count changes to trigger badge animations.
 * Returns a set of group IDs that should animate their badge.
 */
export function useGroupBadgeAnimation(
  model: () => GraphViewData,
  collapsedGroups: UseGroupCollapseReturn["collapsedGroups"],
): () => ReadonlySet<string> {
  const [animatedGroups, setAnimatedGroups] = createSignal<Set<string>>(new Set())
  // Bookkeeping only: this map is written by the effect, so it must not be reactive or the effect
  // would invalidate itself on every run.
  let previousCounts = new Map<string, number>()
  let timer: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => {
    if (timer) clearTimeout(timer)
  })

  createEffect(() => {
    const currentModel = model()
    const currentCollapsed = collapsedGroups()
    const newCounts = new Map<string, number>()

    // Calculate current member counts for collapsed groups
    for (const node of currentModel.nodes) {
      if (node.clusterOf && currentCollapsed.has(node.id)) {
        newCounts.set(node.id, node.clusterOf.length)
      }
    }

    const toAnimate = new Set<string>()

    // Check for count increases (token bursts)
    for (const [id, count] of newCounts) {
      if (count > (previousCounts.get(id) ?? 0)) {
        toAnimate.add(id)
      }
    }

    previousCounts = newCounts

    if (toAnimate.size === 0) return

    setAnimatedGroups(toAnimate)
    // Clear animation after it completes (200ms)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      setAnimatedGroups((prev) => {
        const next = new Set(prev)
        for (const id of toAnimate) next.delete(id)
        return next
      })
    }, 200)
  })

  return animatedGroups
}
