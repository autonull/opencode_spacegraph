import type {
  DepthMode,
  GraphRenderer,
  Projection,
  RendererViewport,
  RenderTheme,
  RenderModel,
} from "@spacegraphjs/renderer"
import { DEPTH_MODES, supports, supportsDepth } from "@spacegraphjs/renderer"
import type {
  DetailFraming,
  DetailMode,
  DetailTier,
  EqualizerRule,
  EqualizerRuleSet,
  GraphArrangement,
  GraphLayout,
  GraphViewData,
  GraphNode,
  GraphSide,
  Layout,
  Position,
  ZoomLevel,
} from "@opencode/session-ui/graph"
import { GraphActionTarget } from "./GraphActionTarget"
import { ancestors,
  applyNodeBudget,
  byProximity,
  CARD_SIZE,
  changedFiles,
  composeScopes,
  degreeBudget,
  withAnnotations,
  DETAIL_TIER_WIDTH,
  detailTier,
  equalizerScale,
  facetCounts,
  facetsFromQuery,
  facetsToQuery,
  fileRelations,
  isSummaryLayout,
  isSummaryOrLogLayout,
  laneAnchors,
  layoutGraph,
  logLayout,
  matrixLayout,
  LEVEL_RANK,
  Metrics,
  minLevelOf,
  nodeByID,
  nodeIndex,
  nodeSize,
  ribbonLayout,
  scaleWindow,
  scopeToTurns,
  sessionOrder,
  subtree,
  summaryUnits,
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
import { buildRenderModel, type CardTemplate } from "../canvas/buildRenderModel"
import type { RendererFactory, RendererID } from "../canvas/renderer-registry"
import { GraphBreadcrumbs } from "./GraphBreadcrumbs"
import { createBandTemplate, createCardTemplate } from "./cardTemplate"
import { createCardCopy } from "./card-copy"
import { VOCABULARY_KEYS } from "@opencode/session-ui/graph"
import type { GraphDiffSource } from "./GraphDiff"
import { GraphFileRail } from "./GraphFileRail"
import { GraphInspector } from "./GraphInspector"
import { GraphStatusBar } from "./GraphStatusBar"
import { GraphToolbar } from "./GraphToolbar"
import { GraphCompareBar } from "./GraphCompareBar"
import { GraphScaleNotice } from "./GraphScaleNotice"
import { GraphHiddenSelection } from "./GraphHiddenSelection"
import { GraphFallback } from "./GraphFallback"
import { GraphCanvasRegion } from "./GraphCanvasRegion"
import { GraphWindowManager } from "./GraphWindowManager"
import { POPOVER_GAP, POPOVER_MAX_HEIGHT, POPOVER_WIDTH } from "./GraphPopover"
import "./graph-cards.css"
import { buildAxisLabels } from "./axisLabels"
import { exportGraph, type ExportFormat } from "./export"
import { createNodeAnchor } from "./graph-anchors"
import { sessionID } from "./node-data"
import { proposeWindow, attachTouchGestures, createWidthThresholdTracker } from "./graph-utils"
import { useComparison } from "./useComparison"
import { useGroupCollapse } from "./useGroupCollapse"
import { useEdgeKinds } from "./useEdgeKinds"
import { useGraphKeyboard } from "./useGraphKeyboard"
import { useGraphViewport } from "./useGraphViewport"
import { useGraphState } from "./useGraphState"
import { useGraphSelection } from "./useGraphSelection"
import { useGraphAnnotations } from "./useGraphAnnotations"
import type { GraphWindowState } from "./GraphWindows"

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
  preferredRenderer?: RendererID
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

    announce,
  } = state

  // Group menu state (for context menu on groups)
  const [groupMenu, setGroupMenu] = createSignal<{ id: string; x: number; y: number }>()

  // Copy view URL with current query parameters
  const copyView = () => {
    const query = facetsToQuery(facets())
    props.onCopyView?.(query)
  }

  // Model memo
  const emptyModel: GraphViewData = {
    root: "session",
    nodes: [],
    edges: [],
    turns: [],
    turnByMessageID: new Map(),
  }
  const model = createMemo(() => (props.model ? withAnnotations(props.model, notesStore) : emptyModel))

  // Hooks for modular state/logic
  const graphSelection = useGraphSelection({
    model,
    controlled: () => props.selection,
    onSelect: (id) => props.onSelect?.(id),
    onAnnounce: announce,
  })

  // P8.1: the vanilla library controller owns interaction state (selection + trail).
  const selection = graphSelection.selection

  const annotations = useGraphAnnotations({
    model,
    selection: () => selection.selection(),
    onAnnounce: announce,
  })

  const edgeKinds = useEdgeKinds({ model })

  const comparisonHook = useComparison({
    model,
    liveModel: () => props.liveModel ?? model(),
    checkpoint: props.checkpoint,
    turnCount: props.turnCount,
    selection: () => selection.selection(),
    nodeByID: (id) => nodeByID(model(), id),
  })

  const groupCollapse = useGroupCollapse({
    model,
    selection: () => selection.selection(),
    nodeByID: (id) => model().nodes.find((n) => n.id === id),
  })

  // T18.3: the auto detail mode threshold
  const AUTO_DETAIL_THRESHOLD = 640
  const [renderer, setRenderer] = createSignal<GraphRenderer | undefined>()
  let rootEl!: HTMLDivElement
  let canvasRegionEl: HTMLDivElement | undefined

  // Viewport tracker dependencies - declared early, initialized later
  let displayPositions: () => ReadonlyMap<string, Position>
  let contentIDs: () => string[]
  let fitOptions: () => { minScale: number; insets: undefined }

  // Viewport tracker - declared early so effects can reference it, initialized later when deps are ready
  let viewportTracker: ReturnType<typeof useGraphViewport> | undefined
  // Card screen width signal - starts with default, updated after viewportTracker is ready
  const [cardScreenWidthSignal, setCardScreenWidthSignal] = createSignal<number>(CARD_SIZE[0])

  // Geometry - declared early with default, replaced with real memo later
  let geometry: () => GraphLayout = () => ({
    positions: new Map(),
    clusters: new Map(),
    bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    strategy: "lanes",
  })

  // renderModel - declared early with default, replaced with real memo later
  let renderModel: () => RenderModel = () => ({
    nodes: [],
    edges: [],
    bands: [],
    laneLabels: [],
    axisLabels: [],
  })

  // The turn a node belongs to
  const turnOf = (id: string | undefined) => {
    if (!id) return undefined
    const node = nodeByID(model(), id)
    if (!node) return undefined
    if (node.kind === "turn") return node.id
    return ancestors(model(), id).find((ancestor) => ancestor.kind === "turn")?.id
  }

  // T17.4: when detailMode is "window" (or "auto" resolving to window), open a window for the selected node's detail.
  createEffect(() => {
    if (effectiveDetailMode() !== "window") return
    const id = selection.selection()[0]
    if (!id) return
    openWindow("node", id)
  })
  const selectedTurn = () => turnOf(selection.selection()[0])
  const selectedTurns = () =>
    selection
      .selection()
      .map((id) => nodeByID(model(), id))
      .filter((node): node is GraphNode => node?.kind === "turn")

  // T6.6: a long session is drawn as its recent tail.
  const scale = createMemo(() =>
    scaleWindow(
      model(),
      [selectedTurn(), turnOf(props.frame), followLog() ? props.activeTurn : undefined].filter(
        (id): id is string => !!id,
      ),
    ),
  )

  const scopeBase = (source: GraphViewData) =>
    composeScopes(source, facets(), graphSelection.keptIds(), groupCollapse.collapsedGroups())

  const turnScoped = createMemo(() => {
    const turns = new Set(scale().turns)
    for (const turn of comparisonHook.comparedTurns() ?? []) turns.add(turn)
    return scopeToTurns(model(), turns)
  })

  const scoped = createMemo(() => scopeBase(turnScoped()))

  const counts = createMemo(() => facetCounts(turnScoped(), facets()))

  const comparison = comparisonHook.comparison

  const compareSelectedTurns = comparisonHook.compareSelectedTurns
  const clearComparison = comparisonHook.clearComparison

  const toggleGroupByID = groupCollapse.toggleGroupByID

  // T6.6: the first turn of the drawn window
  const windowAnchor = createMemo(() => {
    if (scale().hidden === 0) return undefined
    return [...scale().turns][0]
  })

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

  let resizeMove: ((event: PointerEvent) => void) | undefined
  let resizeEnd: (() => void) | undefined
  const stopResize = () => {
    if (resizeMove) window.removeEventListener("pointermove", resizeMove)
    if (resizeEnd) window.removeEventListener("pointerup", resizeEnd)
    resizeMove = undefined
    resizeEnd = undefined
  }
  const startResize = (event: PointerEvent) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = inspectorWidth()
    resizeMove = (moveEvent) => {
      const max = Math.max(240, rootEl.clientWidth * 0.6)
      setInspectorWidth(Math.min(max, Math.max(220, startWidth - (moveEvent.clientX - startX))))
    }
    resizeEnd = stopResize
    window.addEventListener("pointermove", resizeMove)
    window.addEventListener("pointerup", resizeEnd)
  }
  onCleanup(stopResize)

  // V117: Touch gestures for mobile
  onMount(() => {
    const el = canvasRegionEl
    if (!el) return
    const cleanup = attachTouchGestures(el, {
      getViewport: () => renderer()?.getViewport?.(),
      setViewport: (vp: RendererViewport) => renderer()?.setViewport?.(vp),
      capabilities: renderer()?.capabilities ?? { zoomRange: { min: 0.1, max: 10 } },
    })
    onCleanup(cleanup)
  })

  const theme = () => props.theme ?? resolvedTheme()
  // Card screen width - uses signal that starts with default, updated after viewportTracker is ready
  const cardScreenWidth = () => cardScreenWidthSignal()
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
  const relations = createMemo(() => fileRelations(model()))
  const relatedDetail = (node: GraphNode) => {
    if (node.kind !== "file") return undefined
    const relation = relations().get(node.id)
    if (!relation) return undefined
    const parts = [
      relation.reads > 0 ? copy.reads(relation.reads) : undefined,
      relation.writes > 0 ? copy.writes(relation.writes) : undefined,
      relation.additions > 0 || relation.deletions > 0
        ? copy.diff(relation.additions, relation.deletions)
        : undefined,
    ].filter((part): part is string => !!part)
    return parts.length > 0 ? parts.join(" · ") : undefined
  }

  // displayPositions must be declared before rendererModel which uses it
  displayPositions = createMemo(() => {
    const geometryResult = geometry()
    const base = geometryResult?.positions
    if (!base) return new Map()
    const positions = manual.positions ?? {}
    if (Object.keys(positions).length === 0) return base

    const result = new Map(base)
    for (const [id, position] of Object.entries(positions)) {
      result.set(id, { x: position[0], y: position[1], z: position[2] })
    }
    return result
  })

  const renderCard = createMemo(() => {
    // The age rules fade a card against the clock, so the cards are rebuilt with the model.
    const now = Date.now()
    const overlay = annotations.traceOverlay()
    return (
      props.renderCard ??
      createCardTemplate(theme(), {
        tier: tier(),
        selected: selection.selection()[0],
        active: props.activeTurn,
        related: relatedDetail,
        rules: props.rules,
        now,
        copy,
        trace: overlay ?? undefined,
        diff: comparison(),
        collapsedGroups: groupCollapse.collapsedGroups(),
        positions: displayPositions(),
      })
    )
  })
  const renderBand = createMemo(() =>
    createBandTemplate(theme(), undefined, { copy, collapsedGroups: groupCollapse.collapsedGroups() }),
  )
  // T7: the tree re-centres a parent when a child is appended and the force simulation relaxes its
  // boxes, so both need the positions the last layout gave them. The view keeps them per view, so
  // a streamed session never moves a node the reader is looking at.
  const layoutHistory = new Map<string, ReadonlyMap<string, Position>>()
  const sessionKey = () => {
    const root = nodeIndex(model()).get(model().root)
    return root ? sessionID(root) ?? "session" : "session"
  }
  // A manual arrangement belongs to the view it was made in. Changing session, layout, or level
  // returns the reader to the derived layout instead of carrying stale coordinates across views.
  const viewKey = createMemo(() => `${sessionKey()}:${layout()}:${level()}`)
  createEffect((previous: string | undefined) => {
    const key = viewKey()
    if (previous !== undefined && previous !== key) {
      setManual("positions", {})
      setManual("sizes", {})
    }
    return key
  }, undefined)
  // T15: a size rule scales the card's box, and the layout's cell cursor reads it.
  const sizedCard = (node: GraphNode): readonly [number, number] => {
    const [width, height] = nodeSize(node)
    const scale = equalizerScale(props.rules ?? [], node)
    return scale === 1 ? [width, height] : [width * scale, height * scale]
  }
  const rulesKey = createMemo(() => JSON.stringify(props.rules ?? []))

  // T17.1 — the layout axis. A summary layout packs the level's units into the session's grammar; the
  // node-link strategies place the model in the library's geometry.
  geometry = createMemo((): GraphLayout => {
    if (props.positions)
      return {
        positions: props.positions,
        clusters: new Map(),
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
        strategy: "lanes",
      }

    const current = layout()

    if (current === "ribbon") return ribbonLayout(scoped(), { level: level() })
    if (current === "matrix") return matrixLayout(scoped(), { level: level() })
    if (current === "log") return logLayout(scoped(), { level: level() })

    // T15: the rules are part of the layout key, because a size rule re-lays-out the map — the
    // same way a level or a layout change does.
    const key = `${sessionKey()}:${current}:${level()}:${rulesKey()}`
    const next = layoutGraph(model(), {
      strategy: current,
      level: level(),
      previous: layoutHistory.get(key),
      nodeSizeFn: sizedCard,
      // Give lanes more vertical breathing room: the default 24px gap between 72px cards
      // makes 8 lanes feel cramped at typical viewport heights.
      laneGap: 40,
    })

    layoutHistory.set(key, next.positions)

    return next
  })

  const moveNodes = (nodes: readonly { id: string; position: [number, number, number] }[]) => {
    // Capture state before first move in a drag sequence
    const hasChanges = nodes.some((n) => manual.positions[n.id] && manual.positions[n.id] !== n.position)
    if (hasChanges) pushHistory()
    for (const node of nodes) setManual("positions", node.id, node.position)
  }

  const resizeNode = (resize: { id: string; size: [number, number]; position: [number, number, number] }) => {
    const hasChanges = manual.positions[resize.id] && manual.positions[resize.id] !== resize.position
    if (hasChanges) pushHistory()
    setManual("positions", resize.id, resize.position)
    setManual("sizes", resize.id, resize.size)
  }
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
  const turnNumbers = createMemo(() => new Map(model().turns.map((id, index) => [id, index + 1])))
  const axisLabels = createMemo(() => buildAxisLabels(scoped(), turnRows(scoped(), level()), layout(), turnNumbers(), i18n.t))

  // T17.2 — a summary draws the level's units, and a cluster yields to its members below the
  // overview. The render model draws the same set, so the two cannot disagree.
  const drawn = createMemo(() => {
    const current = scoped()
    if (!isSummaryOrLogLayout(layout())) return current
    const units = summaryUnits(current, level())
    return { ...current, nodes: current.nodes.filter((node) => units.has(node.id)) }
  })

  // T17.5 — the card budget follows the camera. The adapter spends the budget in the order it walks
  // the nodes, so the order decides which nodes get a card: the ones under the reader's hand.
  // Must be defined before contentIDs which uses it.
  const budget = createMemo(() => {
    const current = drawn()
    const weighted = applyNodeBudget(current, degreeBudget(current, selection.selection()))
    if (!viewportTracker) return weighted
    const centre = viewportTracker.resting()
    if (!centre) return weighted
    return byProximity(weighted, displayPositions(), centre)
  })

  // LE.1: fit the drawn content, not the non-interactive bands, and re-frame when the inspector
  // toggles (the canvas narrows when the side panel opens). Streaming updates deliberately do not
  // refit, so the ids are read untracked inside the fit effect rather than as a dependency.
  // T6.6: at scale the session root sits far to the left of the drawn window, so framing it would
  // open the camera on empty space. The root stays drawn; it just does not pull the frame away.
  contentIDs = createMemo(() => {
    const ids = renderModel()
      .nodes.filter((node) => node.kind !== "band")
      .map((node) => node.id)

    const budgeted = budget()
    return budgeted.nodes.length < drawn().nodes.length ? ids.filter((id) => id !== model().root) : ids
  })

  // T1.18: the fit keeps a legible minimum scale; the renderer zooms in rather than shrink the
  // content past it, and the reader pans the rest.
  fitOptions = createMemo(() => ({
    minScale: MIN_CARD_HEIGHT_PX / CARD_SIZE[1],
    insets: undefined,
  }))

  // Initialize viewport tracker early so memos below can use it
  viewportTracker = useGraphViewport({
    renderer,
    displayPositions: () => displayPositions?.() ?? new Map(),
    contentIDs: () => contentIDs?.() ?? [],
    fitOptions: () => fitOptions?.() ?? { minScale: MIN_CARD_HEIGHT_PX / CARD_SIZE[1], insets: undefined },
    cardScreenWidth,
    CARD_SIZE,
    READABLE_CARD_WIDTH,
    capabilities: () => capabilities(),
  })

  // Update card screen width signal now that viewportTracker is ready
  setCardScreenWidthSignal(() => {
    const extent = viewportTracker!.viewport()?.extent
    const size = canvasSize()
    if (!extent?.width || !size.width) return CARD_SIZE[0]
    return (CARD_SIZE[0] * size.width) / extent.width
  })

  // T17.5 — the camera's resting place: the centre the camera last came to rest at. The card
  // budget follows the camera, and a budget that changed on every frame would rebuild the map on
  // every frame and make the cards churn under the reader's hand.
  // The panel takes layout width and reframes the camera when it opens; the popover and the card do
  // neither, so the map does not move under the reader when a node is selected.
  const selectedNode = () => {
    const id = selection.selection()[0]
    return id ? nodeByID(model(), id) : undefined
  }

  const inspectorOpen = createMemo(() => effectiveDetailMode() === "panel" && !!selectedNode() || (narrow() && inspectorSheetOpen()))

  // Convert RendererViewport to the format expected by GraphCanvasRegion
  const viewport = createMemo(() => {
    const vp = viewportTracker!.viewport()
    return vp ? { zoom: vp.zoom, center: Array.from(vp.center) } : undefined
  })

  // Reactive zoom percent for toolbar
  const zoomPercent = createMemo(() => viewportTracker!.camera.zoomPercent())

  const setViewport = (vp: { zoom: number; center: number[] } | undefined) => {
    if (!vp) {
      viewportTracker!.setViewport(undefined)
      return
    }
    viewportTracker!.setViewport({
      zoom: vp.zoom,
      center: [vp.center[0], vp.center[1], vp.center[2] ?? 0],
      extent: vp.center[2] ? undefined : undefined,
    })
  }

  const applyManualLayout = (model: RenderModel): RenderModel => {
    if (Object.keys(manual.sizes).length === 0 && Object.keys(manual.positions).length === 0) return model

    return {
      ...model,
      nodes: model.nodes.map((node) => {
        const size = manual.sizes[node.id]
        const position = manual.positions[node.id]
        if (!size && !position) return node
        return {
          ...node,
          ...(size ? { size: [size[0], size[1], node.size?.[2] ?? 0] } : {}),
          ...(position ? { position } : {}),
        }
      }),
    }
  }

  renderModel = createMemo(() => {
    const model = applyManualLayout(
      buildRenderModel(budget(), {
        level: level(),
        positions: displayPositions(),
        bands: !isSummaryOrLogLayout(layout()) && layout() !== "hierarchy",
        edges: !isSummaryOrLogLayout(layout()),
        bundle: !isSummaryOrLogLayout(layout()) && files(),
        focus: !isSummaryOrLogLayout(layout()) && level() === "execution" ? selection.selection()[0] : undefined,
        laneLabels:
          !isSummaryOrLogLayout(layout()) && layout() === "lanes"
            ? laneAnchors().map((lane) => ({
                id: lane.name,
                label: i18n.t(VOCABULARY_KEYS.lane[lane.name]),
                y: lane.y,
                // T6.6: the gutter belongs to the drawn window, not to the session root far to the left.
                anchorNodeId: windowAnchor(),
              }))
            : undefined,
        axisLabels: axisLabels(),
        renderCard: renderCard(),
        renderBand: renderBand(),
      }),
    )
    const hidden = edgeKinds.hiddenEdgeKinds()
    return hidden.size === 0
      ? model
      : { ...model, edges: model.edges.filter((edge) => !hidden.has(edge.kind)) }
  })

  // The proximity order must not leak: a screen reader reads the session, and a saved map reads the
  // same whoever opens it. Both read the render model in the session's own order.
  const ordered = createMemo(() => {
    const model = renderModel()
    const order = sessionOrder(drawn())
    return {
      ...model,
      nodes: [...model.nodes].sort(
        (a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      ),
    }
  })

  // T3.4: Export the current render model as SVG, JSON, or standalone HTML.
  const handleExport = (format: ExportFormat, model: RenderModel) =>
    exportGraph(format, model, {
      theme: theme(),
      sessionTitle: props.sessionTitle,
      testedCommit: props.testedCommit,
    })

  // B1 — the selection verbs. frameSelection and exportSelection need camera/ordered (defined later).
  const frameSelection = () => viewportTracker!.camera.frame(selection.selection())
  const keepOnlySelection = graphSelection.keepOnlySelection
  const copySelectedPaths = graphSelection.copySelectedPaths
  const exportSelection = () => {
    const ids = new Set(selection.selection())
    if (ids.size === 0) return
    const model = ordered()
    handleExport("json", {
      ...model,
      nodes: model.nodes.filter((node) => ids.has(node.id)),
      edges: model.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
    })
  }
  const clearSelection = graphSelection.clearSelection

  // The node the popover describes, and where it hangs.
  const popoverNode = createMemo(() => (effectiveDetailMode() === "popover" ? selectedNode() : undefined))
  const popoverAnchor = createNodeAnchor({ node: popoverNode, renderer: () => renderer(), viewport: viewportTracker!.viewport })
  // Beside the node, flipped to the other side when it would leave the canvas.
  const popoverPlacement = createMemo(() => {
    const anchor = popoverAnchor()
    const size = canvasSize()
    if (!anchor) return { left: 0, top: 0 }
    const fitsRight = anchor.x + POPOVER_GAP + POPOVER_WIDTH <= size.width
    const left = fitsRight ? anchor.x + POPOVER_GAP : Math.max(POPOVER_GAP, anchor.x - POPOVER_GAP - POPOVER_WIDTH)
    const top = Math.min(
      Math.max(POPOVER_GAP, anchor.y - 24),
      Math.max(POPOVER_GAP, size.height - POPOVER_MAX_HEIGHT - POPOVER_GAP),
    )

    return { left, top }
  })
  const popoverVisible = createMemo(() => {
    const node = popoverNode()
    if (!node || popoverDismissed()) return undefined
    return node
  })
  // The peeked node: under the pointer, never the selected one — the selection already has a
  // surface of its own.
  const peekNode = createMemo(() => {
    if (!peek()) return undefined
    const id = hovered()
    if (!id || id === selection.selection()[0]) return undefined
    return nodeByID(model(), id)
  })
  const peekAnchor = createNodeAnchor({ node: peekNode, renderer: () => renderer(), viewport: viewportTracker!.viewport })
  const noteAnchor = createNodeAnchor({
    node: () => (annotations.noteTarget() ? nodeByID(model(), annotations.noteTarget()!) : undefined),
    renderer: () => renderer(),
    viewport: viewportTracker!.viewport,
  })
  const noteTargetNode = () => (annotations.noteTarget() ? nodeByID(model(), annotations.noteTarget()!) : undefined)
  const peekEdge = createMemo(() => {
    if (!peek()) return undefined
    const id = edgeHovered()
    return id ? model().edges.find((edge) => edge.id === id) : undefined
  })
  // Above the node's own box, so the peek never covers what it is about.
  const peekPlacement = createMemo(() => {
    const anchor = peekAnchor()
    if (!anchor) return undefined
    const half = ((CARD_SIZE[1] / CARD_SIZE[0]) * cardScreenWidth()) / 2

    return { left: anchor.x, top: anchor.y - half - 34 }
  })
  const peekFrame = createMemo(() => {
    const node = peekNode()
    const placement = peekPlacement()
    if (!node || !placement) return undefined

    return { node, left: placement.left, top: placement.top }
  })

  // T12.4 — a pinned window follows its node: the anchor is read on every viewport change, so the
  // window rides the node as the reader pans. A free window does not move at all.

  const changeDetailMode = (next: DetailMode) => {
    setDetailMode(next)
    setPopoverDismissed(false)
    props.onDetailModeChange?.(next)
  }
  const changeDetailFraming = (next: DetailFraming) => {
    setDetailFraming(next)
    props.onDetailFramingChange?.(next)
  }
  const changeProjection = (next: Projection) => {
    setProjection(next)
    // Projection is the coarse depth selection; keep the depth treatment in step with it.
    setDepth(next === "2d" ? "flat" : "orbit")
    props.onProjectionChange?.(next)
  }
  const changeDepth = (next: DepthMode) => {
    setDepth(next)
    // A depth treatment implies its projection; keep the coarse projection control in step.
    setProjection(next === "flat" ? "2d" : "3d")
    props.onDepthChange?.(next)
  }
  const changeLayout = (next: Layout) => {
    setLayout(next)
    props.onLayoutChange?.(next)
  }
  // LE.8/LE.9: a segment/cell expands into the node-link graph with that node selected and framed.
  const expandToGraph = (id: string) => {
    const node = nodeByID(model(), id)

    if (!node) return
    Metrics.count("expand")
    if (isSummaryLayout(layout())) changeLayout("lanes")
    jumpTo(node)
  }
  const toggleFiles = () => {
    setFiles((open) => {
      props.onFilesChange?.(!open)
      return !open
    })
  }
  const togglePeek = () => {
    setPeek((open) => {
      props.onPeekChange?.(!open)
      return !open
    })
  }
  // T12 — the view proposes a window's first placement: the canvas is what a window lives in, so
  // the view knows how much room there is. The host persists what the reader does with it.
  const openWindow = (kind: string, nodeID?: string) => {
    const window = proposeWindow(kind, nodeID, { canvas: canvasSize(), windows: props.windows ?? [] })
    props.onOpenWindow?.(window)
    return window
  }
  // Escape closes the popover and keeps the selection; a second Escape clears it. A panel is not
  // dismissed by Escape — it is the map's own surface, and clearing the selection closes it.
  const dismissDetail = () => {
    if (popoverVisible()) {
      setPopoverDismissed(true)
      return
    }
    selection.select(undefined)
  }
  // LE.12: the changed-files rail reads the model through the pure selector, so it tracks streaming.
  const changedFilesList = createMemo(() => changedFiles(model()))
  const jumpTo = (node: GraphNode) => {
    const minimum = minLevelOf(node)
    if (LEVEL_RANK[minimum] > LEVEL_RANK[level()]) setLevel(minimum)
    selection.select(node.id)
    viewportTracker!.camera.focus(node.id)
  }
  // U3.11: clicking a breadcrumb selects it and frames its subtree, so the canvas follows the trail.
  const fitSubtree = (id: string) => {
    selection.select(id)
    renderer()?.fit(
      subtree(model(), id).map((node) => node.id),
      fitOptions(),
    )
  }

  // T3.5: a permalink frames its node. The semantic level rises first when the node is hidden at the
  // current one, and the camera moves once the model that carries the node has been applied.
  const [framed, setFramed] = createSignal<string>()
  const raiseLevelForFrame = () => {
    const id = props.frame
    if (!id) return false
    const node = nodeByID(model(), id)
    if (!node) return false
    const minimum = minLevelOf(node)
    if (LEVEL_RANK[minimum] <= LEVEL_RANK[level()]) return false
    setLevel(minimum)
    return true
  }
  const focusFrame = (instance: GraphRenderer | undefined) => {
    const id = props.frame
    if (!id || !instance || framed() === id) return
    const node = nodeByID(model(), id)
    if (!node) return
    selection.select(id, false)
    viewportTracker!.camera.focus(id)
    setFramed(id)
  }
  // A permalink that changes while the graph is open frames its node too, not only on load.
  createEffect(() => {
    const id = props.frame
    const node = id ? nodeByID(model(), id) : undefined
    if (!node) return
    focusFrame(renderer())
  })

  // T2.3: returning to the transcript is an interaction.
  const openInTranscript = (id: string) => {
    Metrics.count("return")
    props.onOpenTranscript?.(id)
  }

  // T2.3: the search is an interaction, so it is counted once per opening.
  const openSearch = (initial = "") => {
    if (searchOpen()) return
    Metrics.count("search")
    setSearchInitial(initial)
    setSearchOpen(true)
  }
  const toggleSearch = () => {
    if (searchOpen()) {
      setSearchOpen(false)
      return
    }
    openSearch()
  }

  // Update card screen width signal now that viewportTracker is ready
  setCardScreenWidthSignal(() => {
    const extent = viewportTracker!.viewport()?.extent
    const size = canvasSize()
    if (!extent?.width || !size.width) return CARD_SIZE[0]
    return (CARD_SIZE[0] * size.width) / extent.width
  })

  // Keyboard handling extracted to hook (must be after all dependencies are declared)
  const { handleRegionKeyDown } = useGraphKeyboard({
    model,
    selection: () => selection.selection(),
    onSelect: (id, add) => selection.select(id, add),
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
  })

  // The host owns the controlled values; the view keeps its own copy so an uncontrolled view still
  // works. A prop the host leaves undefined never overwrites what the reader chose.
  const mirror = <T,>(read: () => T | undefined, write: (value: T) => void) =>
    createEffect(() => {
      const value = read()
      if (value !== undefined) write(value)
    })

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
  // A capability gap is never silent: when the active renderer cannot do 3D, fall back to 2D rather
  // than leaving the model in a projection the renderer ignores.
  createEffect(() => {
    const current = capabilities()
    if (!current) return
    if (projection() === "3d" && !supports(current, "3d")) changeProjection("2d")
    if (!supportsDepth(current, depth())) setDepth("flat")
  })
  // LE.1: frame the drawn content (never the non-interactive bands) on first load, a renderer/level/
  // projection/layout change, and when the inspector toggles. The fit is deferred to
  // the canvas's `onModelApplied` (below), so the matching nodes and positions exist before we measure;
  // the ids are read untracked, so streaming updates never refit.
  createEffect(() => {
    level()
    projection()
    depth()
    layout()
    inspectorOpen()
    files()
    setNeedsFit(true)
  })
  const [framedSelection, setFramedSelection] = createSignal<string>()
  createEffect(() => {
    if (detailFraming() !== "card") return
    const id = selection.selection()[0]
    if (!id) return
    if (!viewportTracker) return
    if (viewportTracker.camera.pending()) return
    // The camera is the renderer, so the framing waits for it: the first viewport report can
    // arrive before the renderer itself is handed over.
    if (!rendererReady()) return
    const current = viewportTracker.viewport()
    if (!current) return
    if (framedSelection() === id) return
    setFramedSelection(id)
    viewportTracker.camera.frameReadable(id)
  })
  const applyModel = (instance: GraphRenderer) => {
    // T3.5: a level change rebuilds the model, so the frame waits for the one that carries the node.
    if (raiseLevelForFrame()) return
    if (needsFit()) {
      setNeedsFit(false)
      viewportTracker.camera.request(() => instance.fit(untrack(contentIDs), fitOptions()))
    }
    focusFrame(instance)
  }

  // A structural change — the host moved the map into the hybrid, or the reader chose another
  // arrangement — frames the content again: the pane is another shape now, and the old frame no
  // longer says what the reader is looking at. A plain resize does not: the reader's own zoom and
  // pan are theirs.
  createEffect(() => {
    props.refitKey
    props.arrangement
    const instance = renderer()
    if (!instance) return
    viewportTracker.camera.request(() => instance.fit(untrack(contentIDs), untrack(fitOptions)))
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
        manualHistoryLength={manualHistory().length}
        manualFutureLength={manualFuture().length}
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
          isSummaryLayout(layout()) && selection.selection().length > 0
            ? () => expandToGraph(selection.selection()[0]!)
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
      <GraphBreadcrumbs crumbs={selection.crumbs()} onSelect={fitSubtree} />
      <GraphStatusBar
        count={selection.selection().length}
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
        onClear={clearComparison}
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
        selection={() => selection.selection()}
        level={level}
        onJumpTo={jumpTo}
      />
      <GraphFallback fallback={fallback()} error={error()} />
      <div class="relative flex min-h-0 flex-1" classList={{ "flex-col": narrow() }}>
        <Show when={files() && !isSummaryLayout(layout()) && !narrow()}>
          <GraphFileRail
            files={changedFilesList()}
            selection={selection.selection()}
            onSelect={(id) => selection.select(id)}
          />
        </Show>
        <GraphCanvasRegion
          model={model}
          theme={theme()}
          level={level()}
          setLevel={setLevel}
          projection={projection()}
          setProjection={setProjection}
          depth={depth()}
          setDepth={setDepth}
          layout={layout()}
          setLayout={setLayout}
          files={files()}
          setFiles={setFiles}
          detailMode={detailMode()}
          setDetailMode={setDetailMode}
          detailFraming={detailFraming()}
          setDetailFraming={setDetailFraming}
          peek={peek()}
          setPeek={setPeek}
          followLog={followLog()}
          setFollowLog={setFollowLog}
          facets={facets()}
          setFacets={setFacets}
          facetCounts={counts()}
          narrow={narrow()}
          compact={compact()}
          canvasSize={canvasSize()}
          inspectorWidth={inspectorWidth()}
          setInspectorWidth={setInspectorWidth}
          inspectorSheetOpen={inspectorSheetOpen()}
          setInspectorSheetOpen={setInspectorSheetOpen}
          renderer={renderer()}
          setRenderer={setRenderer}
          setRendererReady={setRendererReady}
          rendererID={rendererID()}
          setRendererID={setRendererID}
          fallback={fallback()}
          setFallback={setFallback}
          error={error()}
          setError={setError}
          viewport={viewport()}
          setViewport={setViewport}
          rendererOverrides={props.rendererOverrides}
          preferredRenderer={props.preferredRenderer}
          onRenderer={props.onRenderer}
          renderCard={renderCard()}
          renderSummary={props.renderSummary}
          diffSource={props.diffSource}
          link={props.link}
          onOpenTranscript={props.onOpenTranscript}
          onOpenSession={props.onOpenSession}
          onActionNavigate={props.onActionNavigate}
          onActionReveal={props.onActionReveal}
          onActionCopy={props.onActionCopy}
          onActionRun={props.onActionRun}
          onOpenWindow={openWindow}
          rules={props.rules}
          onRulesChange={props.onRulesChange}
          onSelect={props.onSelect}
          onProjectionChange={props.onProjectionChange}
          onDepthChange={props.onDepthChange}
          onLayoutChange={props.onLayoutChange}
          onFilesChange={props.onFilesChange}
          onDetailModeChange={props.onDetailModeChange}
          onDetailFramingChange={props.onDetailFramingChange}
          onPeekChange={props.onPeekChange}
          onTurnMap={props.onTurnMap}
          windowAnchor={windowAnchor()}
          activeTurn={props.activeTurn}
          selection={() => selection.selection()}
          select={selection.select}
          graphSelection={graphSelection}
          annotations={annotations}
          edgeKinds={edgeKinds}
          groupCollapse={groupCollapse}
          comparisonHook={comparisonHook}
          manual={manual}
          setManual={setManual}
          manualHistory={manualHistory()}
          setManualHistory={setManualHistory}
          manualFuture={manualFuture()}
          setManualFuture={setManualFuture}
          groupedMenu={groupMenu()}
          setGroupMenu={setGroupMenu}
          toggleGroupByID={toggleGroupByID}
          turnOf={turnOf}
          selectedTurn={selectedTurn}
          selectedTurns={selectedTurns}
          scale={scale}
          scopeBase={scopeBase}
          scoped={scoped()}
          counts={counts()}
          comparison={comparison()}
          compareSelectedTurns={compareSelectedTurns}
          clearComparison={clearComparison}
          layoutHistory={layoutHistory}
          sessionKey={sessionKey}
          viewKey={viewKey()}
          sizedCard={sizedCard}
          rulesKey={rulesKey()}
          geometry={geometry()}
          moveNodes={moveNodes}
          resizeNode={resizeNode}
          needsFit={needsFit()}
          setNeedsFit={setNeedsFit}
          viewAnnouncement={viewAnnouncement()}
          turnNumbers={turnNumbers()}
          axisLabels={axisLabels()}
          drawn={drawn()}
          resting={viewportTracker.resting()}
          setResting={viewportTracker.setResting}
          budget={budget()}
          applyManualLayout={applyManualLayout}
          renderModel={renderModel()}
          ordered={ordered()}
          contentIDs={contentIDs}
          fitOptions={fitOptions}
          inspectorOpen={inspectorOpen()}
          camera={viewportTracker.camera}
          cardScreenWidth={cardScreenWidth()}
          effectiveDetailMode={effectiveDetailMode()}
          popoverNode={popoverNode()}
          popoverPlacement={popoverPlacement()}
          popoverVisible={popoverVisible()}
          peekNode={peekNode()}
          peekAnchor={peekAnchor}
          noteAnchor={noteAnchor}
          noteTargetNode={noteTargetNode}
          peekEdge={peekEdge()}
          peekPlacement={peekPlacement()}
          peekFrame={peekFrame()}
          changeDetailMode={changeDetailMode}
          changeDetailFraming={changeDetailFraming}
          changeProjection={changeProjection}
          changeDepth={changeDepth}
          changeLayout={changeLayout}
          expandToGraph={expandToGraph}
          toggleFiles={toggleFiles}
          togglePeek={togglePeek}
          dismissDetail={dismissDetail}
          changedFilesList={changedFilesList()}
          jumpTo={jumpTo}
          fitSubtree={fitSubtree}
          raiseLevelForFrame={raiseLevelForFrame}
          focusFrame={focusFrame}
          framed={framed()}
          setFramed={setFramed}
          openInTranscript={openInTranscript}
          openSearch={openSearch}
          toggleSearch={toggleSearch}
          searchOpen={searchOpen()}
          setSearchOpen={setSearchOpen}
          searchInitial={searchInitial()}
          setSearchInitial={setSearchInitial}
          legendOpen={legendOpen()}
          setLegendOpen={setLegendOpen}
          galleryOpen={galleryOpen()}
          setGalleryOpen={setGalleryOpen}
          findInitialTab={findInitialTab()}
          setFindInitialTab={setFindInitialTab}
          a11yInstructionsId={a11yInstructionsId}
          announce={announce}
          i18n={i18n}
          refitKey={props.refitKey}
          arrangement={props.arrangement}
          handleRegionKeyDown={handleRegionKeyDown}
          setHovered={setHovered}
          setEdgeHovered={setEdgeHovered}
          setPopoverDismissed={setPopoverDismissed}
          groupMenu={groupMenu()}
          toggleBillboard={toggleBillboard}
          cardFacing={cardFacing()}
          onZoomOut={() => viewportTracker!.camera.zoomBy(-1)}
          onZoomIn={() => viewportTracker!.camera.zoomBy(1)}
          zoomPercent={viewportTracker!.camera.zoomPercent()}
          zoomOutDisabled={level() === "overview" || (viewportTracker!.viewport()?.zoom ?? 0) <= viewportTracker!.camera.zoomLimits().min}
          zoomInDisabled={(viewportTracker!.viewport()?.zoom ?? 0) >= viewportTracker!.camera.zoomLimits().max}
          onFit={viewportTracker!.camera.fitContent}
          onCopyView={copyView}
          onExport={handleExport}
          onBack={props.onBack}
          onSplitView={props.onSplitView}
          endInset={props.endInset}
          sessionTitle={props.sessionTitle}
          testedCommit={props.testedCommit}
          canvasRegionRef={(el) => { canvasRegionEl = el }}
          applyModel={applyModel}
        />
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
          selection={selection}
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
          <div class="absolute inset-0 z-30 flex flex-col" data-slot="graph-inspector-sheet">
            <div class="flex h-12 items-center justify-between border-b border-border-weaker-base bg-surface-base px-3">
              <span class="text-13-medium text-text-base">{selectedNode()?.label ?? i18n.t("ui.sessionGraph.inspector.title")}</span>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-sm text-text-base hover:bg-surface-base-hover"
                onClick={() => setInspectorSheetOpen(false)}
                aria-label={i18n.t("ui.sessionGraph.inspector.closeSheet")}
              >
                <svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
            <div class="flex-1 overflow-auto">
              <GraphInspector
                model={model()}
                node={selectedNode()}
                diffSource={props.diffSource}
                renderSummary={props.renderSummary}
                link={props.link}
                onCopyView={copyView}
                onSelect={selection.select}
                onOpenTranscript={props.onOpenTranscript ? openInTranscript : undefined}
                onOpenSession={props.onOpenSession}
                traceKind={annotations.traceKind()}
                onTraceWhy={annotations.traceWhy}
                onTraceLedHere={annotations.traceLedHere}
                onTraceRelated={annotations.traceRelated}
                onClearTrace={annotations.clearTrace}
                onCopyTraceOutline={annotations.copyTraceOutline}
                onEditNote={annotations.editNote}
                onDeleteNote={annotations.deleteNote}
                onCopyNote={annotations.copyNote}
              />
            </div>
          </div>
        </Show>
        <Show when={effectiveDetailMode() === "panel"}>
          <Show when={inspectorOpen() && !narrow()}>
            <div
              data-slot="graph-inspector-resize"
              role="separator"
              aria-orientation="vertical"
              aria-label={i18n.t("ui.sessionGraph.inspector.resize")}
              class="w-1 shrink-0 cursor-col-resize touch-none hover:bg-border-weaker-base"
              onPointerDown={startResize}
            />
          </Show>
          <div
            classList={{
              "shrink-0": true,
              // A closed gutter takes no room: in a narrow layout it is a sibling of the canvas in
              // the same column, and its content would otherwise push the canvas out of the frame.
              "h-0 w-0 overflow-hidden": !inspectorOpen(),
              // LE.4: at narrow widths the inspector is a real bottom sheet (a flex sibling below the
              // canvas), not an overlay, so the canvas is sized to the area above it and fit never
              // frames content under it.
              "h-1/2 w-full border-t border-border-weaker-base": !!(inspectorOpen() && narrow()),
              "border-s border-border-weaker-base": !!(inspectorOpen() && !narrow()),
            }}
            style={inspectorOpen() && !narrow() ? { width: `${inspectorWidth()}px`, "max-width": "60%" } : undefined}
            data-slot="graph-inspector-gutter"
            data-collapsed={!inspectorOpen()}
            data-layout={narrow() ? "sheet" : "side"}
          >
            <GraphInspector
              model={model()}
              node={selectedNode()}
              diffSource={props.diffSource}
              renderSummary={props.renderSummary}
              link={props.link}
              onCopyView={copyView}
              onSelect={selection.select}
              onOpenTranscript={props.onOpenTranscript ? openInTranscript : undefined}
              onOpenSession={props.onOpenSession}
              traceKind={annotations.traceKind()}
              onTraceWhy={annotations.traceWhy}
              onTraceLedHere={annotations.traceLedHere}
              onTraceRelated={annotations.traceRelated}
              onClearTrace={annotations.clearTrace}
              onCopyTraceOutline={annotations.copyTraceOutline}
              onEditNote={annotations.editNote}
              onDeleteNote={annotations.deleteNote}
              onCopyNote={annotations.copyNote}
            />
          </div>
        </Show>
      </div>
    </div>
  )
}