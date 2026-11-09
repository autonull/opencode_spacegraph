import { createSignal, createEffect, type Accessor } from "solid-js"
import type { GraphViewData, ZoomLevel } from "@opencode/session-ui/graph"
import { minLevelOf, LEVEL_RANK } from "@opencode/session-ui/graph"
import { nodeByID } from "@opencode/session-ui/graph"
import type { GraphRenderer } from "@spacegraphjs/renderer"
import type { GraphViewportTrackerReturn } from "./useGraphViewport"

export interface UseGraphPermalinkInput {
  model: Accessor<GraphViewData>
  frame: string | undefined
  level: Accessor<ZoomLevel>
  setLevel: (level: ZoomLevel) => void
  renderer: Accessor<GraphRenderer | undefined>
  viewportTracker: GraphViewportTrackerReturn
  rendererReady: Accessor<boolean>
  selection: { select: (id: string | undefined, add?: boolean) => void }
}

export interface UseGraphPermalinkReturn {
  raiseLevelForFrame: () => boolean
  focusFrame: (instance: GraphRenderer | undefined) => void
}

export function useGraphPermalink(input: UseGraphPermalinkInput): UseGraphPermalinkReturn {
  const { model, frame, level, setLevel, renderer, viewportTracker, selection } = input

  const [framed, setFramed] = createSignal<string>()

  const raiseLevelForFrame = () => {
    const id = frame
    if (!id) return false
    const node = nodeByID(model(), id)
    if (!node) return false
    const minimum = minLevelOf(node)
    if (LEVEL_RANK[minimum] <= LEVEL_RANK[level()]) return false
    setLevel(minimum)
    return true
  }

  const focusFrame = (instance: GraphRenderer | undefined) => {
    const id = frame
    if (!id || !instance || framed() === id) return
    const node = nodeByID(model(), id)
    if (!node) return
    selection.select(id, false)
    viewportTracker.camera.focus(id)
    setFramed(id)
  }

  // A permalink that changes while the graph is open frames its node too, not only on load.
  createEffect(() => {
    const id = frame
    const node = id ? nodeByID(model(), id) : undefined
    if (!node) return
    focusFrame(renderer())
  })

  return {
    raiseLevelForFrame,
    focusFrame,
  }
}