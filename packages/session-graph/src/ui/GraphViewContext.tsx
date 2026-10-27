import { createContext, useContext } from "solid-js"
import type { GraphRenderer } from "@spacegraphjs/renderer"
import type { GraphViewData, GraphNode, GraphEdge, Layout, ZoomLevel, DetailMode, DetailFraming, DepthMode, GraphArrangement, Position, EqualizerRuleSet } from "@opencode/session-ui/graph"
import type { RenderModel, RenderTheme, Projection } from "@spacegraphjs/renderer"
import type { RendererID, RendererFactory } from "../canvas/renderer-registry"
import type { CardTemplate } from "../canvas/buildRenderModel"
import type { GraphDiffSource } from "./GraphDiff"
import type { UseGraphAnnotationsReturn } from "./useGraphAnnotations"
import type { UseGraphSelectionReturn } from "./useGraphSelection"
import { GraphActionTarget } from "./GraphActionTarget"
import type { GraphViewportTrackerReturn } from "./useGraphViewport"
import type { UseComparisonReturn } from "./useComparison"
import type { UseGroupCollapseReturn } from "./useGroupCollapse"
import type { UseEdgeKindsReturn } from "./useEdgeKinds"

export interface GraphViewContextValue {
  // Model & theme
  model: () => GraphViewData
  theme: () => RenderTheme
  level: () => ZoomLevel
  setLevel: (level: ZoomLevel) => void
  projection: () => Projection
  setProjection: (projection: Projection) => void
  depth: () => DepthMode
  setDepth: (depth: DepthMode) => void
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

  // Renderer
  renderer: GraphRenderer | undefined
  setRenderer: (renderer: GraphRenderer | undefined) => void
  rendererID: RendererID | undefined
  setRendererID: (id: RendererID | undefined) => void
  rendererReady: () => boolean
  setRendererReady: (ready: boolean) => void
  fallback: () => boolean
  setFallback: (fallback: boolean) => void
  error: () => string | undefined
  setError: (error: string | undefined) => void

  // Responsive
  narrow: () => boolean
  setNarrow: (narrow: boolean) => void
  compact: () => boolean
  setCompact: (compact: boolean) => void
  inspectorWidth: () => number
  setInspectorWidth: (width: number) => void
  inspectorSheetOpen: () => boolean
  setInspectorSheetOpen: (open: boolean) => void
  canvasSize: () => { width: number; height: number }
  setCanvasSize: (size: { width: number; height: number }) => void

  // Selection & navigation
  selection: () => readonly string[]
  select: (id: string | undefined, add?: boolean) => void
  graphSelection: UseGraphSelectionReturn
  annotations: UseGraphAnnotationsReturn
  edgeKinds: UseEdgeKindsReturn
  groupCollapse: UseGroupCollapseReturn
  comparisonHook: UseComparisonReturn

  // Manual layout
  manual: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }
  setManual: (key: "positions" | "sizes", idOrValue: string | Record<string, [number, number, number]> | Record<string, [number, number]>, value?: [number, number, number] | [number, number]) => void
  manualHistory: () => { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]
  setManualHistory: (history: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]) => void
  manualFuture: () => { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]
  setManualFuture: (future: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]) => void
  pushHistory: () => void
  undoManual: () => void
  redoManual: () => void

  // Viewport
  viewport: { zoom: number; center: number[] } | undefined
  setViewport: (vp: { zoom: number; center: number[] } | undefined) => void
  camera: GraphViewportTrackerReturn["camera"]
  viewportTracker: GraphViewportTrackerReturn

  // Overlays
  peekFrame: { node: GraphNode; left: number; top: number } | undefined
  peekEdge: GraphEdge | undefined
  noteTargetNode: () => GraphNode | undefined
  noteAnchor: ReturnType<typeof import("./graph-anchors").createNodeAnchor>
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

  // Render model
  renderModel: RenderModel
  ordered: RenderModel

  // Computed values
  displayPositions: () => ReadonlyMap<string, Position>
  geometry: any
  layoutHistory: Map<string, ReadonlyMap<string, Position>>
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
  budget: any
  applyManualLayout: (model: RenderModel) => RenderModel
  contentIDs: () => string[]
  fitOptions: () => { minScale: number; insets: undefined }
  inspectorOpen: boolean
  cardScreenWidth: number
  peekNode: GraphNode | undefined
  peekAnchor: ReturnType<typeof import("./graph-anchors").createNodeAnchor>
  peekPlacement: { left: number; top: number } | undefined
  changedFilesList: any
  fitSubtree: (id: string) => void
  windowAnchor: string | undefined
  activeTurn: string | undefined
  scopeBase: (source: GraphViewData) => GraphViewData
  turnOf: (id: string | undefined) => string | undefined
  scoped: GraphViewData
  counts: any
  comparison: any
  compareSelectedTurns: () => void
  clearComparison: () => void

  // Handlers
  changeDetailMode: (next: DetailMode) => void
  changeDetailFraming: (next: DetailFraming) => void
  changeProjection: (next: Projection) => void
  changeDepth: (next: DepthMode) => void
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
  i18n: ReturnType<typeof import("@opencode/ui/context/i18n").useI18n>
  refitKey: string | undefined
  arrangement: GraphArrangement | undefined
  handleRegionKeyDown: (event: KeyboardEvent) => void
  setHovered: (id: string | undefined) => void
  setEdgeHovered: (id: string | undefined) => void
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
  canvasRegionRef: (el: HTMLDivElement | undefined) => void
  rendererOverrides: Partial<Record<RendererID, RendererFactory>> | undefined
  preferredRenderer: RendererID | undefined
  onRenderer: ((renderer: GraphRenderer | undefined) => void) | undefined
  renderCard: CardTemplate | undefined
  renderSummary: ((node: GraphNode) => any) | undefined
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
  onRulesChange: ((rules: any[]) => void) | undefined
  onSelect: ((id: string | undefined) => void) | undefined
  onProjectionChange: ((projection: Projection) => void) | undefined
  onDepthChange: ((depth: DepthMode) => void) | undefined
  onLayoutChange: ((layout: Layout) => void) | undefined
  onFilesChange: ((files: boolean) => void) | undefined
  onDetailModeChange: ((mode: DetailMode) => void) | undefined
  onDetailFramingChange: ((framing: DetailFraming) => void) | undefined
  onPeekChange: ((peek: boolean) => void) | undefined
  onTurnMap: ((turnID: string) => void) | undefined
  applyModel: (instance: GraphRenderer) => void
  selectedTurns: () => any[]
  scale: () => any
  viewportTrackerRef: { current: GraphViewportTrackerReturn | undefined }
  cardScreenWidthSignal: { get: () => number; set: (v: number) => void }
}

const GraphViewContext = createContext<GraphViewContextValue | undefined>(undefined)

export const GraphViewProvider = GraphViewContext.Provider

export function useGraphViewContext(): GraphViewContextValue {
  const context = useContext(GraphViewContext)
  if (!context) {
    throw new Error("useGraphViewContext must be used within a GraphViewProvider")
  }
  return context
}