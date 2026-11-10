import { type Accessor } from "solid-js"
import type { GraphViewData, GraphNode, Layout } from "@opencode/session-ui/graph"
import { isSummaryLayout, subtree, nodeByID, turnSubgraph, subagentSubgraph } from "@opencode/session-ui/graph"
import { Metrics } from "@opencode/session-ui/graph"
import type { GraphViewportTrackerReturn } from "./useGraphViewport"
import type { UseGraphSelectionReturn } from "./useGraphSelection"
import type { UseGraphStateReturn } from "./useGraphState"

export interface UseGraphNavigationInput {
  model: Accessor<GraphViewData>
  layout: Accessor<Layout>
  setLayout: (layout: Layout) => void
  setFiles: (files: boolean | ((prev: boolean) => boolean)) => void
  setPeek: (peek: boolean | ((prev: boolean) => boolean)) => void
  onFilesChange: ((files: boolean) => void) | undefined
  onPeekChange: ((peek: boolean) => void) | undefined
  setTrustLens: (trustLens: boolean | ((prev: boolean) => boolean)) => void
  onTrustLensChange: ((trustLens: boolean) => void) | undefined
  setCompactionAdvisor: (compactionAdvisor: boolean | ((prev: boolean) => boolean)) => void
  onCompactionAdvisorChange: ((compactionAdvisor: boolean) => void) | undefined
  select: UseGraphSelectionReturn["select"]
  viewportTracker: GraphViewportTrackerReturn
  renderer: Accessor<any>
  onOpenTranscript: ((id: string) => void) | undefined
  popoverVisible: Accessor<GraphNode | undefined>
  setPopoverDismissed: (dismissed: boolean) => void
  fitOptions: Accessor<{ minScale: number; insets: undefined }>
  // Drill-down (Phase 10.3)
  enterDrillDown: UseGraphStateReturn["enterDrillDown"]
  exitDrillDown: UseGraphStateReturn["exitDrillDown"]
  canDrillDown: UseGraphStateReturn["canDrillDown"]
  state: UseGraphStateReturn
}

export interface UseGraphNavigationReturn {
  expandToGraph: (id: string) => void
  toggleFiles: () => void
  togglePeek: () => void
  toggleTrustLens: () => void
  toggleCompactionAdvisor: () => void
  dismissDetail: () => void
  openInTranscript: (id: string) => void
  fitSubtree: (id: string) => void
  // Drill-down
  exitDrillDown: () => void
  canDrillDown: () => boolean
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
    setTrustLens,
    onTrustLensChange,
    setCompactionAdvisor,
    onCompactionAdvisorChange,
    select,
    viewportTracker,
    renderer,
    onOpenTranscript,
    popoverVisible,
    setPopoverDismissed,
    fitOptions,
    enterDrillDown,
    exitDrillDown: exitDrillDownState,
    canDrillDown: canDrillDownState,
    // Drill-down state access for exitDrillDown
    state,
  } = input

  // LE.8/LE.9: a segment/cell expands into the node-link graph with that node selected and framed.
  const expandToGraph = (id: string) => {
    const node = nodeByID(model(), id)

    if (!node) return
    Metrics.count("expand")

    // Phase 10.3: Fractal drill-down for turns and subagents
    if (node.kind === "turn") {
      const subgraph = turnSubgraph(model(), node.id, 20)
      const camera = viewportTracker.viewport()
      enterDrillDown(
        { ...model(), nodes: subgraph.nodes, edges: subgraph.edges, turns: [node.id], root: node.id },
        node.id,
        camera ? { zoom: camera.zoom, center: camera.center } : undefined
      )
      // Select the turn node in the subgraph
      select(node.id)
      return
    }

    if (node.kind === "subagent") {
      const subgraph = subagentSubgraph(model(), node.id)
      const camera = viewportTracker.viewport()
      enterDrillDown(
        { ...model(), nodes: subgraph.nodes, edges: subgraph.edges, turns: [], root: node.id },
        node.id,
        camera ? { zoom: camera.zoom, center: camera.center } : undefined
      )
      select(node.id)
      return
    }

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

  const toggleTrustLens = () => {
    setTrustLens((open: boolean) => {
      onTrustLensChange?.(!open)
      return !open
    })
  }

  const toggleCompactionAdvisor = () => {
    setCompactionAdvisor((open: boolean) => {
      onCompactionAdvisorChange?.(!open)
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

  // Drill-down exit
  const exitDrillDown = () => {
    // Get the camera from the previous stack entry before popping
    const stack = state.drillDownStack()
    const previousEntry = stack.length > 1 ? stack[stack.length - 2] : null
    const previousCamera = previousEntry?.camera
    
    exitDrillDownState()
    
    // Restore camera from previous entry after the model switches back
    if (previousCamera) {
      // Use a small timeout to let the model switch complete
      setTimeout(() => {
        viewportTracker.setViewport({ 
          zoom: previousCamera.zoom, 
          center: previousCamera.center as [number, number, number] 
        })
      }, 0)
    }
  }

  const canDrillDown = () => canDrillDownState()

  return {
    expandToGraph,
    toggleFiles,
    togglePeek,
    toggleTrustLens,
    toggleCompactionAdvisor,
    dismissDetail,
    openInTranscript,
    fitSubtree,
    exitDrillDown,
    canDrillDown,
  }
}