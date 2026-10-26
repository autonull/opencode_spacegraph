import { useI18n } from "@opencode/ui/context/i18n"
import { createSignal, createStore, createUniqueId } from "solid-js"
import type {
  DetailFraming,
  DetailMode,
  DepthMode,
  GraphFacets,
  GraphViewData,
  Layout,
  ZoomLevel,
} from "@opencode/session-ui/graph"
import { facetsFromQuery } from "@opencode/session-ui/graph"
import { createGraphTheme } from "./theme"

export type GraphViewProps = {
  model: GraphViewData
  theme?: any
  level?: ZoomLevel
  projection?: any
  depth?: DepthMode
  selection?: string
  files?: boolean
  detailMode?: DetailMode
  detailFraming?: DetailFraming
  peek?: boolean
  followLog?: boolean
  facetQuery?: string
  checkpoint?: number
  turnCount?: number
  liveModel?: GraphViewData
  onSelect?: (id: string | undefined) => void
}

export type UseGraphStateReturn = {
  i18n: ReturnType<typeof useI18n>
  a11yInstructionsId: string
  resolvedTheme: () => any

  // Controlled state signals
  level: () => ZoomLevel
  setLevel: (level: ZoomLevel) => void
  projection: () => any
  setProjection: (projection: any) => void
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
  facets: () => GraphFacets
  setFacets: (facets: GraphFacets) => void

  // Card facing
  cardFacing: () => "plane" | "camera"
  setCardFacing: (facing: "plane" | "camera") => void
  toggleBillboard: () => void

  // UI state signals
  searchOpen: () => boolean
  setSearchOpen: (open: boolean) => void
  searchInitial: () => string
  setSearchInitial: (initial: string) => void
  legendOpen: () => boolean
  setLegendOpen: (open: boolean) => void
  galleryOpen: () => boolean
  setGalleryOpen: (open: boolean) => void
  findInitialTab: () => "search" | "filters" | "outline"
  setFindInitialTab: (tab: "search" | "filters" | "outline") => void

  // Popover
  popoverDismissed: () => boolean
  setPopoverDismissed: (dismissed: boolean) => void

  // Hover
  hovered: () => string | undefined
  setHovered: (id: string | undefined) => void
  edgeHovered: () => string | undefined
  setEdgeHovered: (id: string | undefined) => void

  // Renderer state
  capabilities: () => any
  rendererReady: () => boolean
  setRendererReady: (ready: boolean) => void
  rendererID: () => any
  setRendererID: (id: any) => void
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

  // Manual layout
  manual: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }
  setManual: (key: "positions" | "sizes", id: string, value: [number, number, number] | [number, number]) => void
  manualHistory: () => { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]
  setManualHistory: (history: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]) => void
  manualFuture: () => { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]
  setManualFuture: (future: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]) => void
  pushHistory: () => void
  undoManual: () => void
  redoManual: () => void

  // Model
  notesStore: any
  model: () => GraphViewData

  // Functions
  announce: (message: string) => void
}

export const useGraphState = (props: GraphViewProps): UseGraphStateReturn => {
  const i18n = useI18n()
  const a11yInstructionsId = createUniqueId()
  const resolvedTheme = createGraphTheme()

  // Controlled state signals
  const [level, setLevel] = createSignal<ZoomLevel>(props.level ?? "execution")
  const [projection, setProjection] = createSignal(props.projection ?? "2d")
  const [depth, setDepth] = createSignal<DepthMode>(props.depth ?? "flat")
  const [cardFacing, setCardFacing] = createSignal<"plane" | "camera">("plane")
  const toggleBillboard = () => setCardFacing((current) => (current === "camera" ? "plane" : "camera"))
  const [layout, setLayout] = createSignal<Layout>(props.layout ?? "lanes")
  const [files, setFiles] = createSignal<boolean>(props.files ?? false)
  const [detailMode, setDetailMode] = createSignal<DetailMode>(props.detailMode ?? "panel")
  const [detailFraming, setDetailFraming] = createSignal<DetailFraming>(props.detailFraming ?? "off")
  const [peek, setPeek] = createSignal<boolean>(props.peek ?? false)
  const [followLog, setFollowLog] = createSignal<boolean>(props.followLog ?? false)
  const [facets, setFacets] = createSignal<GraphFacets>(facetsFromQuery(props.facetQuery ?? ""))

  // Announce to screen readers via the live region
  const announce = (message: string) => {
    const region = document.getElementById(a11yInstructionsId)
    if (region) region.textContent = message
  }

  // Notes store
  const [notesStore] = createStore<any>({})
  const emptyModel: GraphViewData = {
    root: "session",
    nodes: [],
    edges: [],
    turns: [],
    turnByMessageID: new Map(),
  }
  const model = () => (props.model ? { ...props.model, annotations: notesStore } : emptyModel)

  // Hover state
  const [hovered, setHovered] = createSignal<string>()
  const [edgeHovered, setEdgeHovered] = createSignal<string>()
  const [popoverDismissed, setPopoverDismissed] = createSignal(false)

  // UI state
  const [searchOpen, setSearchOpen] = createSignal(false)
  const [searchInitial, setSearchInitial] = createSignal("")
  const [legendOpen, setLegendOpen] = createSignal(false)
  const [galleryOpen, setGalleryOpen] = createSignal(false)
  const [findInitialTab, setFindInitialTab] = createSignal<"search" | "filters" | "outline">("search")

  // Renderer state
  const [capabilities] = createSignal<any>()
  const [rendererReady, setRendererReady] = createSignal(false)
  const [rendererID, setRendererID] = createSignal<any>()
  const [fallback, setFallback] = createSignal(false)
  const [error, setError] = createSignal<string>()

  // Responsive
  const [narrow, setNarrow] = createSignal(false)
  const [compact, setCompact] = createSignal(false)
  const [inspectorWidth, setInspectorWidth] = createSignal(288)
  const [inspectorSheetOpen, setInspectorSheetOpen] = createSignal(false)
  const [canvasSize, setCanvasSize] = createSignal({ width: 0, height: 0 })

  // Manual layout
  const [manual, setManual] = createStore<{
    positions: Record<string, [number, number, number]>
    sizes: Record<string, [number, number]>
  }>({ positions: {}, sizes: {} })
  const [manualHistory, setManualHistory] = createSignal<{ positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]>([])
  const [manualFuture, setManualFuture] = createSignal<{ positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]>([])

  const MAX_HISTORY = 50

  const captureManualState = () => ({
    positions: { ...manual.positions },
    sizes: { ...manual.sizes },
  })

  const pushHistory = () => {
    const state = captureManualState()
    if (Object.keys(state.positions).length > 0 || Object.keys(state.sizes).length > 0) {
      setManualHistory((prev) => [...prev.slice(-MAX_HISTORY + 1), state])
      setManualFuture([])
    }
  }

  const undoManual = () => {
    setManualHistory((prev) => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setManualFuture((fut) => [captureManualState(), ...fut.slice(-MAX_HISTORY + 1)])
      setManual("positions", last.positions)
      setManual("sizes", last.sizes)
      return prev.slice(0, -1)
    })
  }

  const redoManual = () => {
    setManualFuture((fut) => {
      if (fut.length === 0) return fut
      const next = fut[0]
      setManualHistory((prev) => [...prev.slice(-MAX_HISTORY + 1), captureManualState()])
      setManual("positions", next.positions)
      setManual("sizes", next.sizes)
      return fut.slice(1)
    })
  }

  return {
    i18n,
    a11yInstructionsId,
    resolvedTheme,

    level,
    setLevel,
    projection,
    setProjection,
    depth,
    setDepth,
    layout,
    setLayout,
    files,
    setFiles,
    detailMode,
    setDetailMode,
    detailFraming,
    setDetailFraming,
    peek,
    setPeek,
    followLog,
    setFollowLog,
    facets,
    setFacets,

    cardFacing,
    setCardFacing,
    toggleBillboard,

    searchOpen,
    setSearchOpen,
    searchInitial,
    setSearchInitial,
    legendOpen,
    setLegendOpen,
    galleryOpen,
    setGalleryOpen,
    findInitialTab,
    setFindInitialTab,

    popoverDismissed,
    setPopoverDismissed,

    hovered,
    setHovered,
    edgeHovered,
    setEdgeHovered,

    capabilities,
    rendererReady,
    setRendererReady,
    rendererID,
    setRendererID,
    fallback,
    setFallback,
    error,
    setError,

    narrow,
    setNarrow,
    compact,
    setCompact,
    inspectorWidth,
    setInspectorWidth,
    inspectorSheetOpen,
    setInspectorSheetOpen,
    canvasSize,
    setCanvasSize,

    manual,
    setManual,
    manualHistory,
    setManualHistory,
    manualFuture,
    setManualFuture,
    pushHistory,
    undoManual,
    redoManual,

    notesStore,
    model,

    announce,
  }
}