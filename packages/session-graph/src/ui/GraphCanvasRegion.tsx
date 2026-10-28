import type {
  Projection,
  RenderTheme,
  RenderModel,
  RendererViewport,
  GraphRenderer,
} from "@spacegraphjs/renderer"
import type {
  DetailMode,
  EqualizerRuleSet,
  GraphViewData,
  GraphNode,
  GraphEdge,
  Layout,
  ZoomLevel,
} from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { createEffect, createMemo, createSignal, onCleanup, type JSX } from "solid-js"
import { GraphCanvas, type GraphCanvasReady } from "../canvas/GraphCanvas"
import type { RendererFactory, RendererID } from "../canvas/renderer-registry"
import { GraphOverlayManager } from "./GraphOverlayManager"
import { createNodeAnchor } from "./graph-anchors"
import { attachTouchGestures } from "./graph-utils"
import type { GraphDiffSource } from "./GraphDiff"
import type { UseGraphAnnotationsReturn } from "./useGraphAnnotations"
import type { UseGroupCollapseReturn } from "./useGroupCollapse"
import type { UseEdgeKindsReturn } from "./useEdgeKinds"
import type { GraphViewportTrackerReturn } from "./useGraphViewport"
import type { UseGraphSelectionReturn } from "./useGraphSelection"

export type GraphCanvasRegionProps = {
  // Core rendering
  model: () => GraphViewData
  theme: () => RenderTheme
  renderModel: RenderModel
  projection: () => Projection
  depth: () => "flat" | "layered" | "depth-stack" | "orbit"
  layout: () => Layout
  level: () => ZoomLevel
  
  // Selection & navigation
  selection: () => readonly string[]
  select: (id: string | undefined, add?: boolean) => void
  onNodeDoubleClick: (id: string) => void
  onBackgroundClick: () => void
  onHover: (id: string | undefined) => void
  onEdgeHover: (id: string | undefined) => void
  onEdgeSelect: (id: string) => void
  onGroupToggle: (id: string) => void
  onGroupMenu: (id: string, at: { x: number; y: number }) => void
  
  // Layout interactions
  onNodeMoved: (nodes: readonly { id: string; position: [number, number, number] }[]) => void
  onNodeResized: (resize: { id: string; size: [number, number]; position: [number, number, number] }) => void
  cardFacing: () => "plane" | "camera"
  applyModel: (instance: any) => void
  onRenderer?: (renderer: GraphRenderer | undefined) => void
  onRendererMounted?: (renderer: GraphRenderer, id: RendererID) => void
  onReady?: (info: GraphCanvasReady) => void
  preferredRenderer?: () => RendererID
  rendererOverrides?: Partial<Record<RendererID, RendererFactory>>
  
  // Detail mode
  detailMode: () => DetailMode
  effectiveDetailMode: DetailMode
  files: () => boolean
  
  // Peek
  peekFrame: { node: GraphNode; left: number; top: number } | undefined
  peekEdge: GraphEdge | undefined
  
  // Popover
  popoverVisible: GraphNode | undefined
  popoverNode: GraphNode | undefined
  popoverPlacement: { left: number; top: number }
  setPopoverDismissed: (dismissed: boolean) => void
  
  // Annotations (notes + trace)
  annotations: UseGraphAnnotationsReturn
  noteTargetNode: () => GraphNode | undefined
  noteAnchor: ReturnType<typeof createNodeAnchor>
  
  // Search
  searchOpen: () => boolean
  searchInitial: () => string | undefined
  setSearchOpen: (open: boolean) => void
  jumpTo: (node: GraphNode) => void
  
  // Legend
  legendOpen: () => boolean
  setLegendOpen: (open: boolean) => void
  edgeKinds: UseEdgeKindsReturn
  rules: EqualizerRuleSet | undefined
  
  // Gallery
  galleryOpen: () => boolean
  setGalleryOpen: (open: boolean) => void
  changeLayout: (layout: Layout) => void
  
  // Group menu
  groupMenu: () => { id: string; x: number; y: number } | undefined
  setGroupMenu: (menu: { id: string; x: number; y: number } | undefined) => void
  groupCollapse: UseGroupCollapseReturn
  camera: GraphViewportTrackerReturn["camera"]
  toggleGroupByID: (id: string) => void
  modelForGroupMenu: () => GraphViewData
  graphSelection: UseGraphSelectionReturn
  handleRegionKeyDown: (event: KeyboardEvent) => void
  
  // Error/Empty states
  error: () => string | undefined
  onError: (error: string | undefined) => void
  onBack: (() => void) | undefined
  
  // Diff
  diffSource: GraphDiffSource | undefined
  link: string | undefined
  onOpenTranscript: ((id: string) => void) | undefined
  onOpenSession: ((sessionID: string) => void) | undefined
  onOpenWindow: ((kind: string, nodeID?: string) => void) | undefined
  onCopyView: () => void
  renderSummary: ((node: GraphNode) => JSX.Element | undefined) | undefined
  
  // A11y
  ordered: RenderModel
  viewAnnouncement: string
  a11yInstructionsId: string
  announce: (message: string) => void
  i18n: ReturnType<typeof useI18n>
  
  // Canvas ref
  canvasRegionRef: (el: HTMLDivElement | undefined) => void
  
  // Viewport
  onViewportChange: (viewport: RendererViewport) => void
  setViewport: (vp: { zoom: number; center: number[] } | undefined) => void
  viewportTracker: GraphViewportTrackerReturn
}

/**
 * The canvas region of the graph view — the renderer, overlays, and all interactive surfaces
 * that live on or above the canvas.
 */
export const GraphCanvasRegion = (props: GraphCanvasRegionProps) => {
  const i18n = useI18n()
  const [canvasRegionEl, setCanvasRegionEl] = createSignal<HTMLDivElement | undefined>()
  const [renderer, setRenderer] = createSignal<GraphRenderer | undefined>()

  // Subscribe to projection/depth getters so this component re-renders when they change
  const projection = createMemo(() => props.projection())
  const depth = createMemo(() => props.depth())

  // V117: Touch gestures for mobile - set up when renderer and canvas are available
  createEffect(() => {
    const r = renderer()
    const el = canvasRegionEl()
    if (!r || !el) return
    const cleanup = attachTouchGestures(el, {
      getViewport: () => r.getViewport?.(),
      setViewport: (vp: RendererViewport) => r.setViewport?.(vp),
      capabilities: r.capabilities ?? { zoomRange: { min: 0.1, max: 10 } },
    })
    onCleanup(cleanup)
  })

  return (
    <div
      ref={setCanvasRegionEl}
      class="relative min-w-0 flex-1"
      data-slot="graph-canvas-region"
      role="group"
      aria-label={i18n.t("ui.sessionGraph.canvas.label")}
      aria-describedby={props.a11yInstructionsId}
      tabindex="0"
      onKeyDown={props.handleRegionKeyDown}
    >
      <GraphCanvas
        model={props.renderModel}
        theme={props.theme()}
        projection={projection()}
        depth={depth()}
        cardFacing={props.cardFacing()}
        selection={props.selection()}
        preferredRenderer={props.preferredRenderer}
        overrides={props.rendererOverrides}
        onSelect={(ids) => {
          props.setGroupMenu(undefined)
          if (ids.length > 0) props.select(ids[0])
        }}
        onNodeDoubleClick={props.onNodeDoubleClick}
        onBackgroundClick={() => {
          props.setGroupMenu(undefined)
          props.select(undefined)
        }}
        onHover={props.onHover}
        onEdgeHover={props.onEdgeHover}
        onEdgeSelect={props.onEdgeSelect}
        onGroupToggle={props.onGroupToggle}
        onGroupMenu={(id, at) => {
          const rect = canvasRegionEl()?.getBoundingClientRect()
          if (rect) props.setGroupMenu({ id, x: at.x - rect.left, y: at.y - rect.top })
        }}
        onNodeMoved={props.onNodeMoved}
        onNodeResized={props.onNodeResized}
        onModelApplied={props.applyModel}
        onRenderer={(instance) => {
          props.onRenderer?.(instance)
        }}
        onRendererMounted={(renderer: GraphRenderer, id: RendererID) => {
          setRenderer(renderer)
          props.onRendererMounted?.(renderer, id)
        }}
        onReady={props.onReady}
        onViewportChange={props.onViewportChange}
        onError={props.onError}
      />
      <GraphOverlayManager
        // Model & theme
        model={props.model}
        theme={props.theme()}
        projection={props.projection()}
        depth={props.depth()}
        detailMode={props.detailMode()}
        effectiveDetailMode={props.effectiveDetailMode}
        layout={props.layout()}

        // Selection & navigation
        selection={props.selection}
        select={props.select}
        graphSelection={props.graphSelection}

        // Peek
        peekFrame={props.peekFrame}
        peekEdge={props.peekEdge}

        // Popover
        popoverVisible={props.popoverVisible}
        popoverNode={props.popoverNode}
        popoverPlacement={props.popoverPlacement}
        setPopoverDismissed={props.setPopoverDismissed}

        // Annotations (notes + trace)
        annotations={props.annotations}
        noteTargetNode={props.noteTargetNode}
        noteAnchor={props.noteAnchor}

        // Search
        searchOpen={props.searchOpen}
        searchInitial={props.searchInitial() ?? ""}
        setSearchOpen={props.setSearchOpen}
        jumpTo={props.jumpTo}

        // Legend
        legendOpen={props.legendOpen}
        setLegendOpen={props.setLegendOpen}
        edgeKinds={props.edgeKinds}
        rules={props.rules}

        // Gallery
        galleryOpen={props.galleryOpen}
        setGalleryOpen={props.setGalleryOpen}
        changeLayout={props.changeLayout}

        // Group menu
        groupMenu={props.groupMenu}
        setGroupMenu={props.setGroupMenu}
        groupCollapse={props.groupCollapse}
        camera={props.camera}
        toggleGroupByID={props.toggleGroupByID}
        modelForGroupMenu={props.modelForGroupMenu}

        // Error/Empty states
        error={props.error() ?? ""}
        onBack={props.onBack}

        // Diff
        diffSource={props.diffSource}
        link={props.link}
        onOpenTranscript={props.onOpenTranscript}
        onOpenSession={props.onOpenSession}
        onOpenWindow={props.onOpenWindow}
        onCopyView={props.onCopyView}
        renderSummary={props.renderSummary}

        // A11y
        ordered={props.ordered}
        viewAnnouncement={props.viewAnnouncement}
        a11yInstructionsId={props.a11yInstructionsId}
        announce={props.announce}
        i18n={props.i18n}
      />
    </div>
  )
}