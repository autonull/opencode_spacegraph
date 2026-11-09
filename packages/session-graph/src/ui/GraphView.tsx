import type {
  GraphRenderer,
  Projection,
  RenderTheme,
} from "@spacegraphjs/renderer"
import { DEPTH_MODES } from "@spacegraphjs/renderer"
import type { DepthMode } from "@opencode/session-ui/graph"
import type {
  DetailFraming,
  DetailMode,
  DetailTier,
  EqualizerRule,
  EqualizerRuleSet,
  GraphArrangement,
  GraphViewData,
  GraphNode,
  GraphSide,
  Layout,
  Position,
  ZoomLevel,
} from "@opencode/session-ui/graph"
import { buildFixtureGraph } from "@opencode/session-ui/graph"
import { GraphActionTarget } from "./GraphActionTarget"
import {
  CARD_SIZE,
  changedFiles,
  withAnnotations,
  type Annotations,
  DETAIL_TIER_WIDTH,
  detailTier,
  facetsFromQuery,
  facetsToQuery,
  isSummaryLayout,
  Metrics,
  nodeByID,
  nodeIndex,
  turnRows,
} from "@opencode/session-ui/graph"
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
  untrack,
  type JSX,
} from "solid-js"
import { createStore } from "solid-js/store"
import { type CardTemplate } from "../canvas/buildRenderModel"
import { createBudgetedModel, createDrawnModel } from "../canvas/buildRenderModelHelpers"
import type { RendererFactory, RendererID } from "../canvas/renderer-registry"
import { GraphBreadcrumbs } from "./GraphBreadcrumbs"
import { createBandTemplate } from "./cardTemplate"
import { useGroupBadgeAnimation } from "./useGroupBadgeAnimation"
import { createCardCopy } from "./card-copy"
import { VOCABULARY_KEYS } from "@opencode/session-ui/graph"
import type { GraphDiffSource } from "./GraphDiff"
import { GraphFileRail } from "./GraphFileRail"
import { GraphStatusBar } from "./GraphStatusBar"
import { GraphToolbar } from "./GraphToolbar"
import { GraphCompareBar } from "./GraphCompareBar"
import { GraphScaleNotice } from "./GraphScaleNotice"
import { GraphHiddenSelection } from "./GraphHiddenSelection"
import { GraphFallback } from "./GraphFallback"
import { GraphCanvasRegion } from "./GraphCanvasRegion"
import { GraphWindowManager } from "./GraphWindowManager"
import "./graph-cards.css"
import "./graph-motion.css"
import { buildAxisLabels } from "./axisLabels"
import { sessionID } from "./node-data"
import { createWidthThresholdTracker, mirror } from "./graph-utils"
import { useComparison } from "./useComparison"
import { useGroupCollapse } from "./useGroupCollapse"
import { useEdgeKinds } from "./useEdgeKinds"
import { useGraphKeyboard } from "./useGraphKeyboard"
import { useGraphState } from "./useGraphState"
import { useGraphSelection } from "./useGraphSelection"
import { useGraphAnnotations } from "./useGraphAnnotations"
import { useGraphSearch } from "./useGraphSearch"
import { usePopover } from "./usePopover"
import { createMergedTraceOverlay } from "./useMergedTraceOverlay"
import { useNodeLookup } from "./useNodeLookup"
import { useGraphExport } from "./useGraphExport"
import { useGraphWindows } from "./useGraphWindows"
import { useGraphDetailMode } from "./useGraphDetailMode"
import { useGraphPermalink } from "./useGraphPermalink"
import { useGraphNavigation } from "./useGraphNavigation"
import { useGraphViewport } from "./useGraphViewport"
import { renderInspectorPanel } from "./renderInspectorPanel"
import { useBudgetCenter } from "./useBudgetCenter"
import { useDebugMode } from "./useDebugMode"
import { useInspectorResize } from "./useInspectorResize"
import { useGraphViewModel } from "./useGraphViewModel"
import { useRenderModel } from "./useRenderModel"
import type { GraphWindowState } from "./GraphWindows"
import { useTestHarness } from "./useTestHarness"
import { useCapabilityFallback } from "./useCapabilityFallback"
import { useFitEffects } from "./useFitEffects"
import { createApplyModel } from "./useApplyModel"
import { useGeometry } from "./useGeometry"
import { useDisplayPositions } from "./useDisplayPositions"
import { useRenderCard } from "./useRenderCard"
import { createManualPositions } from "./useManualPositions"
import { useCanvasRegionProps } from "./useCanvasRegionProps"

/**
 * T1.18 — the legibility floor. A fit never shrinks an activity card below half its natural size, so
 * a view that cannot show everything (the hierarchy outline, the file lens between the rail and the
 * inspector) is panned instead of shrunk to text too small to read. Half size keeps the card's 13px
 * label at 6.5px, the size the lane views are read at.
 */
export const MIN_CARD_HEIGHT_PX = CARD_SIZE[1] / 2

/**
 * T11.2 (A) — the width the camera aims for when it frames the selected card: the closest tier's
 * threshold with a margin, so the card lands inside the tier rather than on its edge. The card mode
 * is the detail on the node, so the node's card is the one that says the most.
 */
export const READABLE_CARD_WIDTH = DETAIL_TIER_WIDTH.closest * 1.05

export type GraphViewProps = {
  model: GraphViewData
  /** Defaults to the live host theme read from CSS tokens (U3.7). */
  theme?: RenderTheme
  level?: ZoomLevel
  projection?: Projection
  /** LE.14: controlled depth spectrum (flat | layered | depth-stack | orbit); the host persists it. */
  depth?: DepthMode
  /** Controlled selection: when set, the graph mirrors it and reports changes through `onSelect`. */
  selection?: string
  preferredRenderer?: () => RendererID
  /** Replaces an adapter factory (tests and stories); the registry still owns ordering and fallback. */
  rendererOverrides?: Partial<Record<RendererID, RendererFactory>>
  positions?: ReadonlyMap<string, Position>
  /** T17.1: the controlled layout — the one axis that says how the map is drawn. The host persists it. */
  layout?: Layout
  /** The turn the map is pinned to (0-based), and how many turns the session has. */
  checkpoint?: number
  turnCount?: number
  /** B1: the live model a parked checkpoint diffs against; the host still scopes `model` to the park. */
  liveModel?: GraphViewData
  onCheckpoint?: (index: number) => void
  /** A2: the facet question carried by a permalink, in the `q=` grammar. */
  facetQuery?: string
  /** A2: the host turns the current facets into a shareable link. */
  onCopyView?: (query: string) => void
  /**
   * Where a selected node's detail is shown: nowhere, on the node itself, in a popover beside it, or
   * in the side panel. The host persists the choice; the view mirrors it.
   */
  detailMode?: DetailMode
  /** The transient peek at the node under the pointer; the host persists the choice. */
  peek?: boolean
  /** LE.12: the file-first lens (changed-files rail + bundled provenance edges); the host persists it. */
  files?: boolean
  /**
   * How the map and the log meet in the hybrid. The host owns the geometry; the view only offers
   * the choice in the toolbar, so the reader can move the map without leaving it.
   */
  arrangement?: GraphArrangement
  onArrangementChange?: (arrangement: GraphArrangement) => void
  /** Which side of the split the map takes. */
  arrangementSide?: GraphSide
  onArrangementSideChange?: (side: GraphSide) => void
  /**
   * The turn the reader is reading in the log, when the two are side by side. The map marks it, so
   * the reader sees where they are in the session without leaving the log.
   */
  activeTurn?: string
  /** T18.1: whether the map should frame the active turn from the log. */
  followLog?: boolean
  /** RF.8: host loader for a finished turn's changed-file diffs, shown on demand in the inspector. */
  diffSource?: GraphDiffSource
  /** Optional host renderer for a node's summary (for example MarkDown); falls back to plain text. */
  renderSummary?: (node: GraphNode) => JSX.Element | undefined
  renderCard?: CardTemplate
  /** Reserved inline-end length for host chrome that floats over the panel's top-right corner. */
  endInset?: string
  /** When true, all camera animations (fit, focus, depth transitions) complete instantly without easing. */
  reducedMotion?: boolean
  /**
   * The node to select and frame. The view raises the semantic level when the node is hidden
   * at the current one, then moves the camera to it once the model that carries it is applied.
   */
  frame?: string
  /**
   * A value that changes when the pane's shape changes — the host moved the map into the hybrid,
   * say. The view frames the content again, because the old frame was made for another shape.
   */
  refitKey?: string
  /** T3.5: the shareable link to the selected node; the inspector offers to copy it. */
  link?: string
  /** Exposes the live renderer so a host can drive the camera (T6.18/T6.19). */
  onRenderer?: (renderer: GraphRenderer | undefined) => void
  /** Fires when the renderer has been mounted with its id. */
  onRendererMounted?: (renderer: GraphRenderer, id: RendererID) => void
  /** Test harness for component tests — getters only. */
  testHarness?: {
    selected: () => string | undefined
    select: (id: string | undefined) => void
    setRenderer: (id: RendererID) => void
    searchOpen: () => boolean
    setSearchOpen: (open: boolean) => void
    legendOpen: () => boolean
    setLegendOpen: (open: boolean) => void
    galleryOpen: () => boolean
    setGalleryOpen: (open: boolean) => void
    groupMenu: () => { id: string; x: number; y: number } | undefined
    setGroupMenu: (menu: { id: string; x: number; y: number } | undefined) => void
    detailMode: () => DetailMode
    setDetailMode: (mode: DetailMode) => void
    level: () => ZoomLevel
    setLevel: (level: ZoomLevel) => void
    // Camera methods for motion testing
    fitContent: () => void
    frameReadable: (id: string) => void
    zoomBy: (delta: number) => void
    pending: () => boolean
    getViewport: () => { zoom: number; center: number[]; extent?: { width: number; height: number } } | undefined
  }
  onSelect?: (id: string | undefined) => void
  onProjectionChange?: (projection: Projection) => void
  onDepthChange?: (depth: DepthMode) => void
  onLayoutChange?: (layout: Layout) => void
  onFilesChange?: (files: boolean) => void
  onDetailModeChange?: (mode: DetailMode) => void
  /** T17.4: the camera frames the selected node (the "card" framing behavior). */
  detailFraming?: DetailFraming
  /** T17.4: callback when the framing behavior changes. */
  onDetailFramingChange?: (framing: DetailFraming) => void
  onPeekChange?: (peek: boolean) => void
  onOpenTranscript?: (id: string) => void
  /**
   * T6.5: opens another session — a delegation's child, a fork's origin, a child session's parent.
   * The host owns the navigation; the graph only names the session.
   */
  onOpenSession?: (sessionID: string) => void
  /** Opens the hybrid turn map (H6.2) for a turn; the toolbar offers it when a turn is selected. */
  onTurnMap?: (turnID: string) => void
  /**
   * T12: the reader's windows over the map. The host owns them — it persists them per session — and
   * the view only reports what the reader did to them.
   */
  windows?: readonly GraphWindowState[]
  onWindowsChange?: (windows: GraphWindowState[]) => void
  /** T12: the host opens a window. The view proposes its first placement; the host owns its lifetime. */
  onOpenWindow?: (window: GraphWindowState) => void
  /** T31 — action handlers from the host. */
  onActionNavigate?: (target: GraphActionTarget) => void
  onActionReveal?: (target: GraphActionTarget) => void
  onActionCopy?: (text: string) => void
  onActionRun?: (operation: { id: string; params: Record<string, unknown> }) => void
  /**
   * T15: the equalizer's rules. A size rule re-lays-out the map (the rules are part of the layout
   * key, so the map moves like it does when the level changes); a style rule rebuilds the cards.
   */
  rules?: EqualizerRuleSet
  /** T15.4: the equalizer's panel edits the rules; the host persists them per session. */
  onRulesChange?: (rules: EqualizerRule[]) => void
  onBack?: () => void
  /**
   * Puts the log beside the map. The host owns the arrangement; the view only offers the way into
   * it, so a reader who wants both does not have to leave the map to get them.
   */
  onSplitView?: () => void
  /** T3.4: session title for export metadata. */
  sessionTitle?: string
  /** T3.4: tested commit SHA for export metadata. */
  testedCommit?: string
}

/**
 * The graph surface (U3.8): toolbar, breadcrumbs, canvas, and inspector in one flex column that
 * fills the session panel. It owns semantic level, projection, and selection; the canvas owns
 * rendering. Detail always renders in the DOM inspector, never only on the canvas.
 */
export const GraphView = (props: GraphViewProps) => {
  const state = useGraphState(props)

  const {
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
    setCapabilities,
    rendererReady,
    rendererID,
    setRendererID,
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

    // Demo / first-run
    demoDismissed,
    setDemoDismissed,

    // See-map prompt
    seeMapPromptVisible,
    setSeeMapPromptVisible,
    seeMapPromptDismissed,
    setSeeMapPromptDismissed,

    // Trust lens
    trustLens,

    announce,
  } = state

  const manualPositions = createManualPositions()
  const { manual, undoManual, redoManual, moveNodes, resizeNode, history, future } = manualPositions

  // Model memo
  const emptyModel: GraphViewData = {
    root: "session",
    nodes: [],
    edges: [],
    turns: [],
    turnByMessageID: new Map(),
  }
  const [notesStore, setNotesStore] = createStore<Annotations>({})
  const model = createMemo(() => (props.model ? withAnnotations(props.model, notesStore) : emptyModel))

  // Demo model for first-run: uses canonical fixture when no session data
  const demoModel = createMemo(() => {
    if (demoDismissed()) return model()
    if (props.model && props.model.nodes.length > 0) {
      return model()
    }
    return buildFixtureGraph()
  })

  // See-map prompt: show when session has errors, compactions, or many turns (>10)
  const showSeeMapPrompt = createMemo(() => {
    if (seeMapPromptDismissed()) return false
    if (!props.model) return false
    const m = props.model
    const hasErrors = m.nodes.some((n) => n.kind === "error" || n.status === "failed")
    const hasCompactions = m.nodes.some((n) => n.kind === "compaction")
    const manyTurns = (m.turns?.length ?? 0) > 10
    return (hasErrors || hasCompactions || manyTurns) && !seeMapPromptVisible()
  })

  // Trust lens: highlight unverified files (written without later verify/test)
  const trustLensActive = createMemo(() => trustLens())

  // Shared node lookup for hooks
  const nodeLookup = useNodeLookup(demoModel)

  // Hooks for modular state/logic
  const graphSelection = useGraphSelection({
    model,
    controlled: () => props.selection,
    onSelect: (id) => props.onSelect?.(id),
    onAnnounce: announce,
  })

  // P8.1: the vanilla library controller owns interaction state (selection + trail).
  const selection = graphSelection.selection
  const select = graphSelection.select
  const selectionObj = { selection, select }

  // Test harness for component tests
  const { groupMenu, setGroupMenu } = useTestHarness(props, selectionObj, setRendererID)

  const annotations = useGraphAnnotations({
    model,
    selection,
    onAnnounce: announce,
    notes: notesStore,
    setNotes: setNotesStore,
    nodeLookup,
  })

  const edgeKinds = useEdgeKinds({ model })

  const comparisonHook = useComparison({
    model,
    liveModel: () => props.liveModel ?? model(),
    checkpoint: () => props.checkpoint,
    turnCount: () => props.turnCount,
    selection,
    nodeLookup,
  })


  const groupCollapse = useGroupCollapse({
    model,
    selection: () => selection(),
    nodeLookup,
    descendantSelected: () => {
      const sel = selection()
      if (sel.length === 0) return false
      const modelNodes = model()
      const selectedNode = modelNodes.nodes.find((n) => n.id === sel[0])
      if (!selectedNode) return false
      // Check if any group has this node as a descendant
      for (const node of modelNodes.nodes) {
        if (node.clusterOf?.includes(selectedNode.id)) return true
      }
      return false
    },
    draggingDescendant: () => false, // TODO: track dragging state
  })

  // Phase 4.11: Track group collapse/expand for a11y announcement
  const [groupAnnouncement, setGroupAnnouncement] = createSignal<string | undefined>()
  const [prevCollapsedGroups, setPrevCollapsedGroups] = createSignal<ReadonlySet<string>>(groupCollapse.collapsedGroups())
  createEffect(() => {
    const current = groupCollapse.collapsedGroups()
    const previous = prevCollapsedGroups()
    const added = new Set([...current].filter((id) => !previous.has(id)))
    const removed = new Set([...previous].filter((id) => !current.has(id)))

    for (const id of added) {
      const node = model().nodes.find((n) => n.id === id)
      if (node) {
        const count = node.clusterOf?.length ?? 0
        setGroupAnnouncement(`Group '${node.label}' collapsed, ${count} nodes`)
        // Clear after announcement
        setTimeout(() => setGroupAnnouncement(undefined), 100)
      }
    }
    for (const id of removed) {
      const node = model().nodes.find((n) => n.id === id)
      if (node) {
        const count = node.clusterOf?.length ?? 0
        setGroupAnnouncement(`Group '${node.label}' expanded, ${count} nodes`)
        setTimeout(() => setGroupAnnouncement(undefined), 100)
      }
    }
    setPrevCollapsedGroups(current)
  })

  // See-map prompt: show when session has errors, compactions, or many turns (>10)
  createEffect(() => {
    if (seeMapPromptDismissed()) return
    if (!props.model) return
    const m = props.model
    const hasErrors = m.nodes.some((n) => n.kind === "error" || n.status === "failed")
    const hasCompactions = m.nodes.some((n) => n.kind === "compaction")
    const manyTurns = (m.turns?.length ?? 0) > 10
    if (hasErrors || hasCompactions || manyTurns) {
      setSeeMapPromptVisible(true)
    }
  })

  // T18.3: the auto detail mode threshold
  const AUTO_DETAIL_THRESHOLD = 640
  const [renderer, setRenderer] = createSignal<GraphRenderer | undefined>()
  let rootEl!: HTMLDivElement
  let canvasRegionEl: HTMLDivElement | undefined
  let controllerBound = false

  // Debug mode: enabled via ?debug URL param or localStorage.debugGraph
  const { debugMode } = useDebugMode()

  // Inspector resize
  const { startResize } = useInspectorResize({
    inspectorWidth,
    setInspectorWidth,
    rootEl: () => rootEl,
  })

  // Model building (scoped, turnScoped, scale, counts, windowAnchor, selectedTurn, selectedTurns)
  const {
    scoped,
    counts,
    windowAnchor,
    selectedTurn,
    selectedTurns,
  } = useGraphViewModel({
    model: demoModel,
    facets,
    graphSelection,
    groupCollapse,
    comparisonHook,
    frame: props.frame,
    followLog,
    activeTurn: props.activeTurn,
  })

  const comparison = comparisonHook.comparison

  const compareSelectedTurns = comparisonHook.compareSelectedTurns
  const clearComparison = comparisonHook.clearComparison

  const toggleGroupByID = groupCollapse.toggleGroupByID

  // T18.1: when followLog is enabled and the active turn changes, frame it.
  const [lastFramedTurn, setLastFramedTurn] = createSignal<string>()
  createEffect(() => {
    if (!followLog()) return
    const turn = props.activeTurn
    if (!turn) return
    if (lastFramedTurn() === turn) return
    if (!rendererReady()) return
    if (!viewportTracker) return
    const current = viewportTracker.viewport()
    if (!current) return
    setLastFramedTurn(turn)
    viewportTracker.camera.frameReadable(turn)
  })

  // Width thresholds
  const widthThresholds = createWidthThresholdTracker(
    () => rootEl,
    { narrow: 768, compact: 1030 }
  )
  onMount(() => {
    if (!rootEl) return
    widthThresholds.observe((flags: { narrow?: boolean; compact?: boolean }) => {
      if (flags.narrow !== undefined) setNarrow(flags.narrow)
      if (flags.compact !== undefined) setCompact(flags.compact)
    })

    const handleCopyTraceOutline = () => annotations.copyTraceOutline()
    window.addEventListener("graph:copy-trace-outline", handleCopyTraceOutline)
    onCleanup(() => window.removeEventListener("graph:copy-trace-outline", handleCopyTraceOutline))

    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string; source?: string }>).detail
      const name = detail?.name
      if (name === "why" || name === "led-here" || name === "related") {
        annotations.startTrace(name, detail?.source)
        return
      }
      if (name === "compare") {
        compareSelectedTurns()
        return
      }
      if (name === "note") annotations.openNoteComposer()
      if (name === "failureProgress") openWindow("failureProgress")
      if (name === "find") openWindow("find")
    }
    window.addEventListener("graph:command", handleCommand)
    onCleanup(() => window.removeEventListener("graph:command", handleCommand))
  })

  // Canvas region size tracking
  onMount(() => {
    if (!canvasRegionEl) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setCanvasSize((current) => (current.width === width && current.height === height ? current : { width, height }))
    })
    observer.observe(canvasRegionEl)
    onCleanup(() => observer.disconnect())
  })

  const theme = () => props.theme ?? resolvedTheme()
  // T18.3: effective detail mode
  const effectiveDetailMode = createMemo<DetailMode>(() => {
    const mode = detailMode()
    if (mode !== "auto") return mode
    return canvasSize().width >= AUTO_DETAIL_THRESHOLD ? "panel" : "window"
  })
  const [tier, setTier] = createSignal<DetailTier>("mid")
  createEffect(() => {
    const width = cardScreenWidth()
    const current = tier()
    setTier(detailTier(width, current))
  })
  // T11.3 — file card details
  const copy = createCardCopy(i18n)

  // Phase 4.11: Track group badge animations for token bursts in folded groups
  const animatedBadgeGroups = useGroupBadgeAnimation(demoModel, groupCollapse.collapsedGroups)

  const renderBand = createMemo(() =>
    createBandTemplate(theme(), undefined, {
      copy,
      collapsedGroups: groupCollapse.collapsedGroups(),
      animatedGroups: animatedBadgeGroups(),
    }),
  )

  // Compute layout using extracted helper
  const sessionKey = createMemo(() => {
    const root = nodeIndex(demoModel()).get(demoModel().root)
    return root ? sessionID(root) ?? "session" : "session"
  })

  // Geometry
  const geometry = useGeometry(demoModel, layout, level, () => props.rules, scoped, props.positions, sessionKey)

  // Display positions
  const displayPositions = useDisplayPositions(geometry, manual) as () => Map<string, Position>

  // Merged trace overlay (explicit trace + focus dimming)
  const mergedTrace = createMergedTraceOverlay(annotations, demoModel, level, () => selection())

  // Render card
  const renderCard = useRenderCard(
    {
      renderCard: props.renderCard,
      rules: () => props.rules,
      activeTurn: props.activeTurn,
      diffSource: props.diffSource,
      renderSummary: props.renderSummary,
    },
    {
      theme,
      tier,
      selection,
      model: demoModel,
      copy,
      mergedTrace,
      comparison,
      collapsedGroups: groupCollapse.collapsedGroups,
      displayPositions,
      i18n,
    },
  )

  // LE.1: whether a structural change is waiting for the canvas to apply the matching model before we
  // frame it. Streaming model updates leave it false, so they never refit.
  const [needsFit, setNeedsFit] = createSignal(true)
  // T6.8: the view says what it changed, so a screen-reader user knows the map moved.
  const viewAnnouncement = createMemo(() =>
    i18n.t("ui.sessionGraph.a11y.view", {
      level: i18n.t(VOCABULARY_KEYS.level[level()]),
      layout: i18n.t(VOCABULARY_KEYS.layout[layout()]),
      depth: i18n.t(VOCABULARY_KEYS.depth[depth()]),
    }),
  )
  // T1.11: the summary layouts name their axes; the node-link graph names itself.
  const turnNumbers = createMemo(() => new Map(demoModel().turns.map((id, index) => [id, index + 1])))
  const axisLabels = createMemo(() => buildAxisLabels(scoped(), turnRows(scoped(), level()), layout(), turnNumbers(), i18n.t))

  // T17.2 — a summary draws the level's units, and a cluster yields to its members below the
  // overview. The render model draws the same set, so the two cannot disagree.
  const drawn = createDrawnModel(scoped, layout, level)

  // T1.18: the fit keeps a legible minimum scale; the renderer zooms in rather than shrink the
  // content past it, and the reader pans the rest.
  const fitOptions = createMemo(() => ({
    minScale: MIN_CARD_HEIGHT_PX / CARD_SIZE[1],
    insets: undefined,
  }))

  // Viewport tracker - initialized early so memos below can use it
  let viewportTracker: ReturnType<typeof useGraphViewport> | undefined
  // Card screen width memo - reacts to viewport changes
  const cardScreenWidth = createMemo(() => {
    const extent = viewportTracker?.viewport()?.extent
    const size = canvasSize()
    if (!extent?.width || !size.width) return CARD_SIZE[0]
    return (CARD_SIZE[0] * size.width) / extent.width
  })

  // Initialize viewport tracker
  viewportTracker = useGraphViewport({
    renderer,
    displayPositions: () => displayPositions() ?? new Map(),
    contentIDs: () => contentIDs?.() ?? [],
    fitOptions: () => fitOptions() ?? { minScale: MIN_CARD_HEIGHT_PX / CARD_SIZE[1], insets: undefined },
    cardScreenWidth,
    CARD_SIZE,
    READABLE_CARD_WIDTH,
    capabilities: () => capabilities(),
  })


  // Expose camera methods on testHarness for component tests
  createEffect(() => {
    if (!viewportTracker || !props.testHarness) return
    props.testHarness.fitContent = () => viewportTracker!.camera.fitContent()
    props.testHarness.frameReadable = (id: string) => viewportTracker!.camera.frameReadable(id)
    props.testHarness.zoomBy = (delta: number) => viewportTracker!.camera.zoomBy(delta as 1 | -1)
    props.testHarness.pending = () => viewportTracker!.camera.pending()
    props.testHarness.getViewport = () => viewportTracker!.viewport()
  })

  // Graph permalink hook (needs viewportTracker)
  const { raiseLevelForFrame, focusFrame } = useGraphPermalink({
    model,
    frame: props.frame,
    level,
    setLevel,
    renderer,
    viewportTracker: viewportTracker!,
    rendererReady,
    selection: selectionObj,
  })

  // Graph export hook
  const { handleExport, exportSelection } = useGraphExport({
    theme,
    sessionTitle: props.sessionTitle,
    testedCommit: props.testedCommit,
    selection: selection,
    ordered: () => ordered(),
  })

  // Graph windows hook
  const { openWindow } = useGraphWindows({
    canvasSize,
    windows: () => props.windows ?? [],
    onOpenWindow: props.onOpenWindow ?? (() => {}),
  })

  // T17.4: when detailMode is "window" (or "auto" resolving to window), open a window for the selected node's detail.
  createEffect(() => {
    if (effectiveDetailMode() !== "window") return
    const id = selection()[0]
    if (!id) return
    openWindow("node", id)
  })

  // Graph detail mode hooks
  const { changeDetailMode, changeDetailFraming, changeDepth, changeLayout } = useGraphDetailMode({
    setDetailMode,
    setDetailFraming,
    setProjection,
    setDepth,
    setLayout,
    onDetailModeChange: props.onDetailModeChange,
    onDetailFramingChange: props.onDetailFramingChange,
    onProjectionChange: props.onProjectionChange,
    onDepthChange: props.onDepthChange,
    onLayoutChange: props.onLayoutChange,
    setPopoverDismissed,
  })

  // T17.5 — the card budget follows the camera. The adapter spends the budget in the order it walks
  // the nodes, so the order decides which nodes get a card: the ones under the reader's hand.
  // Gate budget recalculation on selection change or camera rest (not every viewport update).
  const { budgetCenter } = useBudgetCenter({
    selection: () => [...selection()],
    displayPositions,
    viewportTracker: () => viewportTracker,
  })

  const budget = createBudgetedModel(drawn, displayPositions, () => selection(), budgetCenter)

  // T17.5 — the camera's resting place: the centre the camera last came to rest at. The card
  // budget follows the camera, and a budget that changed on every frame would rebuild the map on
  // every frame and make the cards churn under the reader's hand.
  // The panel takes layout width and reframes the camera when it opens; the popover and the card do
  // neither, so the map does not move under the reader when a node is selected.
  const selectedNode = createMemo(() => {
    const id = selection()[0]
    return id ? nodeByID(demoModel(), id) : undefined
  })

  const inspectorOpen = createMemo(() => effectiveDetailMode() === "panel" && !!selectedNode() || (narrow() && inspectorSheetOpen()))

  // Reactive zoom percent for toolbar
  const zoomPercent = createMemo(() => viewportTracker!.camera.zoomPercent())

  const setViewport = (vp: { zoom: number; center: number[] } | undefined) => {
    if (!vp) {
      viewportTracker!.setViewport(undefined)
      return
    }
    const current = viewportTracker!.viewport()
    const center = [vp.center[0], vp.center[1], vp.center[2] ?? 0] as const
    if (
      current &&
      current.zoom === vp.zoom &&
      current.center[0] === center[0] &&
      current.center[1] === center[1] &&
      (current.center[2] ?? 0) === center[2]
    ) {
      return
    }
    viewportTracker!.setViewport({
      zoom: vp.zoom,
      center: [...center],
      extent: current?.extent,
      band: current?.band,
    })
  }

  // Build render model using extracted helper
  const { renderModel, contentIDs, ordered } = useRenderModel({
    model: demoModel,
    layout,
    level,
    files,
    displayPositions,
    budget,
    renderCard,
    renderBand,
    axisLabels,
    windowAnchor,
    i18n,
    manualPositions: manual.positions,
    manualSizes: manual.sizes,
    hiddenEdgeKinds: edgeKinds.hiddenEdgeKinds,
    drawn,
  })

  // B1 — the selection verbs. frameSelection and exportSelection need camera/ordered (defined later).
  const frameSelection = () => viewportTracker!.camera.frame(selection())
  const keepOnlySelection = graphSelection.keepOnlySelection
  const copySelectedPaths = graphSelection.copySelectedPaths
  const clearSelection = graphSelection.clearSelection

  // Popover/peek logic extracted to hook
  const {
    popoverNode,
    popoverPlacement,
    popoverVisible,
    peekFrame,
    peekEdge,
    noteTargetNode,
    noteAnchor,
  } = usePopover({
    model,
    peek,
    effectiveDetailMode,
    selectedNode,
    hovered,
    edgeHovered,
    popoverDismissed,
    selection: graphSelection.selection,
    annotations,
    renderer,
    viewportTracker,
    canvasSize,
    cardScreenWidth,
  })

  // Graph navigation hook
  const { expandToGraph, toggleFiles, togglePeek, dismissDetail, openInTranscript, fitSubtree, exitDrillDown, canDrillDown } = useGraphNavigation({
    model,
    layout,
    setLayout,
    setFiles,
    setPeek,
    onFilesChange: props.onFilesChange,
    onPeekChange: props.onPeekChange,
    select,
    viewportTracker: viewportTracker!,
    renderer,
    onOpenTranscript: props.onOpenTranscript,
    popoverVisible,
    setPopoverDismissed,
    fitOptions,
    enterDrillDown: state.enterDrillDown,
    exitDrillDown: state.exitDrillDown,
    canDrillDown: state.canDrillDown,
    state,
  })

  // LE.12: the changed-files rail reads the model through the pure selector, so it tracks streaming.
  const changedFilesList = createMemo(() => changedFiles(demoModel()))

  const { openSearch, toggleSearch, jumpTo } = useGraphSearch({
    searchOpen,
    setSearchOpen,
    searchInitial,
    setSearchInitial,
    model: demoModel,
    selectedNode,
    selection: graphSelection.selection,
    select: graphSelection.select,
    effectiveDetailMode,
    inspectorSheetOpen,
    setInspectorSheetOpen,
    level,
    setLevel,
    viewportTracker,
    openInTranscript,
    i18n,
  })

  // Keyboard handling extracted to hook (must be after all dependencies are declared)
  const { handleRegionKeyDown } = useGraphKeyboard({
    model,
    selection: () => selection(),
    onSelect: (id, add) => select(id, add),
    camera: {
      fitContent: () => viewportTracker!.camera.fitContent(),
      frameReadable: (id: string) => viewportTracker!.camera.frameReadable(id),
      zoomBy: (delta: number) => viewportTracker!.camera.zoomBy(delta as 1 | -1),
      pending: () => viewportTracker!.camera.pending(),
    },
    annotations,
    graphSelection,
    groupCollapse,
    openWindow,
    setFindInitialTab,
    openSearch,
    setLevel,
    setGroupMenu,
    groupMenu,
    dismissDetail,
    undoManual,
    redoManual,
    onGroupToggle: toggleGroupByID,
  })

  // Copy view URL with current query parameters
  const copyView = () => {
    const query = facetsToQuery(facets())
    props.onCopyView?.(query)
  }

  // Mirror controlled props and handle capability fallback
  function mirrorProps() {
    mirror(() => props.level, setLevel)
    mirror(() => props.projection, setProjection)
    mirror(() => props.depth, setDepth)
    mirror(() => props.layout, setLayout)
    mirror(() => props.files, setFiles)
    mirror(() => props.detailMode, setDetailMode)
    mirror(() => props.peek, setPeek)
    mirror(() => props.followLog, setFollowLog)
    mirror(
      () => props.facetQuery,
      (query) => setFacets(facetsFromQuery(query)),
    )
  }
  mirrorProps()
  useCapabilityFallback(capabilities, projection, depth, setProjection, setDepth)

  // Fit effects (needsFit, selection framing, structural refit)
  useFitEffects(
    {
      refitKey: props.refitKey,
      arrangement: props.arrangement,
      layout,
      inspectorOpen,
      files,
      level,
      projection,
      depth,
    },
    {
      renderer,
      viewportTracker,
      contentIDs,
      fitOptions,
      setNeedsFit,
      needsFit,
      detailFraming,
      selection: selectionObj,
      rendererReady,
      inspectorOpen,
    },
  )

  // Apply model to renderer
  const applyModel = createApplyModel(
    raiseLevelForFrame,
    focusFrame,
    needsFit,
    setNeedsFit,
    viewportTracker,
    contentIDs,
    fitOptions,
  )

  // A structural change — the host moved the map into the hybrid, or the reader chose another
  // arrangement — frames the content again: the pane is another shape now, and the old frame no
  // longer says what the reader is looking at. A plain resize does not: the reader's own zoom and
  // pan are theirs.
  createEffect(() => {
    props.refitKey
    props.arrangement
    const instance = renderer()
    if (!instance) return
    // The fit reports a viewport synchronously, which the camera and the host's zoom readout track.
    // Fitting inside the effect's tracking scope would subscribe this effect to its own result and
    // refit forever; the structural inputs above are the only things that may request a frame.
    untrack(() =>
      viewportTracker!.camera.request(() => instance.fit(untrack(contentIDs), untrack(fitOptions))),
    )
  })

  // Build context object for GraphCanvasRegion
  const canvasRegionProps = useCanvasRegionProps(props, {
    model,
    theme,
    renderModel,
    projection,
    depth,
    layout,
    level,
    selection: () => selection(),
    select,
    expandToGraph,
    onHover: setHovered,
    onEdgeHover: setEdgeHovered,
    onEdgeSelect: (id: string) => {
      const edge = model().edges.find((item) => item.id === id)
      if (!edge) return
      select(edge.source)
      annotations.startTrace("related", edge.source)
    },
    onGroupToggle: toggleGroupByID,
    onGroupMenu: (id: string, at: { x: number; y: number }) => {
      const rect = canvasRegionEl?.getBoundingClientRect()
      if (rect) setGroupMenu({ id, x: at.x - rect.left, y: at.y - rect.top })
    },
    moveNodes,
    resizeNode,
    cardFacing: () => cardFacing(),
    applyModel,
    preferredRenderer: props.preferredRenderer as () => "spacegraph" | undefined,
    rendererOverrides: props.rendererOverrides,
    reducedMotion: () => props.reducedMotion ?? false,
    detailMode,
    effectiveDetailMode,
    files,
    debugMode,
    peekFrame,
    peekEdge,
    popoverVisible,
    popoverNode,
    popoverPlacement,
    setPopoverDismissed,
    annotations,
    noteTargetNode,
    noteAnchor,
    searchOpen,
    searchInitial,
    setSearchOpen,
    jumpTo,
    contentIDs,
    legendOpen,
    setLegendOpen,
    edgeKinds,
    rules: () => props.rules,
    galleryOpen,
    setGalleryOpen,
    changeLayout,
    groupMenu,
    setGroupMenu,
    groupCollapse,
    camera: viewportTracker!.camera,
    toggleGroupByID,
    modelForGroupMenu: model,
    graphSelection,
    handleRegionKeyDown,
    error,
    onBack: props.onBack,
    diffSource: props.diffSource,
    link: props.link,
    onOpenTranscript: props.onOpenTranscript,
    onOpenSession: props.onOpenSession,
    onOpenWindow: openWindow,
    onCopyView: copyView,
    renderSummary: props.renderSummary,
    viewAnnouncement,
    groupAnnouncement,
    ordered,
    a11yInstructionsId,
    announce,
    i18n,
    canvasRegionRef: (el: HTMLDivElement | undefined) => { canvasRegionEl = el },
    onViewportChange: (next: any) => {
      viewportTracker!.camera.report(next)
      viewportTracker!.setResting(next)
      setViewport(next)
    },
    setViewport,
    viewportTracker: viewportTracker!,
    onRenderer: (r: GraphRenderer | undefined) => {
      setRenderer(r)
      props.onRenderer?.(r)
      // Bind the GraphController to the renderer so selection changes propagate to the SpaceGraph core
      if (r && !controllerBound) {
        const selObj = graphSelection.selection
        const controller = (selObj as unknown as { controller: import("spacegraphjs/control").GraphController }).controller
        if (controller) {
          controller.bind(r)
          controllerBound = true
        }
      }
    },
    onRendererMounted: (renderer: GraphRenderer, id: RendererID) => {
      setCapabilities(renderer.capabilities)
      props.onRenderer?.(renderer)
      props.onRendererMounted?.(renderer, id)
    },
    onReady: (_info: { fallback: boolean }) => {},
    onError: setError,
    // Drill-down (Phase 10.3)
    exitDrillDown,
    canDrillDown,
    drillDownStack: state.drillDownStack,
  })

  return (
    <div
      ref={rootEl}
      data-component="session-graph-view"
      data-slot="graph-view"
      class="flex h-full w-full flex-col overflow-hidden"
    >
      <GraphToolbar
        capabilities={capabilities()}
        renderer={rendererID()}
        level={level()}
        onLevel={setLevel}
        facets={facets()}
        facetCounts={counts()}
        onFacetsChange={setFacets}
        depth={depth()}
        onDepth={changeDepth}
        depthModes={DEPTH_MODES}
        checkpoint={props.checkpoint}
        turnCount={props.turnCount}
        onCheckpoint={props.onCheckpoint}
        model={props.liveModel ?? model()}
        onFit={viewportTracker!.camera.fitContent}
        zoomPercent={zoomPercent()}
        onZoomOut={() => viewportTracker!.camera.zoomBy(-1)}
        onZoomIn={() => viewportTracker!.camera.zoomBy(1)}
        zoomOutDisabled={level() === "overview" || (viewportTracker!.viewport()?.zoom ?? 0) <= viewportTracker!.camera.zoomLimits().min}
        zoomInDisabled={(viewportTracker!.viewport()?.zoom ?? 0) >= viewportTracker!.camera.zoomLimits().max}
        onSearch={toggleSearch}
        onCopyView={copyView}
        legend={legendOpen()}
        onToggleLegend={() => setLegendOpen((open) => !open)}
        gallery={galleryOpen()}
        onToggleGallery={() => setGalleryOpen((open) => !open)}
        billboard={cardFacing() === "camera"}
        onToggleBillboard={toggleBillboard}
        detailFraming={detailFraming()}
        onDetailFramingChange={changeDetailFraming}
        layout={layout()}
        onLayoutChange={changeLayout}
        files={files()}
        onToggleFiles={toggleFiles}
        arrangement={props.arrangement}
        onArrangementChange={props.onArrangementChange}
        arrangementSide={props.arrangementSide}
        onArrangementSideChange={props.onArrangementSideChange}
        onOpenEqualizer={props.onRulesChange ? () => openWindow("equalizer") : undefined}
        onOpenWindow={openWindow}
        detailMode={detailMode()}
        onDetailModeChange={changeDetailMode}
        peek={peek()}
        onTogglePeek={togglePeek}
        followLog={followLog()}
        onFollowLogChange={setFollowLog}
        manualHistoryLength={history().length}
        manualFutureLength={future().length}
        onUndoManual={undoManual}
        onRedoManual={redoManual}
        onTurnMap={
          props.onTurnMap
            ? () => {
                const turnID = selectedTurn()
                if (!turnID) return
                Metrics.count("turn-map")
                props.onTurnMap?.(turnID)
              }
            : undefined
        }
        onExpandGraph={
          isSummaryLayout(layout()) && selection().length > 0
            ? () => expandToGraph(selection()[0]!)
            : undefined
        }
        onExport={handleExport}
        renderModel={ordered()}
        onBack={props.onBack}
        onSplitView={props.onSplitView}
        searching={searchOpen()}
        compact={compact()}
        endInset={props.endInset}
      />
      {/* Demo banner for first-run */}
      <Show when={demoDismissed() === false && props.model && props.model.nodes.length === 0}>
        <div
          data-slot="graph-demo-banner"
          class="flex items-center justify-between px-4 py-2 border-b border-border-weaker-base bg-surface-base"
          role="status"
          aria-live="polite"
        >
          <span class="text-12-regular text-text-base">{i18n.t("ui.sessionGraph.demo.label")}</span>
          <button
            type="button"
            class="flex h-6 items-center gap-1 rounded-sm px-2 text-12-regular text-text-base hover:bg-surface-base-hover"
            onClick={() => setDemoDismissed(true)}
          >
            {i18n.t("ui.sessionGraph.demo.dismiss")}
          </button>
        </div>
      </Show>
      {/* See-map prompt */}
      <Show when={showSeeMapPrompt() && seeMapPromptDismissed() === false}>
        <div
          data-slot="graph-see-map-prompt"
          class="flex items-center justify-between px-4 py-2 border-b border-border-weaker-base bg-surface-base"
          role="status"
          aria-live="polite"
        >
          <div class="flex items-center gap-2">
            <span class="text-12-medium text-text-strong">{i18n.t("ui.sessionGraph.prompt.seeMap")}</span>
            <span class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.prompt.seeMapHint")}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="flex h-6 items-center gap-1 rounded-sm px-2 text-12-regular text-text-base hover:bg-surface-base-hover"
              onClick={() => {
                  // Switch to map surface via command event
                  window.dispatchEvent(new CustomEvent("graph:command", { detail: { name: "map" } }))
                }}
            >
              {i18n.t("ui.sessionGraph.prompt.seeMap")}
            </button>
            <button
              type="button"
              class="flex h-6 items-center gap-1 rounded-sm px-2 text-12-regular text-text-base hover:bg-surface-base-hover"
              onClick={() => setSeeMapPromptDismissed(true)}
            >
              {i18n.t("ui.sessionGraph.prompt.dismiss")}
            </button>
          </div>
        </div>
      </Show>
      {/* Trust lens banner */}
      <Show when={trustLensActive()}>
        <div
          data-slot="graph-trust-lens-banner"
          class="flex items-center justify-between px-4 py-2 border-b border-border-weaker-base bg-warning-bg"
          role="status"
          aria-live="polite"
        >
          <span class="text-12-regular text-warning-fg">{i18n.t("ui.sessionGraph.trustLens.banner")}</span>
        </div>
      </Show>
      <GraphBreadcrumbs crumbs={graphSelection.crumbs()} onSelect={fitSubtree} />
      <GraphStatusBar
        count={selection().length}
        onFrame={frameSelection}
        onKeepOnly={keepOnlySelection}
        onCopyPaths={copySelectedPaths}
        onExportSubset={exportSelection}
        onClear={clearSelection}
        onAddNote={annotations.openNoteComposer}
        compare={
          selectedTurns().length >= 2 || comparisonHook.comparedTurns()
            ? {
                active: comparisonHook.comparedTurns() !== null,
                onCompare: compareSelectedTurns,
                onClear: clearComparison,
              }
            : undefined
        }
        group={
          groupCollapse.selectedGroup()
            ? {
                collapsed: groupCollapse.collapsedGroups().has(groupCollapse.selectedGroup()!.id),
                onToggle: groupCollapse.toggleGroup,
                onCollapseOthers: groupCollapse.collapseOtherGroups,
              }
            : undefined
        }
      />
      <GraphCompareBar
        diff={comparison()}
        onOpenWindow={() => openWindow("compare")}
        onClear={() => {
          clearComparison()
          props.onCheckpoint?.(props.turnCount === undefined ? 0 : props.turnCount - 1)
        }}
      />
      <GraphScaleNotice
        model={model}
        selectedTurn={selectedTurn}
        frameTurn={() => props.frame}
        followLog={followLog()}
        activeTurn={props.activeTurn}
      />
      <GraphHiddenSelection
        model={model}
        selection={() => selection()}
        level={level}
        onJumpTo={jumpTo}
      />
      <GraphFallback error={error()} rendererID={rendererID()} />
      <div class="relative flex min-h-0 flex-1" classList={{ "flex-col": narrow() }}>
        <Show when={files() && !isSummaryLayout(layout()) && !narrow()}>
          <GraphFileRail
            files={changedFilesList()}
            selection={selection()}
            onSelect={(id) => select(id)}
          />
        </Show>
        <GraphCanvasRegion {...canvasRegionProps} />
        <GraphWindowManager
          windows={props.windows ?? []}
          onWindowsChange={props.onWindowsChange ?? (() => {})}
          onOpenWindow={props.onOpenWindow ?? (() => {})}
          model={model}
          theme={theme()}
          layout={layout()}
          setLayout={setLayout}
          canvasSize={canvasSize()}
          renderer={renderer()}
          viewport={viewportTracker!.viewport()}
          displayPositions={displayPositions}
          selection={selectionObj}
          annotations={annotations}
          edgeKinds={edgeKinds}
          comparison={comparisonHook}
          diffSource={props.diffSource}
          link={props.link}
          onOpenTranscript={props.onOpenTranscript}
          onOpenSession={props.onOpenSession}
          onActionNavigate={props.onActionNavigate}
          rules={props.rules ?? []}
          onRulesChange={props.onRulesChange}
          findInitialTab={findInitialTab()}
          i18n={i18n}
          renderSummary={props.renderSummary}
          facets={facets()}
          onFacetsChange={setFacets}
        />
        <Show when={narrow() && selectedNode() && !inspectorSheetOpen()}>
          <button
            type="button"
            class="absolute bottom-4 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-surface-base shadow-lg border border-border-weaker-base text-text-base"
            onClick={() => setInspectorSheetOpen(true)}
            aria-label={i18n.t("ui.sessionGraph.inspector.openSheet")}
            data-slot="graph-inspector-fab"
          >
            <svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 3h12v10H2zM7 3v10M11 3v10" />
            </svg>
          </button>
        </Show>
        <Show when={narrow() && inspectorSheetOpen()}>
          {renderInspectorPanel({
            i18n,
            model,
            selectedNode,
            annotations,
            diffSource: props.diffSource,
            renderSummary: props.renderSummary,
            link: props.link,
            onCopyView: copyView,
            onSelect: select,
            onOpenTranscript: props.onOpenTranscript ? openInTranscript : undefined,
            onOpenSession: props.onOpenSession,
            openInTranscript,
            sheet: true,
            title: selectedNode()?.label ?? i18n.t("ui.sessionGraph.inspector.title"),
            onClose: () => setInspectorSheetOpen(false),
          })}
        </Show>
        <Show when={effectiveDetailMode() === "panel"}>
          <Show when={inspectorOpen() && !narrow()}>
            <div
              data-slot="graph-inspector-resize"
              role="separator"
              aria-orientation="vertical"
              aria-label={i18n.t("ui.sessionGraph.inspector.resize")}
              style={{ width: '4px', 'min-width': '4px', 'flex-shrink': 0, 'flex-basis': '4px' }}
              class="cursor-col-resize touch-none hover:bg-border-weaker-base"
              onPointerDown={startResize}
            />
          </Show>
          <div
            classList={{
              "shrink-0": true,
              "h-0 w-0 overflow-hidden": !inspectorOpen(),
              "h-1/2 w-full border-t border-border-weaker-base": !!(inspectorOpen() && narrow()),
              "border-s border-border-weaker-base": !!(inspectorOpen() && !narrow()),
            }}
            style={inspectorOpen() && !narrow() ? { width: `${inspectorWidth()}px`, "max-width": "60%" } : undefined}
            data-slot="graph-inspector-gutter"
            data-collapsed={!inspectorOpen()}
            data-layout={narrow() ? "sheet" : "side"}
          >
            {renderInspectorPanel({
              i18n,
              model,
              selectedNode,
              annotations,
              diffSource: props.diffSource,
              renderSummary: props.renderSummary,
              link: props.link,
              onCopyView: copyView,
              onSelect: select,
              onOpenTranscript: props.onOpenTranscript ? openInTranscript : undefined,
              onOpenSession: props.onOpenSession,
              openInTranscript,
            })}
          </div>
        </Show>
      </div>
    </div>
  )
}