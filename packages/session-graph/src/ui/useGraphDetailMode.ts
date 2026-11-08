import type { DetailMode, DetailFraming, DepthMode, Layout } from "@opencode/session-ui/graph"
import type { Projection } from "@spacegraphjs/renderer"

export interface UseGraphDetailModeInput {
  setDetailMode: (mode: DetailMode) => void
  setDetailFraming: (framing: DetailFraming) => void
  setProjection: (projection: Projection) => void
  setDepth: (depth: DepthMode) => void
  setLayout: (layout: Layout) => void
  onDetailModeChange: ((mode: DetailMode) => void) | undefined
  onDetailFramingChange: ((framing: DetailFraming) => void) | undefined
  onProjectionChange: ((projection: Projection) => void) | undefined
  onDepthChange: ((depth: DepthMode) => void) | undefined
  onLayoutChange: ((layout: Layout) => void) | undefined
  setPopoverDismissed: (dismissed: boolean) => void
}

export interface UseGraphDetailModeReturn {
  changeDetailMode: (next: DetailMode) => void
  changeDetailFraming: (next: DetailFraming) => void
  changeProjection: (next: Projection) => void
  changeDepth: (next: DepthMode) => void
  changeLayout: (next: Layout) => void
}

export function useGraphDetailMode(input: UseGraphDetailModeInput): UseGraphDetailModeReturn {
  const {
    setDetailMode,
    setDetailFraming,
    setProjection,
    setDepth,
    setLayout,
    onDetailModeChange,
    onDetailFramingChange,
    onProjectionChange,
    onDepthChange,
    onLayoutChange,
    setPopoverDismissed,
  } = input

  const changeDetailMode = (next: DetailMode) => {
    setDetailMode(next)
    setPopoverDismissed(false)
    onDetailModeChange?.(next)
  }

  const changeDetailFraming = (next: DetailFraming) => {
    setDetailFraming(next)
    onDetailFramingChange?.(next)
  }

  const changeProjection = (next: Projection) => {
    setProjection(next)
    // Projection is the coarse depth selection; keep the depth treatment in step with it.
    setDepth(next === "2d" ? "flat" : "orbit")
    onProjectionChange?.(next)
  }

  const changeDepth = (next: DepthMode) => {
    // Set projection first so capability fallback sees the intended 3D projection
    // when it evaluates the depth change, preventing inconsistent depth=flat/projection=3d state.
    setProjection(next === "flat" ? "2d" : "3d")
    setDepth(next)
    onDepthChange?.(next)
  }

  const changeLayout = (next: Layout) => {
    setLayout(next)
    onLayoutChange?.(next)
  }

  return {
    changeDetailMode,
    changeDetailFraming,
    changeProjection,
    changeDepth,
    changeLayout,
  }
}