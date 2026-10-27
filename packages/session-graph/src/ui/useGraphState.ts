import { useI18n } from "@opencode/ui/context/i18n"
import { createUniqueId } from "solid-js"
import { createStore, produce } from "solid-js/store"
import type {
  DepthMode,
  Projection,
  RenderTheme,
} from "@spacegraphjs/renderer"
import type { RendererID } from "../canvas/renderer-registry"
import type {
  Annotations,
  DetailFraming,
  DetailMode,
  GraphFacets,
  GraphViewData,
  Layout,
  ZoomLevel,
} from "@opencode/session-ui/graph"
import { facetsFromQuery } from "@opencode/session-ui/graph"
import { createGraphTheme } from "./theme"

export type GraphViewProps = {
  model: GraphViewData
  theme?: RenderTheme
  level?: ZoomLevel
  projection?: Projection
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
  layout?: Layout
}

interface GraphState {
  // Controlled state
  level: ZoomLevel
  projection: Projection
  depth: DepthMode
  layout: Layout
  files: boolean
  detailMode: DetailMode
  detailFraming: DetailFraming
  peek: boolean
  followLog: boolean
  facets: GraphFacets

  // Card facing
  cardFacing: "plane" | "camera"

  // UI state
  searchOpen: boolean
  searchInitial: string
  legendOpen: boolean
  galleryOpen: boolean
  findInitialTab: "search" | "filters" | "outline"

  // Popover
  popoverDismissed: boolean

  // Hover
  hovered: string | undefined
  edgeHovered: string | undefined

  // Renderer state
  capabilities: any
  rendererReady: boolean
  rendererID: RendererID | undefined
  fallback: boolean
  error: string | undefined

  // Responsive
  narrow: boolean
  compact: boolean
  inspectorWidth: number
  inspectorSheetOpen: boolean
  canvasSize: { width: number; height: number }

  // Manual layout
  manual: {
    positions: Record<string, [number, number, number]>
    sizes: Record<string, [number, number]>
  }
  manualHistory: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]
  manualFuture: { positions: Record<string, [number, number, number]>; sizes: Record<string, [number, number]> }[]

  // Model
  notesStore: Annotations
}

export type UseGraphStateReturn = {
  i18n: ReturnType<typeof useI18n>
  a11yInstructionsId: string
  resolvedTheme: () => RenderTheme

  // Controlled state (accessors)
  level: () => ZoomLevel
  setLevel: (level: ZoomLevel | ((prev: ZoomLevel) => ZoomLevel)) => void
  projection: () => Projection
  setProjection: (projection: Projection) => void
  depth: () => DepthMode
  setDepth: (depth: DepthMode | ((prev: DepthMode) => DepthMode)) => void
  layout: () => Layout
  setLayout: (layout: Layout | ((prev: Layout) => Layout)) => void
  files: () => boolean
  setFiles: (files: boolean | ((prev: boolean) => boolean)) => void
  detailMode: () => DetailMode
  setDetailMode: (mode: DetailMode | ((prev: DetailMode) => DetailMode)) => void
  detailFraming: () => DetailFraming
  setDetailFraming: (framing: DetailFraming | ((prev: DetailFraming) => DetailFraming)) => void
  peek: () => boolean
  setPeek: (peek: boolean | ((prev: boolean) => boolean)) => void
  followLog: () => boolean
  setFollowLog: (followLog: boolean | ((prev: boolean) => boolean)) => void
  facets: () => GraphFacets
  setFacets: (facets: GraphFacets | ((prev: GraphFacets) => GraphFacets)) => void

  // Card facing
  cardFacing: () => "plane" | "camera"
  setCardFacing: (facing: "plane" | "camera" | ((prev: "plane" | "camera") => "plane" | "camera")) => void
  toggleBillboard: () => void

  // UI state
  searchOpen: () => boolean
  setSearchOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  searchInitial: () => string
  setSearchInitial: (initial: string) => void
  legendOpen: () => boolean
  setLegendOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  galleryOpen: () => boolean
  setGalleryOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  findInitialTab: () => "search" | "filters" | "outline"
  setFindInitialTab: (tab: "search" | "filters" | "outline") => void

  // Popover
  popoverDismissed: () => boolean
  setPopoverDismissed: (dismissed: boolean | ((prev: boolean) => boolean)) => void

  // Hover
  hovered: () => string | undefined
  setHovered: (id: string | undefined) => void
  edgeHovered: () => string | undefined
  setEdgeHovered: (id: string | undefined) => void

  // Renderer state
  capabilities: () => any
  rendererReady: () => boolean
  setRendererReady: (ready: boolean) => void
  rendererID: () => RendererID | undefined
  setRendererID: (id: RendererID | undefined) => void
  fallback: () => boolean
  setFallback: (fallback: boolean) => void
  error: () => string | undefined
  setError: (error: string | undefined) => void

  // Responsive
  narrow: () => boolean
  setNarrow: (narrow: boolean | ((prev: boolean) => boolean)) => void
  compact: () => boolean
  setCompact: (compact: boolean | ((prev: boolean) => boolean)) => void
  inspectorWidth: () => number
  setInspectorWidth: (width: number | ((prev: number) => number)) => void
  inspectorSheetOpen: () => boolean
  setInspectorSheetOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  canvasSize: () => { width: number; height: number }
  setCanvasSize: (size: { width: number; height: number } | ((prev: { width: number; height: number }) => { width: number; height: number })) => void

  // Manual layout
  manual: GraphState["manual"]
  setManual: (key: "positions" | "sizes", idOrValue: string | Record<string, [number, number, number]> | Record<string, [number, number]>, value?: [number, number, number] | [number, number]) => void
  manualHistory: () => GraphState["manualHistory"]
  setManualHistory: (history: GraphState["manualHistory"]) => void
  manualFuture: () => GraphState["manualFuture"]
  setManualFuture: (future: GraphState["manualFuture"]) => void
  pushHistory: () => void
  undoManual: () => void
  redoManual: () => void

  // Model
  notesStore: Annotations
  model: () => GraphViewData

  // Functions
  announce: (message: string) => void
}

const initialState: GraphState = {
  level: "execution",
  projection: "2d",
  depth: "flat",
  layout: "lanes",
  files: false,
  detailMode: "panel",
  detailFraming: "off",
  peek: false,
  followLog: false,
  facets: { query: "", kinds: new Set(), statuses: new Set(), domains: new Set(["session"]) },
  cardFacing: "plane",
  searchOpen: false,
  searchInitial: "",
  legendOpen: false,
  galleryOpen: false,
  findInitialTab: "search",
  popoverDismissed: false,
  hovered: undefined,
  edgeHovered: undefined,
  capabilities: undefined,
  rendererReady: false,
  rendererID: undefined,
  fallback: false,
  error: undefined,
  narrow: false,
  compact: false,
  inspectorWidth: 288,
  inspectorSheetOpen: false,
  canvasSize: { width: 0, height: 0 },
  manual: { positions: {}, sizes: {} },
  manualHistory: [],
  manualFuture: [],
  notesStore: {},
}

const MAX_HISTORY = 50

export const useGraphState = (props: GraphViewProps): UseGraphStateReturn => {
  const i18n = useI18n()
  const a11yInstructionsId = createUniqueId()
  const resolvedTheme = createGraphTheme()

  const [state, setState] = createStore<GraphState>({
    ...initialState,
    level: props.level ?? "execution",
    projection: props.projection ?? "2d",
    depth: props.depth ?? "flat",
    layout: props.layout ?? "lanes",
    files: props.files ?? false,
    detailMode: props.detailMode ?? "panel",
    detailFraming: props.detailFraming ?? "off",
    peek: props.peek ?? false,
    followLog: props.followLog ?? false,
    facets: facetsFromQuery(props.facetQuery ?? ""),
  })

  // Announce to screen readers via the live region
  const announce = (message: string) => {
    const region = document.getElementById(a11yInstructionsId)
    if (region) region.textContent = message
  }

  const emptyModel: GraphViewData = {
    root: "session",
    nodes: [],
    edges: [],
    turns: [],
    turnByMessageID: new Map(),
  }
  const model = () => (props.model ? { ...props.model, annotations: state.notesStore } : emptyModel)

  // Helper to set state with function support
  const set = <K extends keyof GraphState>(key: K, value: GraphState[K] | ((prev: GraphState[K]) => GraphState[K])) => {
    if (typeof value === "function") {
      setState(key, value as (prev: GraphState[K]) => GraphState[K])
    } else {
      setState(key, value)
    }
  }

  const captureManualState = () => ({
    positions: { ...state.manual.positions },
    sizes: { ...state.manual.sizes },
  })

  const pushHistory = () => {
    const captured = captureManualState()
    if (Object.keys(captured.positions).length > 0 || Object.keys(captured.sizes).length > 0) {
      setState("manualHistory", produce((history) => {
        history.push(captured)
        if (history.length > MAX_HISTORY) history.shift()
      }))
      setState("manualFuture", [])
    }
  }

  const undoManual = () => {
    setState("manualHistory", produce((history) => {
      if (history.length === 0) return
      const last = history[history.length - 1]
      setState("manualFuture", produce((fut) => {
        fut.unshift(captureManualState())
        if (fut.length > MAX_HISTORY) fut.pop()
      }))
      setState("manual", "positions", last.positions)
      setState("manual", "sizes", last.sizes)
      history.pop()
    }))
  }

  const redoManual = () => {
    setState("manualFuture", produce((fut) => {
      if (fut.length === 0) return
      const next = fut[0]
      setState("manualHistory", produce((history) => {
        history.push(captureManualState())
        if (history.length > MAX_HISTORY) history.shift()
      }))
      setState("manual", "positions", next.positions)
      setState("manual", "sizes", next.sizes)
      fut.shift()
    }))
  }

  const setManual = (
    key: "positions" | "sizes",
    idOrValue: string | Record<string, [number, number, number]> | Record<string, [number, number]>,
    value?: [number, number, number] | [number, number]
  ) => {
    if (typeof idOrValue === "string") {
      setState("manual", key, idOrValue, value as any)
    } else {
      setState("manual", key, idOrValue)
    }
  }

  return {
    i18n,
    a11yInstructionsId,
    resolvedTheme,

    // Controlled state
    level: () => state.level,
    setLevel: (v) => set("level", v),
    projection: () => state.projection,
    setProjection: (v) => set("projection", v),
    depth: () => state.depth,
    setDepth: (v) => set("depth", v),
    layout: () => state.layout,
    setLayout: (v) => set("layout", v),
    files: () => state.files,
    setFiles: (v) => set("files", v),
    detailMode: () => state.detailMode,
    setDetailMode: (v) => set("detailMode", v),
    detailFraming: () => state.detailFraming,
    setDetailFraming: (v) => set("detailFraming", v),
    peek: () => state.peek,
    setPeek: (v) => set("peek", v),
    followLog: () => state.followLog,
    setFollowLog: (v) => set("followLog", v),
    facets: () => state.facets,
    setFacets: (v) => set("facets", v),

    // Card facing
    cardFacing: () => state.cardFacing,
    setCardFacing: (v) => set("cardFacing", v),
    toggleBillboard: () => set("cardFacing", (c) => (c === "camera" ? "plane" : "camera")),

    // UI state
    searchOpen: () => state.searchOpen,
    setSearchOpen: (v) => set("searchOpen", v),
    searchInitial: () => state.searchInitial,
    setSearchInitial: (v) => set("searchInitial", v),
    legendOpen: () => state.legendOpen,
    setLegendOpen: (v) => set("legendOpen", v),
    galleryOpen: () => state.galleryOpen,
    setGalleryOpen: (v) => set("galleryOpen", v),
    findInitialTab: () => state.findInitialTab,
    setFindInitialTab: (v) => set("findInitialTab", v),

    // Popover
    popoverDismissed: () => state.popoverDismissed,
    setPopoverDismissed: (v) => set("popoverDismissed", v),

    // Hover
    hovered: () => state.hovered,
    setHovered: (v) => set("hovered", v),
    edgeHovered: () => state.edgeHovered,
    setEdgeHovered: (v) => set("edgeHovered", v),

    // Renderer state
    capabilities: () => state.capabilities,
    rendererReady: () => state.rendererReady,
    setRendererReady: (v) => set("rendererReady", v),
    rendererID: () => state.rendererID,
    setRendererID: (v) => set("rendererID", v),
    fallback: () => state.fallback,
    setFallback: (v) => set("fallback", v),
    error: () => state.error,
    setError: (v) => set("error", v),

    // Responsive
    narrow: () => state.narrow,
    setNarrow: (v) => set("narrow", v),
    compact: () => state.compact,
    setCompact: (v) => set("compact", v),
    inspectorWidth: () => state.inspectorWidth,
    setInspectorWidth: (v) => set("inspectorWidth", v),
    inspectorSheetOpen: () => state.inspectorSheetOpen,
    setInspectorSheetOpen: (v) => set("inspectorSheetOpen", v),
    canvasSize: () => state.canvasSize,
    setCanvasSize: (v) => set("canvasSize", v),

    // Manual layout
    manual: state.manual,
    setManual,
    manualHistory: () => state.manualHistory,
    setManualHistory: (v) => set("manualHistory", v),
    manualFuture: () => state.manualFuture,
    setManualFuture: (v) => set("manualFuture", v),
    pushHistory,
    undoManual,
    redoManual,

    // Model
    notesStore: state.notesStore,
    model,

    // Functions
    announce,
  }
}