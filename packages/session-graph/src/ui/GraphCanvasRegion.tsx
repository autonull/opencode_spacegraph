import type {
  GraphRenderer,
  Projection,
  RenderTheme,
  RenderModel,
} from "@spacegraphjs/renderer"
import type {
  DetailFraming,
  DetailMode,
  EqualizerRule,
  EqualizerRuleSet,
  GraphArrangement,
  GraphViewData,
  GraphNode,
  GraphEdge,
  Layout,
  ZoomLevel,
} from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { createSignal, type JSX } from "solid-js"
import { GraphCanvas } from "../canvas/GraphCanvas"
import type { RendererFactory, RendererID } from "../canvas/renderer-registry"
import type { CardTemplate } from "../canvas/buildRenderModel"
import { GraphOverlayManager } from "./GraphOverlayManager"
import { createNodeAnchor } from "./graph-anchors"
import type { GraphDiffSource } from "./GraphDiff"
import { GraphActionTarget } from "./GraphActionTarget"
import type { UseGraphAnnotationsReturn } from "./useGraphAnnotations"
import type { UseGraphSelectionReturn } from "./useGraphSelection"
import type { UseComparisonReturn } from "./useComparison"
import type { UseGroupCollapseReturn } from "./useGroupCollapse"
import type { UseEdgeKindsReturn } from "./useEdgeKinds"
import type { GraphViewportTrackerReturn } from "./useGraphViewport"

export type GraphCanvasRegionContext = {
  model: () => GraphViewData
  theme: () => RenderTheme
  level: () => ZoomLevel
  setLevel: (level: ZoomLevel) => void
  projection: () => Projection
  setProjection: (projection: Projection) => void
  depth: () => "flat" | "layered" | "depth-stack" | "orbit"
  setDepth: (depth: "flat" | "layered" | "depth-stack" | "orbit") => void
  layout: () => Layout
  setLayout: (layout: Layout) => void
  files: () => boolean
  setFiles: (files: boolean) => void
  detailMode: () => DetailMode
  setDetailMode: (mode: DetailMode) => void
  detailFraming: () => DetailFraming
  setDetailFraming: (framing: DetailFraming) => void
  peek: () => boolean
  setPeek: (peek: boolean) => void
  followLog: () => boolean
  setFollowLog: (followLog: boolean) => void
  facets: () => any
  setFacets: (facets: any) => void
  renderer: GraphRenderer | undefined
  setRenderer?: (renderer: GraphRenderer | undefined) => void
  setRendererReady: (ready: boolean) => void
  rendererID: RendererID | undefined
  setRendererID: (id: RendererID | undefined) => void
  fallback: () => boolean
  setFallback: (fallback: boolean) => void
  error: () => string | undefined
  setError: (error: string | undefined) => void
  viewport: { zoom: number; center: number[] } | undefined
  setViewport: (vp: { zoom: number; center: number[] } | undefined) => void
  rendererOverrides: Partial<Record<RendererID, RendererFactory>> | undefined
  preferredRenderer: RendererID | undefined
  onRenderer: ((renderer: GraphRenderer | undefined) => void) | undefined
  renderCard: CardTemplate | undefined
  renderSummary: ((node: GraphNode) => JSX.Element | undefined) | undefined
  diffSource: GraphDiffSource | undefined
  link: string | undefined
  onOpenTranscript: ((id: string) => void) | undefined
  onOpenSession: ((sessionID: string) => void) | undefined
  onActionNavigate: ((target: GraphActionTarget) => void) | undefined
  onActionReveal: ((target: GraphActionTarget) => void) | undefined
  onActionCopy: ((text: string) => void) | undefined
  onActionRun: ((operation: { id: string; params: Record<string, unknown> }) => void) | undefined
  onOpenWindow: ((kind: string, nodeID?: string) => void) | undefined
  rules: EqualizerRuleSet | undefined
  onRulesChange: ((rules: EqualizerRule[]) => void) | undefined
  onSelect: ((id: string | undefined) => void) | undefined
  onProjectionChange: ((projection: Projection) => void) | undefined
  onDepthChange: ((depth: "flat" | "layered" | "depth-stack" | "orbit") => void) | undefined
  onLayoutChange: ((layout: Layout) => void) | undefined
  onFilesChange: ((files: boolean) => void) | undefined
  onDetailModeChange: ((mode: DetailMode) => void) | undefined
  onDetailFramingChange: ((framing: DetailFraming) => void) | undefined
  onPeekChange: ((peek: boolean) => void) | undefined
  onTurnMap: ((turnID: string) => void) | undefined
  windowAnchor: string | undefined
  activeTurn: string | undefined
  selection: () => readonly string[]
  select: (id: string | undefined, add?: boolean) => void
  annotations: UseGraphAnnotationsReturn
  edgeKinds: UseEdgeKindsReturn
  groupCollapse: UseGroupCollapseReturn
  comparisonHook: UseComparisonReturn
  manual: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }
  setManual: (key: "positions" | "sizes", idOrValue: string | Record<string, [number, number, number]> | Record<string, [number, number]>, value?: [number, number, number] | [number, number]) => void
  manualHistory: () => { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]
  setManualHistory: (history: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]) => void
  manualFuture: () => { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]
  setManualFuture: (future: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]) => void
  pushHistory: () => void
  undoManual: () => void
  redoManual: () => void
  camera: GraphViewportTrackerReturn["camera"]
  viewportTracker: GraphViewportTrackerReturn
  peekFrame: { node: GraphNode; left: number; top: number } | undefined
  peekEdge: GraphEdge | undefined
  noteTargetNode: () => GraphNode | undefined
  noteAnchor: ReturnType<typeof createNodeAnchor>
  effectiveDetailMode: DetailMode
  popoverPlacement: { left: number; top: number }
  popoverVisible: GraphNode | undefined
  popoverNode: GraphNode | undefined
  setPopoverDismissed: (dismissed: boolean) => void
  groupMenu: { id: string; x: number; y: number } | undefined
  setGroupMenu: (menu: { id: string; x: number; y: number } | undefined) => void
  toggleGroupByID: (id: string) => void
  selectedTurn: () => string | undefined
  toggleBillboard: () => void
  cardFacing: () => "plane" | "camera"
  renderModel: RenderModel
  ordered: RenderModel
  displayPositions: () => ReadonlyMap<string, { x: number; y: number; z: number }>
  geometry: any
  layoutHistory: Map<string, ReadonlyMap<string, { x: number; y: number; z: number }>>
  sessionKey: () => string
  viewKey: string
  sizedCard: (node: GraphNode) => readonly [number, number]
  rulesKey: string
  needsFit: boolean
  setNeedsFit: (needsFit: boolean) => void
  turnNumbers: Map<string, number>
  axisLabels: any
  drawn: GraphViewData
  resting: [number, number, number] | undefined
  setResting: (center: { zoom: number; center: number[] }) => void
  budget: any
  applyManualLayout: (model: RenderModel) => RenderModel
  contentIDs: () => string[]
  fitOptions: () => { minScale: number; insets: undefined }
  inspectorOpen: boolean
  cardScreenWidth: number
  peekNode: GraphNode | undefined
  peekAnchor: ReturnType<typeof createNodeAnchor>
  peekPlacement: { left: number; top: number } | undefined
  changedFilesList: any
  fitSubtree: (id: string) => void
  viewAnnouncement: string
  moveNodes: (nodes: readonly { id: string; position: [number, number, number] }[]) => void
  resizeNode: (resize: { id: string; size: [number, number]; position: [number, number, number] }) => void
  applyModel: (instance: GraphRenderer) => void
  selectedTurns: () => any[]
  scale: () => any
  viewportTrackerRef: { current: GraphViewportTrackerReturn | undefined }
  cardScreenWidthSignal: { get: () => number; set: (v: number) => void }
  a11yInstructionsId: string
  handleRegionKeyDown: (event: KeyboardEvent) => void
  expandToGraph: (id: string) => void
  setHovered: (id: string | undefined) => void
  setEdgeHovered: (id: string | undefined) => void
  graphSelection: UseGraphSelectionReturn
  searchOpen: boolean
  searchInitial: () => string | undefined
  setSearchOpen: (open: boolean) => void
  jumpTo: (node: GraphNode) => void
  legendOpen: boolean
  setLegendOpen: (open: boolean) => void
  galleryOpen: boolean
  setGalleryOpen: (open: boolean) => void
  changeLayout: (layout: Layout) => void
  onBack: (() => void) | undefined
  onCopyView: () => void
  announce: (message: string) => void
  i18n: ReturnType<typeof useI18n>
  refitKey: string | undefined
  arrangement: GraphArrangement | undefined
  rendererReady: boolean
  onSplitView: (() => void) | undefined
  endInset: string | undefined
  sessionTitle: string | undefined
  testedCommit: string | undefined
  canvasRegionRef: (el: HTMLDivElement | undefined) => void
  onExport: (format: "svg" | "json" | "html", model: RenderModel) => void
  onZoomOut: () => void
  onZoomIn: () => void
  zoomPercent: number
  zoomOutDisabled: boolean
  zoomInDisabled: boolean
  onFit: () => void
}

export type GraphCanvasRegionProps = {
  ctx: GraphCanvasRegionContext
}

/**
 * The canvas region of the graph view — the renderer, overlays, and all interactive surfaces
 * that live on or above the canvas.
 */
export const GraphCanvasRegion = (props: GraphCanvasRegionProps) => {
  const ctx = props.ctx
  const i18n = useI18n()
  const [canvasRegionEl, setCanvasRegionEl] = createSignal<HTMLDivElement | undefined>()

  return (
    <div
      ref={setCanvasRegionEl}
      class="relative min-w-0 flex-1"
      data-slot="graph-canvas-region"
      role="group"
      aria-label={i18n.t("ui.sessionGraph.canvas.label")}
      aria-describedby={ctx.a11yInstructionsId}
      tabindex="0"
      onKeyDown={ctx.handleRegionKeyDown}
    >
      <GraphCanvas
        model={ctx.renderModel}
        theme={ctx.theme()}
        projection={ctx.projection()}
        depth={ctx.depth()}
        selection={ctx.selection()}
        preferredRenderer={ctx.preferredRenderer}
        overrides={ctx.rendererOverrides}
        onSelect={(ids) => {
          ctx.setGroupMenu(undefined)
          if (ids.length > 0) ctx.select(ids[0])
        }}
        onNodeDoubleClick={ctx.expandToGraph}
        onBackgroundClick={() => {
          ctx.setGroupMenu(undefined)
          ctx.select(undefined)
        }}
        onHover={ctx.setHovered}
        onEdgeHover={ctx.setEdgeHovered}
        onEdgeSelect={(id) => {
          const edge = ctx.model().edges.find((item) => item.id === id)
          if (!edge) return
          ctx.select(edge.source)
          ctx.annotations.startTrace("related", edge.source)
        }}
        onGroupToggle={ctx.toggleGroupByID}
        onGroupMenu={(id, at) => {
          const rect = canvasRegionEl()?.getBoundingClientRect()
          if (rect) ctx.setGroupMenu({ id, x: at.x - rect.left, y: at.y - rect.top })
        }}
        onNodeMoved={ctx.moveNodes}
        onNodeResized={ctx.resizeNode}
        cardFacing={ctx.cardFacing()}
        onModelApplied={ctx.applyModel}
        onRenderer={(instance) => {
          ctx.setRenderer?.(instance)
          ctx.setRendererReady(!!instance)
          ctx.onRenderer?.(instance)
        }}
        onReady={(info) => {
          ctx.setError(undefined)
          ctx.setRendererID(info.id)
          ctx.setFallback(info.fallback)
        }}
        onError={(cause) => ctx.setError(cause instanceof Error ? cause.message : String(cause))}
        onViewportChange={(next) => {
          ctx.camera.report(next)
          ctx.setResting(next)
          ctx.setViewport(next)
        }}
      />
      <GraphOverlayManager
        // Model & theme
        model={ctx.model}
        theme={ctx.theme()}
        projection={ctx.projection()}
        depth={ctx.depth()}
        detailMode={ctx.detailMode()}
        effectiveDetailMode={ctx.effectiveDetailMode}
        layout={ctx.layout()}

        // Selection & navigation
        selection={ctx.selection}
        select={ctx.select}
        graphSelection={ctx.graphSelection}

        // Peek
        peekFrame={ctx.peekFrame}
        peekEdge={ctx.peekEdge}

        // Popover
        popoverVisible={ctx.popoverVisible}
        popoverNode={ctx.popoverNode}
        popoverPlacement={ctx.popoverPlacement}
        setPopoverDismissed={ctx.setPopoverDismissed}

        // Annotations (notes + trace)
        annotations={ctx.annotations}
        noteTargetNode={ctx.noteTargetNode}
        noteAnchor={ctx.noteAnchor}

        // Search
        searchOpen={ctx.searchOpen}
        searchInitial={ctx.searchInitial() ?? ""}
        setSearchOpen={ctx.setSearchOpen}
        jumpTo={ctx.jumpTo}

        // Legend
        legendOpen={ctx.legendOpen}
        setLegendOpen={ctx.setLegendOpen}
        edgeKinds={ctx.edgeKinds}
        rules={ctx.rules}

        // Gallery
        galleryOpen={ctx.galleryOpen}
        setGalleryOpen={ctx.setGalleryOpen}
        changeLayout={ctx.changeLayout}

        // Group menu
        groupMenu={ctx.groupMenu}
        setGroupMenu={ctx.setGroupMenu}
        groupCollapse={ctx.groupCollapse}
        camera={ctx.camera}
        toggleGroupByID={ctx.toggleGroupByID}
        modelForGroupMenu={ctx.model}

        // Error/Empty states
        error={ctx.error() ?? ""}
        onBack={ctx.onBack}

        // Diff
        diffSource={ctx.diffSource}
        link={ctx.link}
        onOpenTranscript={ctx.onOpenTranscript}
        onOpenSession={ctx.onOpenSession}
        onOpenWindow={ctx.onOpenWindow}
        onCopyView={ctx.onCopyView}
        renderSummary={ctx.renderSummary}

        // A11y
        ordered={ctx.ordered}
        viewAnnouncement={ctx.viewAnnouncement}
        a11yInstructionsId={ctx.a11yInstructionsId}
        announce={ctx.announce}
        i18n={ctx.i18n}
      />
    </div>
  )
}