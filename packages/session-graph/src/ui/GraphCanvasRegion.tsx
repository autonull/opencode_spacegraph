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
import { type JSX } from "solid-js"
import { GraphCanvas } from "../canvas/GraphCanvas"
import type { RendererFactory, RendererID } from "../canvas/renderer-registry"
import type { CardTemplate } from "../canvas/buildRenderModel"
import { GraphOverlayManager } from "./GraphOverlayManager"
import { createGraphCamera } from "./graph-camera"
import { createNodeAnchor } from "./graph-anchors"
import type { GraphDiffSource } from "./GraphDiff"


export type GraphCanvasRegionProps = {
  model: () => GraphViewData
  theme: RenderTheme
  level: ZoomLevel
  setLevel: (level: ZoomLevel) => void
  projection: Projection
  setProjection: (projection: Projection) => void
  depth: "flat" | "layered" | "depth-stack" | "orbit"
  setDepth: (depth: "flat" | "layered" | "depth-stack" | "orbit") => void
  layout: Layout
  setLayout: (layout: Layout) => void
  files: boolean
  setFiles: (files: boolean) => void
  detailMode: DetailMode
  setDetailMode: (mode: DetailMode) => void
  detailFraming: DetailFraming
  setDetailFraming: (framing: DetailFraming) => void
  peek: boolean
  setPeek: (peek: boolean) => void
  followLog: boolean
  setFollowLog: (followLog: boolean) => void
  facets: ReturnType<typeof import("@opencode/session-ui/graph").facetsFromQuery>
  setFacets: (facets: ReturnType<typeof import("@opencode/session-ui/graph").facetsFromQuery>) => void
  facetCounts: ReturnType<typeof import("@opencode/session-ui/graph").facetCounts>
  narrow: boolean
  compact: boolean
  canvasSize: { width: number; height: number }
  inspectorWidth: number
  setInspectorWidth: (width: number) => void
  inspectorSheetOpen: boolean
  setInspectorSheetOpen: (open: boolean) => void
  renderer: GraphRenderer | undefined
  setRenderer?: (renderer: GraphRenderer | undefined) => void
  setRendererReady: (ready: boolean) => void
  rendererID: string | undefined
  setRendererID: (id: string | undefined) => void
  fallback: boolean
  setFallback: (fallback: boolean) => void
  error: string | undefined
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
  onActionNavigate: ((target: { node?: string; file?: string; range?: any; url?: string; text?: string }) => void) | undefined
  onActionReveal: ((target: { node?: string; file?: string; range?: any; url?: string; text?: string }) => void) | undefined
  onActionCopy: ((text: string) => void) | undefined
  onActionRun: ((operation: { id: string; params: Record<string, unknown> }) => void) | undefined
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
  trace: ReturnType<typeof import("./useTraceOverlay").useTraceOverlay>
  notes: ReturnType<typeof import("./useNotes").useNotes>
  edgeKinds: ReturnType<typeof import("./useEdgeKinds").useEdgeKinds>
  groupCollapse: ReturnType<typeof import("./useGroupCollapse").useGroupCollapse>
  selectionVerbs: ReturnType<typeof import("./useSelectionVerbs").useSelectionVerbs>
  comparisonHook: ReturnType<typeof import("./useComparison").useComparison>
  manual: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }
  setManual: (key: "positions" | "sizes", id: string, value: [number, number, number] | [number, number]) => void
  groupedMenu: { id: string; x: number; y: number } | undefined
  setGroupMenu: (menu: { id: string; x: number; y: number } | undefined) => void
  toggleGroupByID: (id: string) => void
  selectedTurn: () => string | undefined
  changeDetailMode: (next: DetailMode) => void
  changeDetailFraming: (next: DetailFraming) => void
  changeProjection: (next: Projection) => void
  changeDepth: (next: "flat" | "layered" | "depth-stack" | "orbit") => void
  changeLayout: (next: Layout) => void
  expandToGraph: (id: string) => void
  toggleFiles: () => void
  togglePeek: () => void
  dismissDetail: () => void
  jumpTo: (node: GraphNode) => void
  raiseLevelForFrame: () => boolean
  focusFrame: (instance: GraphRenderer | undefined) => void
  framed: string | undefined
  setFramed: (id: string) => void
  openInTranscript: (id: string) => void
  openSearch: (initial?: string) => void
  toggleSearch: () => void
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  searchInitial: string
  setSearchInitial: (initial: string) => void
  legendOpen: boolean
  setLegendOpen: (open: boolean) => void
  galleryOpen: boolean
  setGalleryOpen: (open: boolean) => void
  findInitialTab: "search" | "filters" | "outline"
  setFindInitialTab: (tab: "search" | "filters" | "outline") => void
  a11yInstructionsId: string
  announce: (message: string) => void
  i18n: ReturnType<typeof useI18n>
  refitKey: string | undefined
  arrangement: GraphArrangement | undefined
  handleRegionKeyDown: (event: KeyboardEvent) => void
  setHovered: (id: string | undefined) => void
  setEdgeHovered: (id: string | undefined) => void
  setPopoverDismissed: (dismissed: boolean) => void
  groupMenu: { id: string; x: number; y: number } | undefined
  toggleBillboard: () => void
  cardFacing: "plane" | "camera"
  onZoomOut: () => void
  onZoomIn: () => void
  zoomPercent: number
  zoomOutDisabled: boolean
  zoomInDisabled: boolean
  onFit: () => void
  onCopyView: () => void
  onExport: (format: "svg" | "json" | "html", model: RenderModel) => void
  onBack: (() => void) | undefined
  onSplitView: (() => void) | undefined
  endInset: string | undefined
  sessionTitle: string | undefined
  testedCommit: string | undefined
  canvasRegionEl: HTMLDivElement | undefined

  // Computed values from GraphView
  renderModel: RenderModel
  camera: ReturnType<typeof createGraphCamera>
  setResting: (center: { zoom: number; center: number[] }) => void
  ordered: RenderModel
  viewAnnouncement: string
  peekFrame: { node: GraphNode; left: number; top: number } | undefined
  peekEdge: GraphEdge | undefined
  noteTargetNode: () => GraphNode | undefined
  noteAnchor: ReturnType<typeof createNodeAnchor>
  effectiveDetailMode: DetailMode
  popoverPlacement: { left: number; top: number }
  popoverVisible: GraphNode | undefined
  popoverNode: GraphNode | undefined
  moveNodes: (nodes: readonly { id: string; position: [number, number, number] }[]) => void
  resizeNode: (resize: { id: string; size: [number, number]; position: [number, number, number] }) => void
  applyModel: (instance: GraphRenderer) => void

  // Additional computed values from GraphView
  manualHistory: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]
  setManualHistory: (history: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]) => void
  manualFuture: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]
  setManualFuture: (future: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]) => void
  selectedTurns: () => GraphNode[]
  scale: () => ReturnType<typeof import("@opencode/session-ui/graph").scaleWindow>
  scopeBase: (source: GraphViewData) => GraphViewData
  turnOf: (id: string | undefined) => string | undefined
  scoped: GraphViewData
  counts: ReturnType<typeof import("@opencode/session-ui/graph").facetCounts>
  comparison: import("./useComparison").ComparisonChanges | undefined
  compareSelectedTurns: () => void
  clearComparison: () => void
  layoutHistory: Map<string, ReadonlyMap<string, import("@opencode/session-ui/graph").Position>>
  sessionKey: () => string
  viewKey: string
  sizedCard: (node: GraphNode) => readonly [number, number]
  rulesKey: string
  geometry: import("@opencode/session-ui/graph").GraphLayout
  needsFit: boolean
  setNeedsFit: (needsFit: boolean) => void
  turnNumbers: Map<string, number>
  axisLabels: ReturnType<typeof import("./axisLabels").buildAxisLabels>
  drawn: GraphViewData
  resting: [number, number, number] | undefined
  budget: ReturnType<typeof import("@opencode/session-ui/graph").applyNodeBudget>
  applyManualLayout: (model: RenderModel) => RenderModel
  contentIDs: () => string[]
  fitOptions: () => { minScale: number; insets: undefined }
  inspectorOpen: boolean
  cardScreenWidth: number
  peekNode: GraphNode | undefined
  peekAnchor: ReturnType<typeof createNodeAnchor>
  peekPlacement: { left: number; top: number } | undefined
  changedFilesList: ReturnType<typeof import("@opencode/session-ui/graph").changedFiles>
  fitSubtree: (id: string) => void
}

/**
 * The canvas region of the graph view — the renderer, overlays, and all interactive surfaces
 * that live on or above the canvas.
 */
export const GraphCanvasRegion = (props: GraphCanvasRegionProps) => {
  const i18n = props.i18n

  return (
    <div
      ref={props.canvasRegionEl}
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
        theme={props.theme}
        projection={props.projection}
        depth={props.depth}
        selection={props.selection()}
        preferredRenderer={props.preferredRenderer}
        overrides={props.rendererOverrides}
        onSelect={(ids) => {
          props.setGroupMenu(undefined)
          if (ids.length > 0) props.select(ids[0])
        }}
        onNodeDoubleClick={props.expandToGraph}
        onBackgroundClick={() => {
          props.setGroupMenu(undefined)
          props.select(undefined)
        }}
        onHover={props.setHovered}
        onEdgeHover={props.setEdgeHovered}
        onEdgeSelect={(id) => {
          const edge = props.model().edges.find((item) => item.id === id)
          if (!edge) return
          props.select(edge.source)
          props.trace.startTrace("related", edge.source)
        }}
        onGroupToggle={props.toggleGroupByID}
        onGroupMenu={(id, at) => {
          const rect = props.canvasRegionEl?.getBoundingClientRect()
          if (rect) props.setGroupMenu({ id, x: at.x - rect.left, y: at.y - rect.top })
        }}
        onNodeMoved={props.moveNodes}
        onNodeResized={props.resizeNode}
        cardFacing={props.cardFacing}
        onModelApplied={props.applyModel}
        onRenderer={(instance) => {
          props.setRenderer?.(instance)
          props.setRendererReady(!!instance)
          props.onRenderer?.(instance)
        }}
        onReady={(info) => {
          props.setError(undefined)
          props.setRendererID(info.id)
          props.setFallback(info.fallback)
        }}
        onError={(cause) => props.setError(cause instanceof Error ? cause.message : String(cause))}
        onViewportChange={(next) => {
          props.camera.report(next)
          props.setResting(next)
          props.setViewport(next)
        }}
      />
      <GraphOverlayManager
        // Model & theme
        model={props.model}
        theme={props.theme}
        projection={props.projection}
        depth={props.depth}
        detailMode={props.detailMode}
        effectiveDetailMode={props.effectiveDetailMode}
        layout={props.layout}

        // Selection & navigation
        selection={props.selection}
        select={props.select}

        // Peek
        peekFrame={props.peekFrame}
        peekEdge={props.peekEdge}

        // Popover
        popoverVisible={props.popoverVisible}
        popoverNode={props.popoverNode}
        popoverPlacement={props.popoverPlacement}
        setPopoverDismissed={props.setPopoverDismissed}

        // Notes
        notes={props.notes}
        noteTargetNode={props.noteTargetNode}
        noteAnchor={props.noteAnchor}

        // Search
        searchOpen={props.searchOpen}
        searchInitial={props.searchInitial}
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
        modelForGroupMenu={props.model}

        // Error/Empty states
        error={props.error}
        onBack={props.onBack}

        // Trace
        trace={props.trace}

        // Diff
        diffSource={props.diffSource}
        link={props.link}
        onOpenTranscript={props.onOpenTranscript}
        onOpenSession={props.onOpenSession}
        onCopyView={props.onCopyView}
        renderSummary={props.renderSummary}

        // Canvas
        canvasRegionEl={props.canvasRegionEl}

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