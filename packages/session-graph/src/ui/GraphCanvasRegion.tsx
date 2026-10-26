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
import { Show, type JSX } from "solid-js"
import { GraphCanvas } from "../canvas/GraphCanvas"
import type { RendererFactory, RendererID } from "../canvas/renderer-registry"
import type { CardTemplate } from "../canvas/buildRenderModel"
import { GraphA11y } from "./GraphA11y"
import { GraphLegend } from "./GraphLegend"
import type { GraphDiffSource } from "./GraphDiff"
import { GraphNoteComposer } from "./GraphNoteComposer"
import { GraphPeek } from "./GraphPeek"
import { GraphPopover } from "./GraphPopover"
import { GraphSearch } from "./GraphSearch"
import { GraphWindows, type GraphWindowState } from "./GraphWindows"
import { GraphGroupMenu } from "./GraphGroupMenu"
import { GraphGallery } from "./GraphGallery"
import { GraphError } from "./GraphError"
import { GraphEmpty } from "./GraphEmpty"
import { windowKind, type GraphWindowKind } from "./graph-windows"
import { createGraphCamera } from "./graph-camera"
import { createNodeAnchor } from "./graph-anchors"


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
  onOpenWindow: ((window: GraphWindowState) => void) | undefined
  onWindowsChange: ((windows: GraphWindowState[]) => void) | undefined
  windows: readonly GraphWindowState[]
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
  openWindow: (kind: string, nodeID?: string) => GraphWindowState
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
  windowKinds: GraphWindowKind[]
  windowContent: (window: GraphWindowState) => JSX.Element
  windowAnchors: () => Map<string, { x: number; y: number }> | undefined
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
      <Show when={props.groupMenu}>
        {(menu) => (
          <GraphGroupMenu
            id={menu().id}
            x={menu().x}
            y={menu().y}
            model={props.model}
            collapsedGroups={props.groupCollapse.collapsedGroups()}
            onToggleGroup={props.toggleGroupByID}
            onCollapseOthers={props.groupCollapse.collapseOtherGroups}
            onFrame={(id) => props.camera.frame([id])}
            onClose={() => props.setGroupMenu(undefined)}
          />
        )}
      </Show>
      <GraphA11y
        model={props.ordered}
        selection={props.selection()}
        instructionsId={props.a11yInstructionsId}
        announcement={props.viewAnnouncement}
        onSelect={props.select}
        onEscape={() => props.select(undefined)}
      />
      <Show when={props.peekFrame}>
        {(frame) => (
          <div
            data-slot="graph-peek-anchor"
            class="absolute z-20 -translate-x-1/2"
            style={{ left: `${frame().left}px`, top: `${frame().top}px` }}
          >
            <GraphPeek node={frame().node} />
          </div>
        )}
      </Show>
      <Show when={props.peekEdge}>
        {(edge) => (
          <div data-slot="graph-edge-peek-anchor" class="absolute bottom-2 left-2 z-20">
            <GraphPeek edge={edge()} />
          </div>
        )}
      </Show>
      <Show when={props.notes.noteTarget()}>
        <GraphNoteComposer
          targetLabel={props.noteTargetNode()?.label ?? props.notes.noteTarget() ?? ""}
          initialValue={props.notes.editingNote() ? (props.notes as unknown as Record<string, { body: string }>)[props.notes.editingNote()!]?.body : undefined}
          anchor={props.noteAnchor()}
          onSave={props.notes.saveNote}
          onClose={props.notes.closeNoteComposer}
        />
      </Show>
      <Show when={props.effectiveDetailMode === "popover"}>
        <div
          data-slot="graph-popover-anchor"
          class="absolute z-20"
          style={{
            left: `${props.popoverPlacement.left}px`,
            top: `${props.popoverPlacement.top}px`,
            display: props.popoverVisible ? "block" : "none",
          }}
        >
          <GraphPopover
            model={props.model()}
            node={props.popoverNode}
            diffSource={props.diffSource}
            renderSummary={props.renderSummary}
            link={props.link}
            onCopyView={props.onCopyView}
            onSelect={props.select}
            onOpenTranscript={props.onOpenTranscript ? props.openInTranscript : undefined}
            onOpenSession={props.onOpenSession}
            onOpenWindow={(node) => props.openWindow("node", node.id)}
            onClose={() => props.setPopoverDismissed(true)}
            traceKind={props.trace.traceKind()}
            onTraceWhy={props.trace.traceWhy}
            onTraceLedHere={props.trace.traceLedHere}
            onTraceRelated={props.trace.traceRelated}
            onClearTrace={props.trace.clearTrace}
            onCopyTraceOutline={props.trace.copyTraceOutline}
            onEditNote={props.notes.editNote}
            onDeleteNote={props.notes.deleteNote}
            onCopyNote={props.notes.copyNote}
          />
        </div>
      </Show>
      <GraphWindows
        windows={props.windows}
        onChange={props.onWindowsChange}
        onClose={(id) => props.onWindowsChange?.((props.windows ?? []).filter((w) => w.id !== id))}
        title={(window) =>
          windowKind(props.windowKinds, window)?.title(window) ?? props.i18n.t("ui.sessionGraph.window.detail")
        }
        render={props.windowContent}
        anchorOf={(nodeID): { x: number; y: number } | undefined => props.windowAnchors()?.get(nodeID)}
        bounds={() => props.canvasSize}
      />
      <GraphError error={props.error} onBack={props.onBack} />
      <GraphEmpty model={props.model} error={props.error} />
      <Show when={props.searchOpen}>
        <GraphSearch
          model={props.model()}
          initialQuery={props.searchInitial}
          onSelect={(node) => {
            props.jumpTo(node)
            props.setSearchOpen(false)
          }}
          onClose={() => props.setSearchOpen(false)}
        />
      </Show>
      <Show when={props.legendOpen}>
        <GraphLegend
          theme={props.theme}
          layout={props.layout}
          rules={props.rules}
          edgeKinds={props.edgeKinds.edgeKinds()}
          onToggleEdgeKind={props.edgeKinds.toggleEdgeKind}
          onClose={() => props.setLegendOpen(false)}
        />
      </Show>
      <Show when={props.galleryOpen}>
        <GraphGallery
          model={props.model()}
          theme={props.theme}
          current={props.layout}
          onOpen={props.changeLayout}
          onClose={() => props.setGalleryOpen(false)}
        />
      </Show>
    </div>
  )
}