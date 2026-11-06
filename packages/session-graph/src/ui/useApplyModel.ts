import { untrack } from "solid-js"
import type { GraphRenderer } from "@spacegraphjs/renderer"

export function createApplyModel(
  raiseLevelForFrame: () => boolean,
  focusFrame: (instance: GraphRenderer) => void,
  needsFit: () => boolean,
  setNeedsFit: (v: boolean) => void,
  viewportTracker: ReturnType<typeof import("./useGraphViewport").useGraphViewport> | undefined,
  contentIDs: () => string[],
  fitOptions: () => { minScale: number; insets: undefined },
) {
  return (instance: GraphRenderer) => {
    if (raiseLevelForFrame()) return
    if (needsFit()) {
      setNeedsFit(false)
      if (viewportTracker) {
        viewportTracker.camera.request(() => instance.fit(untrack(contentIDs), untrack(fitOptions)))
      }
    }
    focusFrame(instance)
  }
}