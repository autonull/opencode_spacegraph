import { createSignal, createEffect } from "solid-js"
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
  const [prevCounts, setPrevCounts] = createSignal<Map<string, number>>(new Map())

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

    const previous = prevCounts()
    const toAnimate = new Set<string>()

    // Check for count increases (token bursts)
    for (const [id, count] of newCounts) {
      const prev = previous.get(id) ?? 0
      if (count > prev) {
        toAnimate.add(id)
      }
    }

    if (toAnimate.size > 0) {
      setAnimatedGroups(toAnimate)
      // Clear animation after it completes (200ms)
      setTimeout(() => {
        setAnimatedGroups((prev) => {
          const next = new Set(prev)
          for (const id of toAnimate) next.delete(id)
          return next
        })
      }, 200)
    }

    setPrevCounts(newCounts)
  })

  return animatedGroups
}