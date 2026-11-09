import { useI18n } from "@opencode/ui/context/i18n"
import { createUniqueId } from "solid-js"
import { createStore, produce, type SetStoreFunction } from "solid-js/store"
import { createEffect } from "solid-js"
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
  capabilities: import("@spacegraphjs/renderer").RendererCapabilities | undefined
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

  // Demo / first-run
  demoSeen: boolean
  demoDismissed: boolean

  // See-map prompt
  seeMapPromptVisible: boolean
  seeMapPromptDismissed: boolean

  // Trust lens
  trustLens: boolean

  // Model
  notesStore: Annotations

  // Drill-down (Phase 10.3: fractal drill-down)
  drillDownStack: {
    model: GraphViewData
    selection: string | undefined
    camera: { zoom: number; center: number[] } | undefined
  }[]
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
  demoSeen: false,
  demoDismissed: false,
  seeMapPromptVisible: false,
  seeMapPromptDismissed: false,
  trustLens: false,
  notesStore: {},
  drillDownStack: [],
}

const MAX_HISTORY = 50

export type UseGraphStateReturn = {
  i18n: ReturnType<typeof useI18n>
  a11yInstructionsId: string
  resolvedTheme: () => RenderTheme

  // Controlled state
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
  capabilities: () => import("@spacegraphjs/renderer").RendererCapabilities | undefined
  setCapabilities: (capabilities: import("@spacegraphjs/renderer").RendererCapabilities | undefined) => void
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

  // Demo / first-run
  demoSeen: () => boolean
  setDemoSeen: (seen: boolean | ((prev: boolean) => boolean)) => void
  demoDismissed: () => boolean
  setDemoDismissed: (dismissed: boolean | ((prev: boolean) => boolean)) => void

  // See-map prompt
  seeMapPromptVisible: () => boolean
  setSeeMapPromptVisible: (visible: boolean | ((prev: boolean) => boolean)) => void
  seeMapPromptDismissed: () => boolean
  setSeeMapPromptDismissed: (dismissed: boolean | ((prev: boolean) => boolean)) => void

  // Trust lens
  trustLens: () => boolean
  setTrustLens: (enabled: boolean | ((prev: boolean) => boolean)) => void

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

  // Drill-down (Phase 10.3: fractal drill-down)
  drillDownStack: () => GraphState["drillDownStack"]
  enterDrillDown: (subgraph: GraphViewData, sourceId: string, camera: { zoom: number; center: number[] } | undefined) => void
  exitDrillDown: () => void
  canDrillDown: () => boolean

  // Model
  notesStore: Annotations
  model: () => GraphViewData

  // Functions
  announce: (message: string) => void
}

function createGetter<K extends keyof GraphState>(state: GraphState, key: K): () => GraphState[K] {
  return () => state[key]
}

function createSetter<K extends keyof GraphState>(setStateFn: SetStoreFunction<GraphState>, key: K): (value: GraphState[K] | ((prev: GraphState[K]) => GraphState[K])) => void {
  return (value) => setStateFn(key, value)
}

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
    // Initialize from localStorage (client-side only)
    demoSeen: typeof window !== "undefined" ? localStorage.getItem("sessionGraph.demoSeen") === "true" : false,
    demoDismissed: typeof window !== "undefined" ? localStorage.getItem("sessionGraph.demoDismissed") === "true" : false,
    seeMapPromptDismissed: typeof window !== "undefined" ? localStorage.getItem("sessionGraph.seeMapPromptDismissed") === "true" : false,
    trustLens: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("lens") === "unverified" : false,
  })

  // Persist demo/prompt dismissal to localStorage
  if (typeof window !== "undefined") {
    const demoSeenKey = "sessionGraph.demoSeen"
    const demoDismissedKey = "sessionGraph.demoDismissed"
    const seeMapPromptDismissedKey = "sessionGraph.seeMapPromptDismissed"

    // Track demo seen
    createEffect(() => {
      if (state.demoSeen) localStorage.setItem(demoSeenKey, "true")
    })

    createEffect(() => {
      if (state.demoDismissed) localStorage.setItem(demoDismissedKey, "true")
    })

    createEffect(() => {
      if (state.seeMapPromptDismissed) localStorage.setItem(seeMapPromptDismissedKey, "true")
    })
  }

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
    level: createGetter(state, "level"),
    setLevel: createSetter(setState, "level"),
    projection: createGetter(state, "projection"),
    setProjection: createSetter(setState, "projection"),
    depth: createGetter(state, "depth"),
    setDepth: createSetter(setState, "depth"),
    layout: createGetter(state, "layout"),
    setLayout: createSetter(setState, "layout"),
    files: createGetter(state, "files"),
    setFiles: createSetter(setState, "files"),
    detailMode: createGetter(state, "detailMode"),
    setDetailMode: createSetter(setState, "detailMode"),
    detailFraming: createGetter(state, "detailFraming"),
    setDetailFraming: createSetter(setState, "detailFraming"),
    peek: createGetter(state, "peek"),
    setPeek: createSetter(setState, "peek"),
    followLog: createGetter(state, "followLog"),
    setFollowLog: createSetter(setState, "followLog"),
    facets: createGetter(state, "facets"),
    setFacets: createSetter(setState, "facets"),

    // Card facing
    cardFacing: createGetter(state, "cardFacing"),
    setCardFacing: createSetter(setState, "cardFacing"),
    toggleBillboard: () => createSetter(setState, "cardFacing")((c: "plane" | "camera") => c === "camera" ? "plane" : "camera"),

    // UI state
    searchOpen: createGetter(state, "searchOpen"),
    setSearchOpen: createSetter(setState, "searchOpen"),
    searchInitial: createGetter(state, "searchInitial"),
    setSearchInitial: createSetter(setState, "searchInitial"),
    legendOpen: createGetter(state, "legendOpen"),
    setLegendOpen: createSetter(setState, "legendOpen"),
    galleryOpen: createGetter(state, "galleryOpen"),
    setGalleryOpen: createSetter(setState, "galleryOpen"),
    findInitialTab: createGetter(state, "findInitialTab"),
    setFindInitialTab: createSetter(setState, "findInitialTab"),

    // Popover
    popoverDismissed: createGetter(state, "popoverDismissed"),
    setPopoverDismissed: createSetter(setState, "popoverDismissed"),

    // Hover
    hovered: createGetter(state, "hovered"),
    setHovered: createSetter(setState, "hovered"),
    edgeHovered: createGetter(state, "edgeHovered"),
    setEdgeHovered: createSetter(setState, "edgeHovered"),

    // Renderer state
    capabilities: createGetter(state, "capabilities"),
    setCapabilities: createSetter(setState, "capabilities"),
    rendererReady: createGetter(state, "rendererReady"),
    setRendererReady: createSetter(setState, "rendererReady"),
    rendererID: createGetter(state, "rendererID"),
    setRendererID: createSetter(setState, "rendererID"),
    fallback: createGetter(state, "fallback"),
    setFallback: createSetter(setState, "fallback"),
    error: createGetter(state, "error"),
    setError: createSetter(setState, "error"),

    // Responsive
    narrow: createGetter(state, "narrow"),
    setNarrow: createSetter(setState, "narrow"),
    compact: createGetter(state, "compact"),
    setCompact: createSetter(setState, "compact"),
    inspectorWidth: createGetter(state, "inspectorWidth"),
    setInspectorWidth: createSetter(setState, "inspectorWidth"),
    inspectorSheetOpen: createGetter(state, "inspectorSheetOpen"),
    setInspectorSheetOpen: createSetter(setState, "inspectorSheetOpen"),
    canvasSize: createGetter(state, "canvasSize"),
    setCanvasSize: createSetter(setState, "canvasSize"),

    // Demo / first-run
    demoSeen: createGetter(state, "demoSeen"),
    setDemoSeen: createSetter(setState, "demoSeen"),
    demoDismissed: createGetter(state, "demoDismissed"),
    setDemoDismissed: createSetter(setState, "demoDismissed"),

    // See-map prompt
    seeMapPromptVisible: createGetter(state, "seeMapPromptVisible"),
    setSeeMapPromptVisible: createSetter(setState, "seeMapPromptVisible"),
    seeMapPromptDismissed: createGetter(state, "seeMapPromptDismissed"),
    setSeeMapPromptDismissed: createSetter(setState, "seeMapPromptDismissed"),

    // Trust lens
    trustLens: createGetter(state, "trustLens"),
    setTrustLens: createSetter(setState, "trustLens"),

    // Manual layout
    manual: state.manual,
    setManual,
    manualHistory: createGetter(state, "manualHistory"),
    setManualHistory: createSetter(setState, "manualHistory"),
    manualFuture: createGetter(state, "manualFuture"),
    setManualFuture: createSetter(setState, "manualFuture"),
    pushHistory,
    undoManual,
    redoManual,

    // Drill-down (Phase 10.3: fractal drill-down)
    drillDownStack: createGetter(state, "drillDownStack"),
    enterDrillDown: (subgraph: GraphViewData, sourceId: string, camera: { zoom: number; center: number[] } | undefined) => {
      setState("drillDownStack", produce((stack) => {
        stack.push({
          model: subgraph,
          selection: sourceId,
          camera,
        })
      }))
    },
    exitDrillDown: () => {
      setState("drillDownStack", produce((stack) => {
        if (stack.length > 0) stack.pop()
      }))
    },
    canDrillDown: () => state.drillDownStack.length > 0,

    // Model
    notesStore: state.notesStore,
    model: () => {
      const stack = state.drillDownStack
      if (stack.length > 0) {
        const top = stack[stack.length - 1]
        return { ...top.model, annotations: state.notesStore }
      }
      return props.model ? { ...props.model, annotations: state.notesStore } : emptyModel
    },

    // Functions
    announce,
  }
}