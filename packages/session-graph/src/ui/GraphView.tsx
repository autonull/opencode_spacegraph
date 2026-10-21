import type { DepthMode, GraphRenderer, Projection, RendererCapabilities, RendererViewport, RenderTheme, RenderModel } from "@spacegraphjs/renderer"
import { DEPTH_MODES, supports, supportsDepth } from "@spacegraphjs/renderer"
import type { DetailMode, DetailTier, GraphLayout, GraphModel, GraphNode, LayoutStrategy, Position, Representation, ZoomLevel } from "@opencode/session-ui/graph"
import {
  ancestors,
  breadcrumbs,
  CARD_SIZE,
  changedFiles,
  COMPACT_SIZE,
  detailTier,
  laneAnchors,
  layoutGraph,
  LEVEL_RANK,
  isVisibleAt,
  matrixColumn,
  matrixLayout,
  Metrics,
  minLevelOf,
  nodeByID,
  nodeSize,
  representationLevel,
  ribbonLayout,
  scaleWindow,
  scopeToTurns,
  subtree,
  turnRows,
} from "@opencode/session-ui/graph"
import { GraphController } from "spacegraphjs/control"
import { useI18n } from "@opencode/ui/context/i18n"
import { createEffect, createMemo, createSignal, createUniqueId, onCleanup, onMount, Show, untrack, type JSX } from "solid-js"
import { buildRenderModel, type CardTemplate } from "../canvas/buildRenderModel"
import { GraphCanvas } from "../canvas/GraphCanvas"
import type { RendererFactory, RendererID } from "../canvas/renderer-registry"
import { GraphA11y } from "./GraphA11y"
import { GraphBreadcrumbs, type GraphBreadcrumb } from "./GraphBreadcrumbs"
import { createBandTemplate, createCardTemplate } from "./cardTemplate"
import { LANE_KEY, LEVEL_KEY, REPRESENTATION_KEY, DEPTH_KEY } from "./vocabulary"
import type { GraphDiffSource } from "./GraphDiff"
import { GraphFileRail } from "./GraphFileRail"
import { GraphGallery } from "./GraphGallery"
import { GraphInspector } from "./GraphInspector"
import { GraphLegend } from "./GraphLegend"
import { GraphMinimap, MINIMAP_GAP, MINIMAP_SIZE } from "./GraphMinimap"
import { GraphPeek } from "./GraphPeek"
import { GraphPopover, POPOVER_GAP, POPOVER_MAX_HEIGHT, POPOVER_WIDTH } from "./GraphPopover"
import { GraphSearch } from "./GraphSearch"
import { GraphToolbar } from "./GraphToolbar"
import { createGraphTheme } from "./theme"
import { renderToSVG, serializeRenderModel, type SvgOptions } from "@spacegraphjs/svg-renderer"

/**
 * T1.18 — the legibility floor. A fit never shrinks an activity card below half its natural size, so
 * a view that cannot show everything (the hierarchy outline, the file lens between the rail and the
 * inspector) is panned instead of shrunk to text too small to read. Half size keeps the card's 13px
 * label at 6.5px, the size the lane views are read at.
 */
const MIN_CARD_HEIGHT_PX = CARD_SIZE[1] / 2

export type GraphViewProps = {
  model: GraphModel
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
  /** RF.2: controlled layout strategy; the host persists the choice. */
  strategy?: LayoutStrategy
  /** LE.7: controlled representation (node-link graph | turn ribbon | turn matrix); the host persists it. */
  representation?: Representation
  /** RF.7: controlled minimap visibility; the host persists the choice (default off). */
  minimap?: boolean
  /**
   * Where a selected node's detail is shown: nowhere, on the node itself, in a popover beside it, or
   * in the side panel. The host persists the choice; the view mirrors it.
   */
  detailMode?: DetailMode
  /** The transient peek at the node under the pointer; the host persists the choice. */
  peek?: boolean
  /** LE.12: the file-first lens (changed-files rail + bundled provenance edges); the host persists it. */
  files?: boolean
  /** RF.8: host loader for a finished turn's changed-file diffs, shown on demand in the inspector. */
  diffSource?: GraphDiffSource
  /** Optional host renderer for a node's summary (for example MarkDown); falls back to plain text. */
  renderSummary?: (node: GraphNode) => JSX.Element | undefined
  renderCard?: CardTemplate
  /** Reserved inline-end length for host chrome that floats over the panel's top-right corner. */
  endInset?: string
  /**
   * T3.5: the node to select and frame. The view raises the semantic level when the node is hidden
   * at the current one, then moves the camera to it once the model that carries it is applied.
   */
  frame?: string
  /** T3.5: the shareable link to the selected node; the inspector offers to copy it. */
  link?: string
  /** Exposes the live renderer so a host can drive the camera (T6.18/T6.19). */
  onRenderer?: (renderer: GraphRenderer | undefined) => void
  onSelect?: (id: string | undefined) => void
  onProjectionChange?: (projection: Projection) => void
  onDepthChange?: (depth: DepthMode) => void
  onStrategyChange?: (strategy: LayoutStrategy) => void
  onRepresentationChange?: (representation: Representation) => void
  onMinimapChange?: (minimap: boolean) => void
  onFilesChange?: (files: boolean) => void
  onDetailModeChange?: (mode: DetailMode) => void
  onPeekChange?: (peek: boolean) => void
  onOpenTranscript?: (id: string) => void
  /**
   * T6.5: opens another session — a delegation's child, a fork's origin, a child session's parent.
   * The host owns the navigation; the graph only names the session.
   */
  onOpenSession?: (sessionID: string) => void
  /** Opens the hybrid turn map (H6.2) for a turn; the toolbar offers it when a turn is selected. */
  onTurnMap?: (turnID: string) => void
  onBack?: () => void
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
  const [cardFacing, setCardFacing] = createSignal<'plane' | 'camera'>('plane')
  const toggleBillboard = () => setCardFacing((current) => (current === 'camera' ? 'plane' : 'camera'))
  const [strategy, setStrategy] = createSignal<LayoutStrategy>(props.strategy ?? "lanes")
  const [representation, setRepresentation] = createSignal<Representation>(props.representation ?? "graph")
  const [minimap, setMinimap] = createSignal<boolean>(props.minimap ?? false)
  const [files, setFiles] = createSignal<boolean>(props.files ?? false)
  // Where a selected node's detail is shown. The panel is the default: the popover and the card are
  // alternatives a reader can pick, and the map still works with the detail off.
  const [detailMode, setDetailMode] = createSignal<DetailMode>(props.detailMode ?? "panel")
  // The transient look at the node under the pointer; it never changes the selection.
  const [peek, setPeek] = createSignal<boolean>(props.peek ?? false)
  const [hovered, setHovered] = createSignal<string>()
  // The popover is dismissed by Escape but the selection stays; a second Escape clears it.
  const [popoverDismissed, setPopoverDismissed] = createSignal(false)
  const [searchOpen, setSearchOpen] = createSignal(false)
  // T6.8: the legend names the encoding, so a first-time reader can decode the map without a briefing.
  const [legendOpen, setLegendOpen] = createSignal(false)
  // T7.5: the layout gallery — the same model in every layout, so the reader compares instead of
  // committing to one.
  const [galleryOpen, setGalleryOpen] = createSignal(false)
  // P8.1: the vanilla library controller owns interaction state (selection + trail). The view feeds
  // it the model, mirrors its snapshot into signals, and keeps the DOM/renderer in sync.
  const [selection, setSelection] = createSignal<readonly string[]>(props.selection ? [props.selection] : [])
  const [crumbs, setCrumbs] = createSignal<readonly GraphBreadcrumb[]>([])
  const controller = new GraphController({ selection: selection() })
  const sameIDs = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((id, index) => id === b[index])
  controller.onChange((snapshot) => {
    setSelection((current) => (sameIDs(current, snapshot.selection) ? current : [...snapshot.selection]))
    setCrumbs(snapshot.trail.map((entry) => ({ id: entry.id, label: entry.label ?? entry.id })))
  })
  onCleanup(() => controller.dispose())
  const [capabilities, setCapabilities] = createSignal<RendererCapabilities>()
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
  const selectedTurn = () => turnOf(selection()[0])
  // T6.6: a long session is drawn as its recent tail. The window is declared — the view says how
  // much of the session it shows — and it keeps the turn the reader is looking at.
  const scale = createMemo(() =>
    scaleWindow(props.model, [selectedTurn(), turnOf(props.frame)].filter((id): id is string => !!id)),
  )
  const scoped = createMemo(() => scopeToTurns(props.model, scale().turns))
  // T6.6: the first turn of the drawn window. The lane gutter and the camera frame follow it, so a
  // capped map is a readable window instead of an empty stretch of the session.
  const windowAnchor = createMemo(() => {
    if (scale().hidden === 0) return undefined

    return [...scale().turns][0]
  })

  // U3.8/RF.8: below 768px the inspector becomes a bottom sheet instead of squeezing the canvas.
  // RF.7: below 640px the toolbar collapses its secondary controls into an overflow menu.
  // Only thresholds are tracked, so a resize does not re-render (and re-observe) on every pixel.
  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      const nextNarrow = width > 0 && width < 768
      const nextCompact = width > 0 && width < 640
      setNarrow((current) => (current === nextNarrow ? current : nextNarrow))
      setCompact((current) => (current === nextCompact ? current : nextCompact))
    })
    observer.observe(rootEl)
    onCleanup(() => observer.disconnect())
  })

  // The canvas region's size, for the same reason: the card tier is measured in screen pixels, and
  // the popover is placed inside the region it floats over.
  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setCanvasSize((current) =>
        current.width === width && current.height === height ? current : { width, height },
      )
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
  const [tier, setTier] = createSignal<DetailTier>("mid")
  createEffect(() => {
    const width = cardScreenWidth()
    setTier((current) => detailTier(width, current))
  })
  // In the card mode the selected node's own card carries the detail; in the other modes the card
  // keeps to the reader's distance and the detail lives somewhere else.
  const expandedNode = createMemo(() => (detailMode() === "card" ? selection()[0] : undefined))
  const renderCard = createMemo(
    () => props.renderCard ?? createCardTemplate(theme(), { tier: tier(), expanded: expandedNode() }),
  )
  const renderBand = createMemo(() => createBandTemplate(theme()))
  // T7: the tree re-centres a parent when a child is appended and the force simulation relaxes its
  // boxes, so both need the positions the last layout gave them. The view keeps them per view, so
  // a streamed session never moves a node the reader is looking at.
  const layoutHistory = new Map<string, ReadonlyMap<string, Position>>()
  const sessionKey = () =>
    props.model.nodes.find((node) => node.id === props.model.root)?.data?.sessionID ?? "session"
  const layout = createMemo((): GraphLayout => {
    if (props.positions)
      return {
        positions: props.positions,
        clusters: new Map(),
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
        strategy: strategy(),
      }

    if (representation() === "ribbon") return ribbonLayout(scoped())
    if (representation() === "matrix") return matrixLayout(scoped())

    const key = `${sessionKey()}:${strategy()}:${level()}`
    const next = layoutGraph(props.model, {
      strategy: strategy(),
      level: level(),
      previous: layoutHistory.get(key),
    })

    layoutHistory.set(key, next.positions)

    return next
  })
  // LE.1: whether a structural change is waiting for the canvas to apply the matching model before we
  // frame it. Streaming model updates leave it false, so they never refit.
  const [needsFit, setNeedsFit] = createSignal(true)
  // LE.7: the ribbon and matrix are overview-first summaries; the graph is the only representation the
  // semantic level control drives.
  const effectiveLevel = createMemo<ZoomLevel>(() => representationLevel(representation()) ?? level())
  // T6.8: the view says what it changed, so a screen-reader user knows the map moved.
  const viewAnnouncement = createMemo(() =>
    i18n.t("ui.sessionGraph.a11y.view", {
      level: i18n.t(LEVEL_KEY[effectiveLevel()]),
      representation: i18n.t(REPRESENTATION_KEY[representation()]),
      depth: i18n.t(DEPTH_KEY[depth()]),
    }),
  )
  const axisLabels = createMemo(() => {
    const rep = representation()
    if (rep !== "ribbon" && rep !== "matrix") return undefined

    const rows = turnRows(scoped())
    const labels: { id: string; label: string; x: number; y: number; role: "row" | "column" }[] = []

    // Row labels (turns/session)
    rows.forEach((nodes, rowIndex) => {
      const turnNode = nodes.find((n) => n.kind === "turn" || n.kind === "session")
      const label = turnNode
        ? turnNode.kind === "session"
          ? i18n.t("ui.sessionGraph.axis.session")
          : i18n.t("ui.sessionGraph.axis.turn", { num: props.model.turns.indexOf(turnNode.id) + 1 })
        : ""
      if (label) {
        // Position at left of row
        const y = rowIndex * (COMPACT_SIZE[1] + 20)
        labels.push({ id: `row:${rowIndex}`, label, x: -100, y, role: "row" })
      }
    })

    // Column labels (phase categories)
    const categories = ["explore", "edit", "verify", "delegate", "result"]
    if (rep === "ribbon") {
      // Ribbon: phases laid out horizontally per row
      let cursor = 0
      const gap = 24
      for (const cat of categories) {
        const catLabel = i18n.t(`ui.sessionGraph.phase.${cat}`)
        labels.push({ id: `col:${cat}`, label: catLabel, x: cursor, y: -30, role: "column" })
        cursor += COMPACT_SIZE[0] + gap
      }
    } else {
      // Matrix: columns have fixed positions
      const columnWidth = new Map<number, number>()
      const gap = 24
      rows.forEach((nodes, row) => {
        for (const node of nodes) {
          const col = matrixColumn(node)
          const width = nodeSize(node)[0]
          columnWidth.set(col, Math.max(columnWidth.get(col) ?? COMPACT_SIZE[0], width))
        }
      })
      let x = 0
      columnWidth.forEach((width, col) => {
        let catLabel: string
        if (col === 0) {
          catLabel = i18n.t("ui.sessionGraph.axis.turn")
        } else if (col <= categories.length) {
          catLabel = i18n.t(`ui.sessionGraph.phase.${categories[col - 1]}`)
        } else {
          catLabel = i18n.t("ui.sessionGraph.axis.signals")
        }
        labels.push({ id: `col:${col}`, label: catLabel, x: x + width / 2, y: -30, role: "column" })
        x += width + gap
      })
    }

    return labels
  })

  const renderModel = createMemo(() =>
    buildRenderModel(scoped(), {
      level: effectiveLevel(),
      positions: layout().positions,
      bands: representation() === "graph" && strategy() !== "hierarchy",
      edges: representation() === "graph",
      bundle: representation() === "graph" && files(),
      focus: representation() === "graph" && level() === "execution" ? selection()[0] : undefined,
      laneLabels:
        representation() === "graph" && strategy() === "lanes"
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
  )

  // T3.4: Export the current render model as SVG, JSON, or standalone HTML.
  const handleExport = (format: "svg" | "json" | "html", model: RenderModel) => {
    const theme = props.theme ?? resolvedTheme()
    const timestamp = new Date().toISOString()
    const sessionTitle = props.sessionTitle ?? "OpenCode Session"
    const testedCommit = props.testedCommit ?? "unknown"

    if (format === "svg") {
      const svgOptions: SvgOptions = {
        theme,
        padding: 24,
      }
      const svg = renderToSVG(model, svgOptions)
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `session-map-${timestamp}.svg`)
      return
    }

    if (format === "json") {
      const json = serializeRenderModel(model)
      downloadBlob(new Blob([json], { type: "application/json" }), `session-map-${timestamp}.json`)
      return
    }

    if (format === "html") {
      const svgOptions: SvgOptions = {
        theme,
        padding: 24,
      }
      const svg = renderToSVG(model, svgOptions)
      const json = serializeRenderModel(model)

      // Build a standalone HTML file with inlined CSS/SVG
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(sessionTitle)} - Session Map</title>
  <style>
    body { margin: 0; font-family: ${escapeHtml(theme.fontFamily)}; background: ${escapeHtml(theme.background)}; color: ${escapeHtml(theme.text)}; }
    .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .meta { font-size: 13px; color: ${escapeHtml(theme.textMuted)}; margin-bottom: 24px; }
    .meta code { background: ${escapeHtml(theme.surfaceMuted)}; padding: 2px 6px; border-radius: 4px; }
    .graph-container { border: 1px solid ${escapeHtml(theme.border)}; border-radius: 8px; overflow: hidden; background: ${escapeHtml(theme.background)}; }
    .graph-container svg { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(sessionTitle)}</h1>
    <div class="meta">
      Exported: ${new Date(timestamp).toLocaleString()} | Commit: <code>${escapeHtml(testedCommit)}</code>
    </div>
    <div class="graph-container">
      ${svg}
    </div>
    <details style="margin-top: 24px;">
      <summary style="cursor: pointer; color: ${escapeHtml(theme.textMuted)};">Raw JSON data</summary>
      <pre style="background: ${escapeHtml(theme.surface)}; padding: 16px; border-radius: 8px; overflow: auto; font-size: 12px; max-height: 300px;">${escapeHtml(json)}</pre>
    </details>
  </div>
</body>
</html>`
      downloadBlob(new Blob([html], { type: "text/html" }), `session-map-${timestamp}.html`)
      return
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

        function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;")
      .replace(/"/g, "&" + "quot;")
      .replace(/'/g, "&#039;")
  }

  const selectedNode = () => {
    const id = selection()[0]
    return id ? nodeByID(props.model, id) : undefined
  }
  // T1.9: the inspector can describe a node the current level does not draw. Say so and offer the
  // level change, rather than leaving the user with an invisible selection.
  const hiddenSelection = () => {
    const node = selectedNode()
    return node && !isVisibleAt(node, effectiveLevel()) ? node : undefined
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
    const ids = renderModel().nodes.filter((node) => node.kind !== "band").map((node) => node.id)

    return scale().hidden > 0 ? ids.filter((id) => id !== props.model.root) : ids
  }
  // T1.18: the fit keeps a legible minimum scale; the renderer zooms in rather than shrink the
  // content past it, and the reader pans the rest.
  // T6.10: the minimap is drawn *over* the canvas, so the frame keeps the content clear of it.
  const fitOptions = () => ({
    minScale: MIN_CARD_HEIGHT_PX / CARD_SIZE[1],
    insets: minimap()
      ? {
          right: MINIMAP_SIZE.width + MINIMAP_GAP,
          bottom: MINIMAP_SIZE.height + MINIMAP_GAP,
        }
      : undefined,
  })
  // The panel takes layout width and reframes the camera when it opens; the popover and the card do
  // neither, so the map does not move under the reader when a node is selected.
  const inspectorOpen = createMemo(() => detailMode() === "panel" && !!selectedNode())
  // The screen anchor of a node, read from the renderer: it owns the camera, so it owns the
  // projection too. The anchor follows the node as the reader pans, and it does not move by less
  // than a pixel, so a pan does not re-render what the anchor carries.
  const createAnchor = (node: () => GraphNode | undefined) => {
    const [anchor, setAnchor] = createSignal<{ x: number; y: number }>()
    createEffect(() => {
      const current = node()
      viewport()
      const position = current ? renderer?.getNodeScreenPosition?.(current.id) : undefined
      setAnchor((previous) =>
        previous && position && Math.abs(previous.x - position.x) < 1 && Math.abs(previous.y - position.y) < 1
          ? previous
          : position,
      )
    })
    return anchor
  }
  // The node the popover describes, and where it hangs.
  const popoverNode = createMemo(() => (detailMode() === "popover" ? selectedNode() : undefined))
  const popoverAnchor = createAnchor(() => popoverNode())
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
    if (!id || id === selection()[0]) return undefined
    return nodeByID(props.model, id)
  })
  const [peekAnchor, setPeekAnchor] = createSignal<{ x: number; y: number }>()
  createEffect(() => {
    const node = peekNode()
    viewport()
    if (!node) {
      setPeekAnchor(undefined)
      return
    }
    const position = renderer?.getNodeScreenPosition?.(node.id)
    setPeekAnchor((current) =>
      current && position && Math.abs(current.x - position.x) < 1 && Math.abs(current.y - position.y) < 1
        ? current
        : position,
    )
  })
  // Above the node's own box, so the peek never covers what it is about.
  const peekPlacement = createMemo(() => {
    const anchor = peekAnchor()
    if (!anchor) return undefined
    const half = (CARD_SIZE[1] / CARD_SIZE[0]) * cardScreenWidth() / 2

    return { left: anchor.x, top: anchor.y - half - 34 }
  })
  const peekFrame = createMemo(() => {
    const node = peekNode()
    const placement = peekPlacement()
    if (!node || !placement) return undefined

    return { node, left: placement.left, top: placement.top }
  })

  // Breadcrumbs are the `part-of` ancestry, seeded into the controller's trail so one library
  // primitive backs both selection and the path (U3.11/P8.1).
  const seedTrail = (id: string | undefined) => {
    controller.trail.reset()

    if (id)
      for (const node of breadcrumbs(props.model, id)) controller.trail.push({ id: node.id, label: node.label, kind: node.kind })
  }
  const select = (target: string | readonly string[] | undefined, counted = true) => {
    const id = typeof target === "string" ? target : target?.[0]
    controller.select(target ?? null)
    seedTrail(id)
    // A new selection opens a fresh detail surface; a dismissed popover does not outlive it.
    setPopoverDismissed(false)
    props.onSelect?.(id)
    // T2.3: a permalink frames a node without a participant acting, so it is not an interaction.
    if (counted && id) Metrics.count("select")
  }
  const changeDetailMode = (next: DetailMode) => {
    setDetailMode(next)
    setPopoverDismissed(false)
    props.onDetailModeChange?.(next)
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
  const changeStrategy = (next: LayoutStrategy) => {
    setStrategy(next)
    props.onStrategyChange?.(next)
  }
  const changeRepresentation = (next: Representation) => {
    setRepresentation(next)
    props.onRepresentationChange?.(next)
  }
  // LE.8/LE.9: a segment/cell expands into the node-link graph with that node selected and framed.
  const expandToGraph = (id: string) => {
    const node = nodeByID(props.model, id)

    if (!node) return
    Metrics.count("expand")
    if (representation() !== "graph") changeRepresentation("graph")
    jumpTo(node)
  }
  const toggleMinimap = () => {
    setMinimap((open) => {
      props.onMinimapChange?.(!open)
      return !open
    })
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
    select(undefined)
  }
  // LE.12: the changed-files rail reads the model through the pure selector, so it tracks streaming.
  const changedFilesList = createMemo(() => changedFiles(props.model))
  // T6.18: the reader may have asked for less motion, so the camera jumps instead of gliding. The
  // host knows the node's world position from the layout, and the contract's setViewport is instant.
  const focusNode = (id: string) => {
    const instance = renderer
    if (!instance) return
    const position = layout().positions.get(id)
    const current = viewport()
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches || !position || !current) {
      instance.focus(id)
      return
    }
    instance.setViewport({ zoom: current.zoom, center: [position.x, position.y, position.z] })
  }
  const jumpTo = (node: GraphNode) => {
    const minimum = minLevelOf(node)
    if (LEVEL_RANK[minimum] > LEVEL_RANK[level()]) setLevel(minimum)
    select(node.id)
    focusNode(node.id)
  }
  // U3.11: clicking a breadcrumb selects it and frames its subtree, so the canvas follows the trail.
  const fitSubtree = (id: string) => {
    select(id)
    renderer?.fit(subtree(props.model, id).map((node) => node.id), fitOptions())
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
    select(id, false)
    focusNode(id)
    setFramed(id)
  }
  // A permalink that changes while the graph is open frames its node too, not only on load.
  createEffect(() => {
    const id = props.frame
    const node = id ? nodeByID(props.model, id) : undefined
    if (!node) return
    focusFrame(renderer)
  })

  // T2.3: returning to the transcript is an interaction.
  const openInTranscript = (id: string) => {
    Metrics.count("return")
    props.onOpenTranscript?.(id)
  }

  // T2.3: the search is an interaction, so it is counted once per opening.
  const openSearch = () => {
    if (searchOpen()) return
    Metrics.count("search")
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

    if (event.key === "/") {
      event.preventDefault()
      openSearch()

      return
    }

    if (event.key === "f") {
      Metrics.count("fit")
      renderer?.fit()
    }

    const level = { "1": "overview", "2": "execution", "3": "detail" }[event.key] as ZoomLevel | undefined

    if (level) setLevel(level)
  }

  createEffect(() => {
    if (props.level !== undefined) setLevel(props.level)
  })
  createEffect(() => {
    if (props.projection !== undefined) setProjection(props.projection)
  })
  createEffect(() => {
    if (props.depth !== undefined) setDepth(props.depth)
  })
  createEffect(() => {
    if (props.strategy !== undefined) setStrategy(props.strategy)
  })
  createEffect(() => {
    if (props.representation !== undefined) setRepresentation(props.representation)
  })
  createEffect(() => {
    if (props.minimap !== undefined) setMinimap(props.minimap)
  })
  createEffect(() => {
    if (props.files !== undefined) setFiles(props.files)
  })
  createEffect(() => {
    if (props.detailMode !== undefined) setDetailMode(props.detailMode)
  })
  createEffect(() => {
    if (props.peek !== undefined) setPeek(props.peek)
  })
  // Keep the controller's model in step with the host model; it reconciles selection + trail by id, so
  // streaming appends never clear either.
  createEffect(() => controller.setModel(props.model))
  // Controlled selection: mirror the host value into the controller (and seed the path on mount).
  createEffect(() => {
    const next = props.selection

    if (next === undefined) return
    if (controller.selection[0] !== next) controller.select(next)
    seedTrail(next)
  })
  // A capability gap is never silent: when the active renderer cannot do 3D, fall back to 2D rather
  // than leaving the model in a projection the renderer ignores.
  createEffect(() => {
    const current = capabilities()
    if (!current) return
    if (projection() === "3d" && !supports(current, "3d")) changeProjection("2d")
    if (!supportsDepth(current, depth())) setDepth("flat")
  })
  // LE.1: frame the drawn content (never the non-interactive bands) on first load, a renderer/level/
  // projection/strategy/representation change, and when the inspector toggles. The fit is deferred to
  // the canvas's `onModelApplied` (below), so the matching nodes and positions exist before we measure;
  // the ids are read untracked, so streaming updates never refit.
  // T6.10: the minimap toggles too — it is drawn over the canvas, so the frame moves with it.
  createEffect(() => {
    level()
    projection()
    depth()
    strategy()
    representation()
    inspectorOpen()
    files()
    minimap()
    setNeedsFit(true)
  })
  // T1.8: the fitted frame is the 100% reference for the camera zoom readout. The renderer clamps
  // orthographic zoom to ~1/3..2.5x fit, so the control cannot empty the canvas.
  const [fitBaseline, setFitBaseline] = createSignal(1)
  let fitPending = false
  let fitSettle: ReturnType<typeof setTimeout> | undefined
  // A fit emits viewports as the camera animates; keep reading the baseline until the reports stop
  // so the settled frame becomes the 100% reference. When settling, capture the final viewport zoom.
  const settleFit = () => {
    if (fitSettle) clearTimeout(fitSettle)
    fitSettle = setTimeout(() => {
      fitSettle = undefined
      fitPending = false
      // Capture the settled viewport zoom as the fit baseline (100% reference)
      const current = untrack(viewport)
      if (current) setFitBaseline(current.zoom)
    }, 120)
  }
  onCleanup(() => fitSettle && clearTimeout(fitSettle))
  const requestFit = (fit: () => void) => {
    fitPending = true
    settleFit()
    fit()
  }
  // A zoom is the reader's own act: it ends the fit window, so the 100% reference stops following
  // the camera and the readout keeps telling the truth.
  const endFitWindow = () => {
    if (!fitPending) return
    fitPending = false
    if (fitSettle) clearTimeout(fitSettle)
    fitSettle = undefined
  }
  const fitContent = () => {
    Metrics.count("fit")
    requestFit(() => renderer?.fit(untrack(contentIDs), fitOptions()))
  }
  const applyModel = (instance: GraphRenderer) => {
    // T3.5: a level change rebuilds the model, so the frame waits for the one that carries the node.
    if (raiseLevelForFrame()) return
    if (needsFit()) {
      setNeedsFit(false)
      requestFit(() => instance.fit(untrack(contentIDs), fitOptions()))
    }
    focusFrame(instance)
  }
  const zoomPercent = () => {
    const current = viewport()
    if (!current) return 100
    return Math.max(33, Math.round((current.zoom / fitBaseline()) * 100))
  }
  // T1.8: zoom range is ~1/3..2.5x fit (ORTHO_ZOOM_SPAN in CameraControls). Use fitBaseline to compute bounds.
  // T6.20: the renderer's own range bounds it too — the SpaceGraph's zoom is normalized over the
  // fitted band and stops at 1, so a control that offered more would ask for a zoom the renderer
  // cannot deliver, and the reader would click a button that does nothing.
  const zoomLimits = () => {
    const range = capabilities()?.zoomRange
    return {
      min: Math.max(fitBaseline() / 3, range?.min ?? 0),
      max: Math.min(fitBaseline() * 2.5, range?.max ?? Number.POSITIVE_INFINITY),
    }
  }
  const zoomBy = (direction: 1 | -1) => {
    const current = viewport()
    if (!current || !renderer) return
    Metrics.count("zoom")
    endFitWindow()
    // The step is a tenth of the fit, so one click is the same step at any fit and the readout lands
    // on whole tens (T6.19: the capture frames are named after the percentage they show).
    const step = fitBaseline() * 0.1
    const limits = zoomLimits()
    renderer.setViewport({
      zoom: Math.min(limits.max, Math.max(limits.min, current.zoom + direction * step)),
      center: current.center,
    })
  }

  return (
    <div
      ref={rootEl}
      data-component="session-graph-view"
      data-slot="graph-view"
      class="flex h-full w-full flex-col overflow-hidden"
    >
      <GraphToolbar
        level={level()}
        onLevel={setLevel}
        depth={depth()}
        onDepth={changeDepth}
        depthModes={DEPTH_MODES}
        capabilities={capabilities()}
        renderer={rendererID()}
        onFit={fitContent}
        zoomPercent={zoomPercent()}
        onZoomOut={() => zoomBy(-1)}
        onZoomIn={() => zoomBy(1)}
        zoomOutDisabled={effectiveLevel() === "overview" || (viewport()?.zoom ?? 0) <= zoomLimits().min}
        zoomInDisabled={(viewport()?.zoom ?? 0) >= zoomLimits().max}
        onSearch={toggleSearch}
        legend={legendOpen()}
        onToggleLegend={() => setLegendOpen((open) => !open)}
        gallery={galleryOpen()}
        onToggleGallery={() => setGalleryOpen((open) => !open)}
        billboard={cardFacing() === "camera"}
        onToggleBillboard={toggleBillboard}
        strategy={strategy()}
        onStrategy={changeStrategy}
        representation={representation()}
        onRepresentation={changeRepresentation}
        minimap={minimap()}
        onToggleMinimap={toggleMinimap}
        files={files()}
        onToggleFiles={toggleFiles}
        detailMode={detailMode()}
        onDetailModeChange={changeDetailMode}
        peek={peek()}
        onTogglePeek={togglePeek}
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
          representation() !== "graph" && selection().length > 0 ? () => expandToGraph(selection()[0]!) : undefined
        }
        onExport={handleExport}
        renderModel={renderModel()}
        onBack={props.onBack}
        searching={searchOpen()}
        compact={compact()}
        endInset={props.endInset}
      />
      <GraphBreadcrumbs crumbs={crumbs()} onSelect={fitSubtree} />
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
        <Show when={files() && representation() === "graph" && !narrow()}>
          <GraphFileRail files={changedFilesList()} selection={selection()} onSelect={(id) => select(id)} />
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
            selection={selection()}
            preferredRenderer={props.preferredRenderer}
            overrides={props.rendererOverrides}
            onSelect={(ids) => select(ids)}
            onNodeDoubleClick={expandToGraph}
            onBackgroundClick={() => select(undefined)}
            onHover={(id) => setHovered(id)}
          cardFacing={cardFacing()}
            onModelApplied={applyModel}
            onRenderer={(instance) => {
              renderer = instance
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
              if (fitPending) {
                setFitBaseline(next.zoom || 1)
                settleFit()
              }
              setViewport(next)
            }}
          />
          <GraphA11y
            model={renderModel()}
            selection={selection()}
            instructionsId={a11yInstructionsId}
            announcement={viewAnnouncement()}
            onSelect={select}
            onEscape={() => select(undefined)}
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
          <Show when={detailMode() === "popover"}>
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
                onSelect={select}
                onOpenTranscript={props.onOpenTranscript ? openInTranscript : undefined}
                onOpenSession={props.onOpenSession}
                onClose={() => setPopoverDismissed(true)}
              />
            </div>
          </Show>
          <Show when={minimap() && !error() && props.model.nodes.length > 0}>
            <div class="absolute bottom-2 end-2 z-10">
              <GraphMinimap
                model={props.model}
                positions={layout().positions}
                theme={theme()}
                viewport={viewport()}
                onPan={(center) => {
                  const current = viewport()
                  if (!current) return
                  renderer?.setViewport({ zoom: current.zoom, center: [center[0], center[1], 0] })
                }}
              />
            </div>
          </Show>
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
              onSelect={(node) => {
                jumpTo(node)
                setSearchOpen(false)
              }}
              onClose={() => setSearchOpen(false)}
            />
          </Show>
          <Show when={legendOpen()}>
            <GraphLegend theme={theme()} strategy={strategy()} onClose={() => setLegendOpen(false)} />
          </Show>
          <Show when={galleryOpen()}>
            <GraphGallery
              model={props.model}
              theme={theme()}
              current={strategy()}
              onOpen={changeStrategy}
              onClose={() => setGalleryOpen(false)}
            />
          </Show>
        </div>
        <Show when={detailMode() === "panel"}>
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
              "w-0 overflow-hidden": !inspectorOpen(),
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
              onSelect={select}
              onOpenTranscript={props.onOpenTranscript ? openInTranscript : undefined}
              onOpenSession={props.onOpenSession}
            />
          </div>
        </Show>
      </div>
    </div>
  )
}