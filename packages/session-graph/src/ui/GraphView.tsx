import type {
  DepthMode,
  GraphRenderer,
  Projection,
  RendererCapabilities,
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
  GraphFacets,
  GraphLayout,
  GraphViewData,
  GraphNode,
  GraphSide,
  Layout,
  Position,
  ZoomLevel,
} from "@opencode/session-ui/graph"
import {
  ancestors,
  applyFacets,
  applyNodeBudget,
  byProximity,
  CARD_SIZE,
  changedFiles,
  degreeBudget,
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
  isVisibleAt,
  Metrics,
  minLevelOf,
  nodeByID,
  nodeIndex,
  nodeSize,
  reviewChanges,
  ribbonLayout,
  scaleWindow,
  scopeToTurns,
  sessionOrder,
  subtree,
  summaryUnits,
  turnRows,
} from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
  Show,
  untrack,
  type JSX,
} from "solid-js"
import { createStore } from "solid-js/store"
import { buildRenderModel, type CardTemplate } from "../canvas/buildRenderModel"
import { GraphCanvas } from "../canvas/GraphCanvas"
import type { RendererFactory, RendererID } from "../canvas/renderer-registry"
import { GraphA11y } from "./GraphA11y"
import { GraphBreadcrumbs } from "./GraphBreadcrumbs"
import { createBandTemplate, createCardTemplate } from "./cardTemplate"
import { createCardCopy } from "./card-copy"
import { GraphDetailSurface } from "./GraphDetail"
import { GraphLegend, GraphLegendBody } from "./GraphLegend"
import { GraphEqualizerBody } from "./GraphEqualizer"
import { LANE_KEY, LEVEL_KEY, LAYOUT_KEY, DEPTH_KEY } from "./vocabulary"
import { classifyTrace, copyTraceAsOutline, stepLitNode, type TraceKind, type TraceOverlay } from "./overlay"
import { breadcrumbs } from "@opencode/session-ui/graph"
import type { GraphDiffSource } from "./GraphDiff"
import { GraphFileRail } from "./GraphFileRail"
import { GraphGallery } from "./GraphGallery"
import { GraphInspector } from "./GraphInspector"
import { GraphMinimap } from "./GraphMinimap"
import { GraphPeek } from "./GraphPeek"
import { GraphPopover, POPOVER_GAP, POPOVER_MAX_HEIGHT, POPOVER_WIDTH } from "./GraphPopover"
import { GraphSearch } from "./GraphSearch"
import { GraphStatusBar } from "./GraphStatusBar"
import { GraphToolbar } from "./GraphToolbar"
import { GraphFilesystemWindow } from "./GraphFilesystemWindow"
import { GraphWindows, type GraphWindowState } from "./GraphWindows"
import { createGraphTheme } from "./theme"
import { buildAxisLabels } from "./axisLabels"
import { exportGraph, type ExportFormat } from "./export"
import { createGraphCamera } from "./graph-camera"
import { createNodeAnchor } from "./graph-anchors"
import { createGraphSelection } from "./graph-selection"
import { pinnedAnchors, proposeWindow, windowKind, type GraphWindowKind } from "./graph-windows"

/**
 * T1.18 — the legibility floor. A fit never shrinks an activity card below half its natural size, so
 * a view that cannot show everything (the hierarchy outline, the file lens between the rail and the
 * inspector) is panned instead of shrunk to text too small to read. Half size keeps the card's 13px
 * label at 6.5px, the size the lane views are read at.
 */
const MIN_CARD_HEIGHT_PX = CARD_SIZE[1] / 2

/**
 * T11.2 (A) — the width the camera aims for when it frames the selected card: the closest tier's
 * threshold with a margin, so the card lands inside the tier rather than on its edge. The card mode
 * is the detail on the node, so the node's card is the one that says the most.
 */
const READABLE_CARD_WIDTH = DETAIL_TIER_WIDTH.closest * 1.05

/**
 * T17.5 — how long the camera must be still before the card budget follows it. A budget that
 * changed on every frame would rebuild the map on every frame and make the cards churn under the
 * reader's hand.
 */
const REST_SETTLE_MS = 120

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
  onActionNavigate?: (target: { node?: string; file?: string; range?: any; url?: string; text?: string }) => void
  onActionReveal?: (target: { node?: string; file?: string; range?: any; url?: string; text?: string }) => void
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
  const i18n = useI18n()
  const a11yInstructionsId = createUniqueId()
  const resolvedTheme = createGraphTheme()
  const [level, setLevel] = createSignal<ZoomLevel>(props.level ?? "execution")
  const [projection, setProjection] = createSignal<Projection>(props.projection ?? "2d")
  const [depth, setDepth] = createSignal<DepthMode>(props.depth ?? "flat")
  const [cardFacing, setCardFacing] = createSignal<"plane" | "camera">("plane")
  const toggleBillboard = () => setCardFacing((current) => (current === "camera" ? "plane" : "camera"))
  const [layout, setLayout] = createSignal<Layout>(props.layout ?? "lanes")
  const [files, setFiles] = createSignal<boolean>(props.files ?? false)
  // Where a selected node's detail is shown. The panel is the default: the popover and the card are
  // alternatives a reader can pick, and the map still works with the detail off.
  const [detailMode, setDetailMode] = createSignal<DetailMode>(props.detailMode ?? "panel")
  const [detailFraming, setDetailFraming] = createSignal<DetailFraming>(props.detailFraming ?? "off")
  // The transient look at the node under the pointer; it never changes the selection.
  const [peek, setPeek] = createSignal<boolean>(props.peek ?? false)
  // T18.1: whether the map follows the active turn from the log.
  const [followLog, setFollowLog] = createSignal<boolean>(props.followLog ?? false)
  // A2 — the question the map answers. Text, kind/status chips, and the domain lens compose into
  // one scope; a permalink's `q=` is the same state in its shareable form.
  const [facets, setFacets] = createSignal<GraphFacets>(facetsFromQuery(props.facetQuery ?? ""))
  const [hovered, setHovered] = createSignal<string>()
  // The popover is dismissed by Escape but the selection stays; a second Escape clears it.
  const [popoverDismissed, setPopoverDismissed] = createSignal(false)
  const [searchOpen, setSearchOpen] = createSignal(false)
  const [searchInitial, setSearchInitial] = createSignal("")
  // T6.8: the legend names the encoding, so a first-time reader can decode the map without a briefing.
  const [legendOpen, setLegendOpen] = createSignal(false)
  // T7.5: the layout gallery — the same model in every layout, so the reader compares instead of
  // committing to one.
  const [galleryOpen, setGalleryOpen] = createSignal(false)
  // Trace overlay state (A1): active trace kind, source node, and computed overlay.
  const [traceKind, setTraceKind] = createSignal<TraceKind | null>(null)
  const [traceSource, setTraceSource] = createSignal<string | null>(null)
  const traceOverlay = createMemo<TraceOverlay | null>(() => {
    const kind = traceKind()
    const source = traceSource()
    if (!kind || !source) return null
    return classifyTrace(props.model, kind, source)
  })
  const clearTrace = () => {
    setTraceKind(null)
    setTraceSource(null)
  }
  const startTrace = (kind: TraceKind, source?: string) => {
    const from = source ?? selection.selection()[0]
    if (!from) return
    setTraceKind(kind)
    setTraceSource(from)
    // Announce to screen readers
    const node = nodeByID(props.model, from)
    const label = node?.label ?? from
    const messages: Record<TraceKind, string> = {
      why: i18n.t("ui.sessionGraph.trace.whyAnnouncement", { label }),
      "led-here": i18n.t("ui.sessionGraph.trace.ledHereAnnouncement", { label }),
      related: i18n.t("ui.sessionGraph.trace.relatedAnnouncement", { label }),
    }
    announce(messages[kind])
  }
  // Copy trace as markdown outline
  const copyTraceOutline = () => {
    const overlay = traceOverlay()
    if (!overlay) return
    const text = copyTraceAsOutline(props.model, overlay, breadcrumbs)
    navigator.clipboard?.writeText(text)
    announce(i18n.t("ui.sessionGraph.trace.copied"))
  }
  // A2 — the question is an artifact too: its `q=` grammar is the shareable form.
  const copyView = () => {
    const query = facetsToQuery(facets())
    if (props.onCopyView) {
      props.onCopyView(query)
      return
    }
    navigator.clipboard?.writeText(query)
    announce(i18n.t("ui.sessionGraph.facets.copied"))
  }
  const [capabilities, setCapabilities] = createSignal<RendererCapabilities>()
  const [rendererReady, setRendererReady] = createSignal(false)
  const [rendererID, setRendererID] = createSignal<RendererID>()
  const [fallback, setFallback] = createSignal(false)
  const [error, setError] = createSignal<string>()
  const [viewport, setViewport] = createSignal<RendererViewport>()
  const [narrow, setNarrow] = createSignal(false)
  const [compact, setCompact] = createSignal(false)
  const [inspectorWidth, setInspectorWidth] = createSignal(288)
  // The canvas region's own size: the card tier and the popover's placement are measured against
  // the space the map actually has, not against the space the session panel has.
  const [canvasSize, setCanvasSize] = createSignal({ width: 0, height: 0 })
  // Manual layout is a reader's act, not a model fact: a dragged position or resized group is kept
  // beside the derived layout so the next stream append cannot snap it back.
  const [manual, setManual] = createStore<{
    positions: Record<string, [number, number, number]>
    sizes: Record<string, [number, number]>
  }>({ positions: {}, sizes: {} })
  // T18.3: the auto detail mode threshold — when the map is narrower than this, the detail
  // lives in a window instead of the panel. The toolbar's compact threshold is 1030px for the
  // whole panel; the map itself is narrower, so the threshold is proportionally smaller.
  const AUTO_DETAIL_THRESHOLD = 640
  let renderer: GraphRenderer | undefined
  let rootEl!: HTMLDivElement
  let canvasRegionEl!: HTMLDivElement

  // The turn a node belongs to: a turn node owns itself, anything else inherits from its ancestry.
  const turnOf = (id: string | undefined) => {
    if (!id) return undefined
    const node = nodeByID(props.model, id)

    if (!node) return undefined
    if (node.kind === "turn") return node.id

    return ancestors(props.model, id).find((ancestor) => ancestor.kind === "turn")?.id
  }

  // P8.1: the vanilla library controller owns interaction state (selection + trail). The view feeds
  // it the model, mirrors its snapshot into signals, and keeps the DOM/renderer in sync.
  const selection = createGraphSelection({
    model: () => props.model,
    controlled: () => props.selection,
    onSelect: (id) => props.onSelect?.(id),
    onChange: () => setPopoverDismissed(false),
    count: () => Metrics.count("select"),
  })
  // T17.4: when detailMode is "window" (or "auto" resolving to window), open a window for the selected node's detail.
  createEffect(() => {
    if (effectiveDetailMode() !== "window") return
    const id = selection.selection()[0]
    if (!id) return
    openWindow("node", id)
  })
  const selectedTurn = () => turnOf(selection.selection()[0])
  // T6.6: a long session is drawn as its recent tail. The window is declared — the view says how
  // much of the session it shows — and it keeps the turn the reader is looking at.
  // T18.1: when followLog is enabled, also keep the active turn from the log in the drawn window.
  const scale = createMemo(() =>
    scaleWindow(
      props.model,
      [selectedTurn(), turnOf(props.frame), followLog() ? props.activeTurn : undefined].filter(
        (id): id is string => !!id,
      ),
    ),
  )
  const turnScoped = createMemo(() => scopeToTurns(props.model, scale().turns))
  // B1 — "keep only" is a scope over the held set, applied after facets so the two compose.
  const [keptIds, setKeptIds] = createSignal<ReadonlySet<string> | null>(null)
  const scoped = createMemo(() => {
    const base = applyFacets(turnScoped(), facets())
    const keep = keptIds()
    if (!keep) return base
    const ids = new Set(keep)
    ids.add(base.root)
    return {
      ...base,
      nodes: base.nodes.filter((node) => ids.has(node.id)),
      edges: base.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
      turns: base.turns.filter((turn) => ids.has(turn)),
      activeTurn: base.activeTurn !== undefined && ids.has(base.activeTurn) ? base.activeTurn : undefined,
    }
  })
  const counts = createMemo(() => facetCounts(turnScoped(), facets()))
  // B1 — a parked view is a diff against the live map, not a different map: the same positions
  // carry added and changed marks, and nothing re-lays-out when the scrubber moves.
  const comparison = createMemo(() => {
    const checkpoint = props.checkpoint
    const turns = props.model.turns
    if (checkpoint === undefined || props.turnCount === undefined) return undefined
    if (checkpoint >= turns.length - 1 || checkpoint < 0) return undefined
    const parked = scopeToTurns(props.model, new Set(turns.slice(0, checkpoint + 1)))
    const changes = reviewChanges(parked, scoped())
    return {
      added: new Set(changes.added),
      removed: new Set(changes.removed),
      changed: new Set(changes.changed),
      counts: {
        added: changes.added.length,
        removed: changes.removed.length,
        changed: changes.changed.length,
      },
    }
  })
  const clearComparison = () => props.onCheckpoint?.(Math.max(0, props.model.turns.length - 1))
  // T6.6: the first turn of the drawn window. The lane gutter and the camera frame follow it, so a
  // capped map is a readable window instead of an empty stretch of the session.
  const windowAnchor = createMemo(() => {
    if (scale().hidden === 0) return undefined

    return [...scale().turns][0]
  })

  // T18.1: when followLog is enabled and the active turn changes, frame it.
  // The camera only moves when the reader asked for it (followLog is on), and only when the
  // active turn actually changes — not on every render.
  const [lastFramedTurn, setLastFramedTurn] = createSignal<string>()
  createEffect(() => {
    if (!followLog()) return
    const turn = props.activeTurn
    if (!turn) return
    if (lastFramedTurn() === turn) return
    if (!rendererReady()) return
    const current = viewport()
    if (!current) return
    setLastFramedTurn(turn)
    camera.frameReadable(turn)
  })

  // U3.8/RF.8: below 768px the inspector becomes a bottom sheet instead of squeezing the canvas.
  // RF.7: below the width the toolbar's own row needs, the secondary controls collapse into an
  // overflow menu. T14.1 measured that row: the inline controls and the end block take 913px, and
  // the split control added 28px to the end block, so the row needs 941px. With the panel's padding
  // (16px) and the app's floating header (72px) the row needs 1029px, and a narrower panel would
  // wrap and push the back control under the header.
  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      const nextNarrow = width > 0 && width < 768
      const nextCompact = width > 0 && width < 1030
      setNarrow((current) => (current === nextNarrow ? current : nextNarrow))
      setCompact((current) => (current === nextCompact ? current : nextCompact))
    })
    observer.observe(rootEl)
    onCleanup(() => observer.disconnect())

    // Handle copy trace outline request from detail actions
    const handleCopyTraceOutline = () => copyTraceOutline()
    window.addEventListener("graph:copy-trace-outline", handleCopyTraceOutline)
    onCleanup(() => window.removeEventListener("graph:copy-trace-outline", handleCopyTraceOutline))
  })

  // The canvas region's size, for the same reason: the card tier is measured in screen pixels, and
  // the popover is placed inside the region it floats over.
  onMount(() => {
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

  const theme = () => props.theme ?? resolvedTheme()
  // The width of an activity card on the screen, in pixels: the card's world width times how many
  // pixels one world unit covers in the current frame. This is the legibility the reader actually
  // has, so it is what decides how much a card says.
  const cardScreenWidth = createMemo(() => {
    const extent = viewport()?.extent
    const size = canvasSize()
    if (!extent?.width || !size.width) return CARD_SIZE[0]
    return (CARD_SIZE[0] * size.width) / extent.width
  })
  // T18.3: the effective detail mode when "auto" is selected — the detail lives in the panel
  // when the map is wide enough, and in a window when it is narrow. The threshold follows the
  // toolbar's compact measurement (the map's own width, not the panel's).
  const effectiveDetailMode = createMemo<DetailMode>(() => {
    const mode = detailMode()
    if (mode !== "auto") return mode
    return canvasSize().width >= AUTO_DETAIL_THRESHOLD ? "panel" : "window"
  })
  const [tier, setTier] = createSignal<DetailTier>("mid")
  createEffect(() => {
    const width = cardScreenWidth()
    // The tier is read as well as written: the hysteresis needs a second pass to settle, and a card
    // that stops changing size would otherwise stay one tier behind the reader.
    const current = tier()
    setTier(detailTier(width, current))
  })
  // T11.3 — a file's card says who read it and who wrote it: a fact only the graph's edges know.
  const copy = createCardCopy(i18n)
  const relations = createMemo(() => fileRelations(props.model))
  const relatedDetail = (node: GraphNode) => {
    if (node.kind !== "file") return undefined
    const relation = relations().get(node.id)
    if (!relation) return undefined
    const parts = [
      relation.reads > 0 ? copy.reads(relation.reads) : undefined,
      relation.writes > 0 ? copy.writes(relation.writes) : undefined,
    ].filter((part): part is string => !!part)
    return parts.length > 0 ? parts.join(" · ") : undefined
  }
  const renderCard = createMemo(() => {
    // The age rules fade a card against the clock, so the cards are rebuilt with the model.
    const now = Date.now()
    const overlay = traceOverlay()
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
      })
    )
  })
  const renderBand = createMemo(() => createBandTemplate(theme()))
  // T7: the tree re-centres a parent when a child is appended and the force simulation relaxes its
  // boxes, so both need the positions the last layout gave them. The view keeps them per view, so
  // a streamed session never moves a node the reader is looking at.
  const layoutHistory = new Map<string, ReadonlyMap<string, Position>>()
  const sessionKey = () => nodeIndex(props.model).get(props.model.root)?.data?.sessionID ?? "session"
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
  const geometry = createMemo((): GraphLayout => {
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
    const next = layoutGraph(props.model, {
      strategy: current,
      level: level(),
      previous: layoutHistory.get(key),
      nodeSizeFn: sizedCard,
    })

    layoutHistory.set(key, next.positions)

    return next
  })

  const displayPositions = createMemo(() => {
    const base = geometry().positions
    if (Object.keys(manual.positions).length === 0) return base

    const positions = new Map(base)
    for (const [id, position] of Object.entries(manual.positions)) {
      positions.set(id, { x: position[0], y: position[1], z: position[2] })
    }
    return positions
  })

  const moveNodes = (nodes: readonly { id: string; position: [number, number, number] }[]) => {
    for (const node of nodes) setManual("positions", node.id, node.position)
  }

  const resizeNode = (resize: { id: string; size: [number, number]; position: [number, number, number] }) => {
    setManual("positions", resize.id, resize.position)
    setManual("sizes", resize.id, resize.size)
  }
  // LE.1: whether a structural change is waiting for the canvas to apply the matching model before we
  // frame it. Streaming model updates leave it false, so they never refit.
  const [needsFit, setNeedsFit] = createSignal(true)
  // T6.8: the view says what it changed, so a screen-reader user knows the map moved.
  const viewAnnouncement = createMemo(() =>
    i18n.t("ui.sessionGraph.a11y.view", {
      level: i18n.t(LEVEL_KEY[level()]),
      layout: i18n.t(LAYOUT_KEY[layout()]),
      depth: i18n.t(DEPTH_KEY[depth()]),
    }),
  )
  // T1.11: the summary layouts name their axes; the node-link graph names itself.
  const turnNumbers = createMemo(() => new Map(props.model.turns.map((id, index) => [id, index + 1])))
  const axisLabels = createMemo(() => buildAxisLabels(scoped(), turnRows(scoped(), level()), layout(), turnNumbers(), i18n.t))

  // T17.2 — a summary draws the level's units, and a cluster yields to its members below the
  // overview. The render model draws the same set, so the two cannot disagree.
  const drawn = createMemo(() => {
    const current = scoped()
    if (!isSummaryOrLogLayout(layout())) return current
    const units = summaryUnits(current, level())
    return { ...current, nodes: current.nodes.filter((node) => units.has(node.id)) }
  })

  // T17.5 — the camera's resting place: the centre the camera last came to rest at. The card
  // budget follows the camera, and a budget that changed on every frame would rebuild the map on
  // every frame and make the cards churn under the reader's hand.
  const [resting, setResting] = createSignal<[number, number, number]>()
  let restTimer: ReturnType<typeof setTimeout> | undefined
  const rest = (next: RendererViewport) => {
    if (restTimer) clearTimeout(restTimer)
    restTimer = setTimeout(() => {
      restTimer = undefined
      setResting(next.center)
    }, REST_SETTLE_MS)
  }
  onCleanup(() => {
    if (restTimer) clearTimeout(restTimer)
  })

  // T17.5 — the card budget follows the camera. The adapter spends the budget in the order it walks
  // the nodes, so the order decides which nodes get a card: the ones under the reader's hand.
  const budget = createMemo(() => {
    const current = drawn()
    const weighted = applyNodeBudget(current, degreeBudget(current, selection.selection()))
    const centre = resting()
    if (!centre) return weighted
    return byProximity(weighted, displayPositions(), centre)
  })

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

  const renderModel = createMemo(() =>
    applyManualLayout(
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
                label: i18n.t(LANE_KEY[lane.name]),
                y: lane.y,
                // T6.6: the gutter belongs to the drawn window, not to the session root far to the left.
                anchorNodeId: windowAnchor(),
              }))
            : undefined,
        axisLabels: axisLabels(),
        renderCard: renderCard(),
        renderBand: renderBand(),
      }),
    ),
  )

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

  // B1 — the selection verbs. Each is a pure function of the held ids.
  const frameSelection = () => camera.frame(selection.selection())
  const keepOnlySelection = () => {
    const ids = selection.selection()
    if (ids.length === 0) return
    setKeptIds(new Set(ids))
    announce(i18n.plural("ui.sessionGraph.status.kept", ids.length))
  }
  const copySelectedPaths = () => {
    const ids = selection.selection()
    const text = ids
      .map((id) => breadcrumbs(props.model, id).map((node) => node.label).join(" › "))
      .filter((line) => line.length > 0)
      .join("\n")
    if (!text) return
    navigator.clipboard?.writeText(text)
    announce(i18n.plural("ui.sessionGraph.status.copied", ids.length))
  }
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
  const clearSelectionScope = () => setKeptIds(null)

  const selectedNode = () => {
    const id = selection.selection()[0]
    return id ? nodeByID(props.model, id) : undefined
  }
  // T1.9: the inspector can describe a node the current level does not draw. Say so and offer the
  // level change, rather than leaving the user with an invisible selection.
  const hiddenSelection = () => {
    const node = selectedNode()
    return node && !isVisibleAt(node, level()) ? node : undefined
  }
  // T6.6: the map says how much of the session it shows, so a capped view is never a silent one.
  const scaleNotice = createMemo(() => {
    const { turns, total, hidden } = scale()

    if (hidden === 0) return undefined

    return { shown: turns.size, total, text: i18n.t("ui.sessionGraph.scale.notice", { shown: turns.size, total }) }
  })
  // LE.1: fit the drawn content, not the non-interactive bands, and re-frame when the inspector
  // toggles (the canvas narrows when the side panel opens). Streaming updates deliberately do not
  // refit, so the ids are read untracked inside the fit effect rather than as a dependency.
  // T6.6: at scale the session root sits far to the left of the drawn window, so framing it would
  // open the camera on empty space. The root stays drawn; it just does not pull the frame away.
  const contentIDs = () => {
    const ids = renderModel()
      .nodes.filter((node) => node.kind !== "band")
      .map((node) => node.id)

    return scale().hidden > 0 ? ids.filter((id) => id !== props.model.root) : ids
  }
  // T1.18: the fit keeps a legible minimum scale; the renderer zooms in rather than shrink the
  // content past it, and the reader pans the rest.
  const fitOptions = () => ({
    minScale: MIN_CARD_HEIGHT_PX / CARD_SIZE[1],
    insets: undefined,
  })
  // The panel takes layout width and reframes the camera when it opens; the popover and the card do
  // neither, so the map does not move under the reader when a node is selected.
  const inspectorOpen = createMemo(() => effectiveDetailMode() === "panel" && !!selectedNode())

  const camera = createGraphCamera({
    renderer: () => renderer,
    viewport,
    capabilities,
    content: contentIDs,
    fit: fitOptions,
    positionOf: (id) => displayPositions().get(id),
    cardWidth: cardScreenWidth,
    cardWorldWidth: CARD_SIZE[0],
    readableWidth: READABLE_CARD_WIDTH,
  })

  // The node the popover describes, and where it hangs.
  const popoverNode = createMemo(() => (effectiveDetailMode() === "popover" ? selectedNode() : undefined))
  const popoverAnchor = createNodeAnchor({ node: popoverNode, renderer: () => renderer, viewport })
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
    return nodeByID(props.model, id)
  })
  const peekAnchor = createNodeAnchor({ node: peekNode, renderer: () => renderer, viewport })
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
  const windowAnchors = createMemo(() => {
    if (!viewport()) return undefined
    return pinnedAnchors(props.windows ?? [], (nodeID) => renderer?.getNodeScreenPosition?.(nodeID))
  })

  // T12 — the windows over the map. The kinds are the host's; the manager knows none of them: it
  // moves, resizes and stacks them.
  const windowKinds = createMemo<GraphWindowKind[]>(() => [
    {
      name: "node",
      title: (window) => {
        const node = window.nodeID ? nodeByID(props.model, window.nodeID) : undefined
        return node?.label ?? i18n.t("ui.sessionGraph.window.detail")
      },
      render: (window) => {
        const node = window.nodeID ? nodeByID(props.model, window.nodeID) : undefined
        if (!node)
          return <div class="px-3 py-2 text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.window.missing")}</div>
        return (
          <GraphDetailSurface
            model={props.model}
            node={node}
            diffSource={props.diffSource}
            renderSummary={props.renderSummary}
            link={props.link}
            onSelect={selection.select}
            onOpenTranscript={props.onOpenTranscript ? openInTranscript : undefined}
            onOpenSession={props.onOpenSession}
            traceKind={traceKind()}
            onTraceWhy={(id) => startTrace("why", id)}
            onTraceLedHere={(id) => startTrace("led-here", id)}
            onTraceRelated={(id) => startTrace("related", id)}
            onClearTrace={clearTrace}
            onCopyTraceOutline={(text) => navigator.clipboard?.writeText(text)}
          />
        )
      },
    },
    {
      name: "filesystem",
      title: () => i18n.t("ui.sessionGraph.filesystem.title"),
      render: (window) => (
        <GraphFilesystemWindow
          model={props.model}
          workspaceRoot={props.model.workspaceRoot ?? props.model.root}
          onSelect={selection.select}
          onOpen={(file) => props.onActionNavigate?.({ file: file.data?.path as string })}
          selection={selection.selection()[0]}
        />
      ),
    },
    {
      name: "legend",
      title: () => i18n.t("ui.sessionGraph.legend.label"),
      render: () => <GraphLegendBody theme={theme()} layout={layout()} rules={props.rules} />,
    },
    {
      name: "equalizer",
      title: () => i18n.t("ui.sessionGraph.equalizer.title"),
      render: () => (
        <GraphEqualizerBody
          rules={props.rules ?? []}
          onChange={(rules) => props.onRulesChange?.(rules)}
        />
      ),
    },
    {
      name: "minimap",
      title: () => i18n.t("ui.sessionGraph.minimap.label"),
      render: () => (
        <GraphMinimap
          model={props.model}
          positions={displayPositions()}
          theme={theme()}
          viewport={viewport()}
          onPan={(center: [number, number]) => {
            const current = viewport()
            if (!current) return
            renderer?.setViewport({ zoom: current.zoom, center: [center[0], center[1], 0] })
          }}
        />
      ),
    },
  ])

  const windowContent = (window: GraphWindowState) => {
    const kind = windowKind(windowKinds(), window)
    if (!kind)
      return <div class="px-3 py-2 text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.window.unknown")}</div>
    return kind.render(window)
  }

  // T12 — the view proposes a window's first placement: the canvas is what a window lives in, so
  // the view knows how much room there is. The host persists what the reader does with it.
  const openWindow = (kind: string, nodeID?: string) => {
    const window = proposeWindow(kind, nodeID, { canvas: canvasSize(), windows: props.windows ?? [] })
    props.onOpenWindow?.(window)
    return window
  }

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
    const node = nodeByID(props.model, id)

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
  const changedFilesList = createMemo(() => changedFiles(props.model))
  const jumpTo = (node: GraphNode) => {
    const minimum = minLevelOf(node)
    if (LEVEL_RANK[minimum] > LEVEL_RANK[level()]) setLevel(minimum)
    selection.select(node.id)
    camera.focus(node.id)
  }
  // U3.11: clicking a breadcrumb selects it and frames its subtree, so the canvas follows the trail.
  const fitSubtree = (id: string) => {
    selection.select(id)
    renderer?.fit(
      subtree(props.model, id).map((node) => node.id),
      fitOptions(),
    )
  }

  // T3.5: a permalink frames its node. The semantic level rises first when the node is hidden at the
  // current one, and the camera moves once the model that carries the node has been applied.
  const [framed, setFramed] = createSignal<string>()
  const raiseLevelForFrame = () => {
    const id = props.frame
    if (!id) return false
    const node = nodeByID(props.model, id)
    if (!node) return false
    const minimum = minLevelOf(node)
    if (LEVEL_RANK[minimum] <= LEVEL_RANK[level()]) return false
    setLevel(minimum)
    return true
  }
  const focusFrame = (instance: GraphRenderer | undefined) => {
    const id = props.frame
    if (!id || !instance || framed() === id) return
    const node = nodeByID(props.model, id)
    if (!node) return
    selection.select(id, false)
    camera.focus(id)
    setFramed(id)
  }
  // A permalink that changes while the graph is open frames its node too, not only on load.
  createEffect(() => {
    const id = props.frame
    const node = id ? nodeByID(props.model, id) : undefined
    if (!node) return
    focusFrame(renderer)
  })

  // A11y live region announcement helper.
  const announce = (message: string) => {
    const region = document.getElementById(a11yInstructionsId)
    if (region) {
      region.textContent = ""
      region.textContent = message
    }
  }

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

  // RF.10: a small keyboard map on the canvas region (`/` search, `f` fit, `1/2/3` levels). Keys that
  // originate inside the a11y list or a form control are left to their owner.
  const onRegionKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null

    if (target?.closest("[data-slot='graph-a11y'], input, textarea, [contenteditable]")) return

    if (event.key === "Escape") {
      event.preventDefault()
      dismissDetail()

      return
    }

    // Trace keyboard shortcuts (A1): w=Why, e=Led-here, r=Related, [/]=step lit nodes
    const selectionId = selection.selection()[0]
    if (selectionId) {
      if (event.key === "w") {
        event.preventDefault()
        startTrace("why", selectionId)
        return
      }
      if (event.key === "e") {
        event.preventDefault()
        startTrace("led-here", selectionId)
        return
      }
      if (event.key === "r") {
        event.preventDefault()
        startTrace("related", selectionId)
        return
      }
      if (event.key === "[") {
        event.preventDefault()
        const overlay = traceOverlay()
        if (overlay) {
          const current = traceOverlay()?.answerIds.has(selectionId) ? selectionId : undefined
          const prev = stepLitNode(overlay, current, -1)
          if (prev) selection.select(prev)
        }
        return
      }
      if (event.key === "]") {
        event.preventDefault()
        const overlay = traceOverlay()
        if (overlay) {
          const current = traceOverlay()?.answerIds.has(selectionId) ? selectionId : undefined
          const next = stepLitNode(overlay, current, 1)
          if (next) selection.select(next)
        }
        return
      }
    }

    if (event.key === "/") {
      event.preventDefault()
      openSearch()

      return
    }

    if (event.key === "g") {
      event.preventDefault()
      openSearch("g ")

      return
    }

    if (event.key === "f") {
      event.preventDefault()
      camera.fitContent()

      return
    }

    const level = { "1": "overview", "2": "execution", "3": "detail" }[event.key] as ZoomLevel | undefined

    if (level) setLevel(level)
  }

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
    if (camera.pending()) return
    // The camera is the renderer, so the framing waits for it: the first viewport report can
    // arrive before the renderer itself is handed over.
    if (!rendererReady()) return
    const current = viewport()
    if (!current) return
    if (framedSelection() === id) return
    setFramedSelection(id)
    camera.frameReadable(id)
  })
  const applyModel = (instance: GraphRenderer) => {
    // T3.5: a level change rebuilds the model, so the frame waits for the one that carries the node.
    if (raiseLevelForFrame()) return
    if (needsFit()) {
      setNeedsFit(false)
      camera.request(() => instance.fit(untrack(contentIDs), fitOptions()))
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
    const instance = renderer
    if (!instance) return
    camera.request(() => instance.fit(untrack(contentIDs), untrack(fitOptions)))
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
        onFit={camera.fitContent}
        zoomPercent={camera.zoomPercent()}
        onZoomOut={() => camera.zoomBy(-1)}
        onZoomIn={() => camera.zoomBy(1)}
        zoomOutDisabled={level() === "overview" || (viewport()?.zoom ?? 0) <= camera.zoomLimits().min}
        zoomInDisabled={(viewport()?.zoom ?? 0) >= camera.zoomLimits().max}
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
        model={props.model}
      />
      <GraphBreadcrumbs crumbs={selection.crumbs()} onSelect={fitSubtree} />
      <GraphStatusBar
        count={selection.selection().length}
        onFrame={frameSelection}
        onKeepOnly={keepOnlySelection}
        onCopyPaths={copySelectedPaths}
        onExportSubset={exportSelection}
        onClear={clearSelectionScope}
      />
      <Show when={comparison()}>
        {(diff) => (
          <div
            data-slot="graph-compare-bar"
            class="flex flex-wrap items-center gap-2 border-b border-border-weaker-base px-2 py-1 text-12-regular text-text-weak"
          >
            <span data-slot="graph-compare-counts" class="tabular-nums">
              {i18n.t("ui.sessionGraph.compare.chip", {
                added: String(diff().counts.added),
                removed: String(diff().counts.removed),
                changed: String(diff().counts.changed),
              })}
            </span>
            <span class="min-w-0 flex-1 truncate">{i18n.t("ui.sessionGraph.compare.parked")}</span>
            <button
              type="button"
              data-slot="graph-compare-clear"
              class="shrink-0 rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
              onClick={() => clearComparison()}
            >
              {i18n.t("ui.sessionGraph.compare.live")}
            </button>
          </div>
        )}
      </Show>
      <Show when={scaleNotice()}>
        {(notice) => (
          <div
            data-slot="graph-scale-notice"
            class="flex items-center gap-2 border-b border-border-weaker-base px-3 py-1 text-12-regular text-text-weak"
          >
            <span class="min-w-0 flex-1 truncate">{notice().text}</span>
          </div>
        )}
      </Show>
      <Show when={hiddenSelection()}>
        {(node) => (
          <div
            data-slot="graph-selection-hidden"
            class="flex items-center gap-2 border-b border-border-weaker-base px-3 py-1 text-12-regular text-text-weak"
          >
            <span class="min-w-0 flex-1 truncate">
              {i18n.t("ui.sessionGraph.selection.hidden", { label: node().label })}
            </span>
            <button
              type="button"
              class="shrink-0 rounded-sm px-1 text-text-base hover:text-text-strong"
              onClick={() => jumpTo(node())}
            >
              {i18n.t("ui.sessionGraph.selection.show")}
            </button>
          </div>
        )}
      </Show>
      <Show when={fallback() && !error()}>
        <div
          data-slot="graph-fallback"
          class="border-b border-border-weaker-base bg-surface-base px-2 py-1 text-12-regular text-text-weak"
        >
          {i18n.t("ui.sessionGraph.fallback")}
        </div>
      </Show>
      <div class="relative flex min-h-0 flex-1" classList={{ "flex-col": narrow() }}>
        <Show when={files() && !isSummaryLayout(layout()) && !narrow()}>
          <GraphFileRail
            files={changedFilesList()}
            selection={selection.selection()}
            onSelect={(id) => selection.select(id)}
          />
        </Show>
        <div
          ref={canvasRegionEl}
          class="relative min-w-0 flex-1"
          data-slot="graph-canvas-region"
          role="group"
          aria-label={i18n.t("ui.sessionGraph.canvas.label")}
          aria-describedby={a11yInstructionsId}
          tabindex="0"
          onKeyDown={onRegionKeyDown}
        >
          <GraphCanvas
            model={renderModel()}
            theme={theme()}
            projection={projection()}
            depth={depth()}
            selection={selection.selection()}
            preferredRenderer={props.preferredRenderer}
            overrides={props.rendererOverrides}
            onSelect={(ids) => selection.select(ids)}
            onNodeDoubleClick={expandToGraph}
            onBackgroundClick={() => selection.select(undefined)}
            onHover={(id) => setHovered(id)}
            onNodeMoved={moveNodes}
            onNodeResized={resizeNode}
            cardFacing={cardFacing()}
            onModelApplied={applyModel}
            onRenderer={(instance) => {
              renderer = instance
              setRendererReady(!!instance)
              props.onRenderer?.(instance)
            }}
            onReady={(info) => {
              setError(undefined)
              setCapabilities(info.capabilities)
              setRendererID(info.id)
              setFallback(info.fallback)
            }}
            onError={(cause) => setError(cause instanceof Error ? cause.message : String(cause))}
            onViewportChange={(next) => {
              camera.report(next)
              rest(next)
              setViewport(next)
            }}
          />
          <GraphA11y
            model={ordered()}
            selection={selection.selection()}
            instructionsId={a11yInstructionsId}
            announcement={viewAnnouncement()}
            onSelect={selection.select}
            onEscape={() => selection.select(undefined)}
          />
          <Show when={peekFrame()}>
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
          <Show when={effectiveDetailMode() === "popover"}>
            <div
              data-slot="graph-popover-anchor"
              class="absolute z-20"
              style={{
                left: `${popoverPlacement().left}px`,
                top: `${popoverPlacement().top}px`,
                display: popoverVisible() ? "block" : "none",
              }}
            >
              <GraphPopover
                model={props.model}
                node={popoverNode()}
                diffSource={props.diffSource}
                renderSummary={props.renderSummary}
                link={props.link}
                onCopyView={copyView}
                onSelect={selection.select}
                onOpenTranscript={props.onOpenTranscript ? openInTranscript : undefined}
                onOpenSession={props.onOpenSession}
                onOpenWindow={(node) => openWindow("node", node.id)}
                onClose={() => setPopoverDismissed(true)}
                traceKind={traceKind()}
                onTraceWhy={(id) => startTrace("why", id)}
                onTraceLedHere={(id) => startTrace("led-here", id)}
                onTraceRelated={(id) => startTrace("related", id)}
                onClearTrace={clearTrace}
                onCopyTraceOutline={(text) => navigator.clipboard?.writeText(text)}
              />
            </div>
          </Show>
          <GraphWindows
            windows={props.windows ?? []}
            onChange={props.onWindowsChange}
            onClose={(id) => props.onWindowsChange?.((props.windows ?? []).filter((w) => w.id !== id))}
            title={(window) =>
              windowKind(windowKinds(), window)?.title(window) ?? i18n.t("ui.sessionGraph.window.detail")
            }
            render={windowContent}
            anchorOf={(nodeID) => windowAnchors()?.get(nodeID)}
            bounds={() => canvasSize()}
          />
          <Show when={error()}>
            <div
              data-slot="graph-error"
              class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background-base/80 px-6 text-center"
            >
              <span class="text-14-medium text-text-strong">{i18n.t("ui.sessionGraph.canvas.error")}</span>
              <span class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.canvas.errorHint")}</span>
              <Show when={props.onBack}>
                <button
                  type="button"
                  class="rounded-sm border border-border-base px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
                  onClick={() => props.onBack?.()}
                >
                  {i18n.t("ui.sessionGraph.toolbar.back")}
                </button>
              </Show>
            </div>
          </Show>
          <Show when={!error() && props.model.nodes.length === 0}>
            <div
              data-slot="graph-empty"
              class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center"
            >
              <span class="text-14-regular text-text-weak">{i18n.t("ui.sessionGraph.canvas.empty")}</span>
              <span class="text-12-regular text-text-weaker">{i18n.t("ui.sessionGraph.canvas.emptyHint")}</span>
            </div>
          </Show>
          <Show when={searchOpen()}>
            <GraphSearch
              model={props.model}
              initialQuery={searchInitial()}
              onSelect={(node) => {
                jumpTo(node)
                setSearchOpen(false)
              }}
              onClose={() => setSearchOpen(false)}
            />
          </Show>
          <Show when={legendOpen()}>
            <GraphLegend
              theme={theme()}
              layout={layout()}
              rules={props.rules}
              onClose={() => setLegendOpen(false)}
            />
          </Show>
          <Show when={galleryOpen()}>
            <GraphGallery
              model={props.model}
              theme={theme()}
              current={layout()}
              onOpen={changeLayout}
              onClose={() => setGalleryOpen(false)}
            />
          </Show>
        </div>
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
              model={props.model}
              node={selectedNode()}
              diffSource={props.diffSource}
              renderSummary={props.renderSummary}
              link={props.link}
              onCopyView={copyView}
              onSelect={selection.select}
              onOpenTranscript={props.onOpenTranscript ? openInTranscript : undefined}
              onOpenSession={props.onOpenSession}
              traceKind={traceKind()}
              onTraceWhy={(id) => startTrace("why", id)}
              onTraceLedHere={(id) => startTrace("led-here", id)}
              onTraceRelated={(id) => startTrace("related", id)}
              onClearTrace={clearTrace}
              onCopyTraceOutline={(text) => navigator.clipboard?.writeText(text)}
            />
          </div>
        </Show>
      </div>
    </div>
  )
}
