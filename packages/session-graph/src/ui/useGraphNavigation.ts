import { type Accessor } from "solid-js"
import type { GraphViewData, GraphNode, Layout } from "@opencode/session-ui/graph"
import { isSummaryLayout, subtree, nodeByID } from "@opencode/session-ui/graph"
import { Metrics } from "@opencode/session-ui/graph"
import type { GraphViewportTrackerReturn } from "./useGraphViewport"
import type { UseGraphSelectionReturn } from "./useGraphSelection"

export interface UseGraphNavigationInput {
  model: Accessor<GraphViewData>
  layout: Accessor<Layout>
  setLayout: (layout: Layout) => void
  setFiles: (files: boolean | ((prev: boolean) => boolean)) => void
  setPeek: (peek: boolean | ((prev: boolean) => boolean)) => void
  onFilesChange: ((files: boolean) => void) | undefined
  onPeekChange: ((peek: boolean) => void) | undefined
  select: UseGraphSelectionReturn["select"]
  viewportTracker: GraphViewportTrackerReturn
  renderer: Accessor<any>
  onOpenTranscript: ((id: string) => void) | undefined
  popoverVisible: Accessor<GraphNode | undefined>
  setPopoverDismissed: (dismissed: boolean) => void
  fitOptions: Accessor<{ minScale: number; insets: undefined }>
}

export interface UseGraphNavigationReturn {
  expandToGraph: (id: string) => void
  toggleFiles: () => void
  togglePeek: () => void
  dismissDetail: () => void
  openInTranscript: (id: string) => void
  fitSubtree: (id: string) => void
}

export function useGraphNavigation(input: UseGraphNavigationInput): UseGraphNavigationReturn {
  const {
    model,
    layout,
    setLayout,
    setFiles,
    setPeek,
    onFilesChange,
    onPeekChange,
    select,
    viewportTracker,
    renderer,
    onOpenTranscript,
    popoverVisible,
    setPopoverDismissed,
    fitOptions,
  } = input

  // LE.8/LE.9: a segment/cell expands into the node-link graph with that node selected and framed.
  const expandToGraph = (id: string) => {
    const node = nodeByID(model(), id)

    if (!node) return
    Metrics.count("expand")
    if (isSummaryLayout(layout())) setLayout("lanes")
    subtree(model(), id).map((node) => node.id)
    viewportTracker.camera.fitContent()
    // The selection will be set by the camera focus
    select(node.id)
    viewportTracker.camera.focus(node.id)
  }

  const toggleFiles = () => {
    setFiles((open: boolean) => {
      onFilesChange?.(!open)
      return !open
    })
  }

  const togglePeek = () => {
    setPeek((open: boolean) => {
      onPeekChange?.(!open)
      return !open
    })
  }

  // Escape closes the popover and keeps the selection; a second Escape clears it.
  // A panel is not dismissed by Escape — it is the map's own surface, and clearing the selection closes it.
  const dismissDetail = () => {
    if (popoverVisible()) {
      setPopoverDismissed(true)
      return
    }
    select(undefined)
  }

  const openInTranscript = (id: string) => {
    Metrics.count("return")
    onOpenTranscript?.(id)
  }

  // U3.11: clicking a breadcrumb selects it and frames its subtree, so the canvas follows the trail.
  const fitSubtree = (id: string) => {
    select(id)
    renderer()?.fit(
      subtree(model(), id).map((node) => node.id),
      fitOptions(),
    )
  }

  return {
    expandToGraph,
    toggleFiles,
    togglePeek,
    dismissDetail,
    openInTranscript,
    fitSubtree,
  }
}