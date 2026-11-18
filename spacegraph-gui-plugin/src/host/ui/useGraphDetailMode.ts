import type { DetailMode, DepthMode, Layout } from "../../model"

export type GraphDetailModeInput = {
  setDetailMode: (mode: DetailMode) => void
  setDepth: (depth: DepthMode) => void
  setLayout: (layout: Layout) => void
  onDetailModeChange?: (mode: DetailMode) => void
  onDepthChange?: (depth: DepthMode) => void
  onLayoutChange?: (layout: Layout) => void
  setPopoverDismissed?: (dismissed: boolean) => void
}

export type GraphDetailModeChanges = {
  changeDetailMode: (next: DetailMode) => void
  changeDepth: (next: DepthMode) => void
  changeLayout: (next: Layout) => void
}

/**
 * Headless counterpart of the fork's `useGraphDetailMode`: coordinates the detail/depth/layout setters
 * with their change callbacks and the popover's dismissed flag. The plugin has no projection or detail
 * framing state, so those two axes stay out of the contract.
 */
export function createGraphDetailMode(input: GraphDetailModeInput): GraphDetailModeChanges {
  return {
    changeDetailMode(next) {
      input.setDetailMode(next)
      input.setPopoverDismissed?.(false)
      input.onDetailModeChange?.(next)
    },
    changeDepth(next) {
      input.setDepth(next)
      input.onDepthChange?.(next)
    },
    changeLayout(next) {
      input.setLayout(next)
      input.onLayoutChange?.(next)
    },
  }
}
