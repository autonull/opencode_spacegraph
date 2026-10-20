import type { DepthMode, GraphRenderer, Projection, RendererCapabilities, RendererViewport, RenderTheme, RenderModel } from "@spacegraphjs/renderer"
import { DEPTH_MODES, supports, supportsDepth } from "@spacegraphjs/renderer"
import type { GraphLayout, GraphModel, GraphNode, Lane, LayoutStrategy, Position, Representation, ZoomLevel } from "@opencode/session-ui/graph"
import {
  ancestors,
  breadcrumbs,
  changedFiles,
  COMPACT_SIZE,
  laneAnchors,
  layoutGraph,
  LEVEL_RANK,
  isVisibleAt,
  matrixColumn,
  matrixLayout,
  minLevelOf,
  nodeByID,
  nodeSize,
  representationLevel,
  ribbonLayout,
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
import type { GraphDiffSource } from "./GraphDiff"
import { GraphFileRail } from "./GraphFileRail"
import { GraphInspector } from "./GraphInspector"
import { GraphMinimap } from "./GraphMinimap"
import { GraphSearch } from "./GraphSearch"
import { GraphToolbar } from "./GraphToolbar"
import { createGraphTheme } from "./theme"
import { renderToSVG, serializeRenderModel, type SvgOptions } from "@spacegraphjs/svg-renderer"

/** LE.10 lane gutter copy, in layout order. */
const LANE_KEY = {
  phases: "ui.sessionGraph.lane.phases",
  prompt: "ui.sessionGraph.lane.prompt",
  narrative: "ui.sessionGraph.lane.narrative",
  explore: "ui.sessionGraph.lane.explore",
  edit: "ui.sessionGraph.lane.edit",
  verify: "ui.sessionGraph.lane.verify",
  delegate: "ui.sessionGraph.lane.delegate",
  artifacts: "ui.sessionGraph.lane.artifacts",
} as const satisfies Record<Lane, string>

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
  /** LE.12: the file-first lens (changed-files rail + bundled provenance edges); the host persists it. */
  files?: boolean
  /** RF.8: host loader for a finished turn's changed-file diffs, shown on demand in the inspector. */
  diffSource?: GraphDiffSource
  /** Optional host renderer for a node's summary (for example MarkDown); falls back to plain text. */
  renderSummary?: (node: GraphNode) => JSX.Element | undefined
  renderCard?: CardTemplate
  /** Reserved inline-end length for host chrome that floats over the panel's top-right corner. */
  endInset?: string
  onSelect?: (id: string | undefined) => void
  onProjectionChange?: (projection: Projection) => void
  onDepthChange?: (depth: DepthMode) => void
  onStrategyChange?: (strategy: LayoutStrategy) => void
  onRepresentationChange?: (representation: Representation) => void
  onMinimapChange?: (minimap: boolean) => void
  onFilesChange?: (files: boolean) => void
  onOpenTranscript?: (id: string) => void
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
  const [strategy, setStrategy] = createSignal<LayoutStrategy>(props.strategy ?? "lanes")
  const [representation, setRepresentation] = createSignal<Representation>(props.representation ?? "graph")
  const [minimap, setMinimap] = createSignal<boolean>(props.minimap ?? false)
  const [files, setFiles] = createSignal<boolean>(props.files ?? false)
  const [searchOpen, setSearchOpen] = createSignal(false)
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
  let renderer: GraphRenderer | undefined
  let rootEl!: HTMLDivElement

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
  const renderCard = createMemo(() => props.renderCard ?? createCardTemplate(theme()))
  const renderBand = createMemo(() => createBandTemplate(theme()))
  const layout = createMemo((): GraphLayout => {
    if (props.positions)
      return {
        positions: props.positions,
        clusters: new Map(),
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
        strategy: strategy(),
      }

    if (representation() === "ribbon") return ribbonLayout(props.model)
    if (representation() === "matrix") return matrixLayout(props.model)

    return layoutGraph(props.model, { strategy: strategy(), level: level() })
  })
  // LE.1: whether a structural change is waiting for the canvas to apply the matching model before we
  // frame it. Streaming model updates leave it false, so they never refit.
  const [needsFit, setNeedsFit] = createSignal(true)
  // LE.7: the ribbon and matrix are overview-first summaries; the graph is the only representation the
  // semantic level control drives.
  const effectiveLevel = createMemo<ZoomLevel>(() => representationLevel(representation()) ?? level())
  const axisLabels = createMemo(() => {
    const rep = representation()
    if (rep !== "ribbon" && rep !== "matrix") return undefined

    const rows = turnRows(props.model)
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
    buildRenderModel(props.model, {
      level: effectiveLevel(),
      positions: layout().positions,
      bands: representation() === "graph" && strategy() !== "hierarchy",
      edges: representation() === "graph",
      bundle: representation() === "graph" && files(),
      focus: representation() === "graph" && level() === "execution" ? selection()[0] : undefined,
      laneLabels:
        representation() === "graph" && strategy() === "lanes"
          ? laneAnchors().map((lane) => ({ id: lane.name, label: i18n.t(LANE_KEY[lane.name]), y: lane.y }))
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
  // LE.1: fit the drawn content, not the non-interactive bands, and re-frame when the inspector
  // toggles (the canvas narrows when the side panel opens). Streaming updates deliberately do not
  // refit, so the ids are read untracked inside the fit effect rather than as a dependency.
  const contentIDs = () => renderModel().nodes.filter((node) => node.kind !== "band").map((node) => node.id)
  const inspectorOpen = createMemo(() => !!selectedNode())
  const selectedTurn = () => {
    const id = selection()[0]

    if (!id) return undefined
    const node = nodeByID(props.model, id)

    if (node?.kind === "turn") return node.id

    return ancestors(props.model, id).find((ancestor) => ancestor.kind === "turn")?.id
  }

  // Breadcrumbs are the `part-of` ancestry, seeded into the controller's trail so one library
  // primitive backs both selection and the path (U3.11/P8.1).
  const seedTrail = (id: string | undefined) => {
    controller.trail.reset()

    if (id)
      for (const node of breadcrumbs(props.model, id)) controller.trail.push({ id: node.id, label: node.label, kind: node.kind })
  }
  const select = (target: string | readonly string[] | undefined) => {
    const id = typeof target === "string" ? target : target?.[0]
    controller.select(target ?? null)
    seedTrail(id)
    props.onSelect?.(id)
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
  // LE.12: the changed-files rail reads the model through the pure selector, so it tracks streaming.
  const changedFilesList = createMemo(() => changedFiles(props.model))
  const jumpTo = (node: GraphNode) => {
    const minimum = minLevelOf(node)
    if (LEVEL_RANK[minimum] > LEVEL_RANK[level()]) setLevel(minimum)
    select(node.id)
    renderer?.focus(node.id)
  }
  // U3.11: clicking a breadcrumb selects it and frames its subtree, so the canvas follows the trail.
  const fitSubtree = (id: string) => {
    select(id)
    renderer?.fit(subtree(props.model, id).map((node) => node.id))
  }

  // RF.10: a small keyboard map on the canvas region (`/` search, `f` fit, `1/2/3` levels). Keys that
  // originate inside the a11y list or a form control are left to their owner.
  const onRegionKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null

    if (target?.closest("[data-slot='graph-a11y'], input, textarea, [contenteditable]")) return

    if (event.key === "/") {
      event.preventDefault()
      setSearchOpen(true)

      return
    }

    if (event.key === "f") renderer?.fit()

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
  createEffect(() => {
    level()
    projection()
    depth()
    strategy()
    representation()
    inspectorOpen()
    files()
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
  const fitContent = () => requestFit(() => renderer?.fit(untrack(contentIDs)))
  const applyModel = (instance: GraphRenderer) => {
    if (!needsFit()) return
    setNeedsFit(false)
    requestFit(() => instance.fit(untrack(contentIDs)))
  }
  const zoomPercent = () => {
    const current = viewport()
    if (!current) return 100
    return Math.max(33, Math.round((current.zoom / fitBaseline()) * 100))
  }
  // T1.8: zoom range is ~1/3..2.5x fit (ORTHO_ZOOM_SPAN in CameraControls). Use fitBaseline to compute bounds.
  const minZoom = () => fitBaseline() / 3
  const maxZoom = () => fitBaseline() * 2.5
  const zoomBy = (direction: 1 | -1) => {
    const current = viewport()
    if (!current || !renderer) return
    renderer.setViewport({
      zoom: Math.min(maxZoom(), Math.max(minZoom(), current.zoom + direction * 0.08)),
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
        zoomOutDisabled={effectiveLevel() === "overview" || (viewport()?.zoom ?? 0) <= minZoom()}
        zoomInDisabled={(viewport()?.zoom ?? 0) >= maxZoom()}
        onSearch={() => setSearchOpen((open) => !open)}
        strategy={strategy()}
        onStrategy={changeStrategy}
        representation={representation()}
        onRepresentation={changeRepresentation}
        minimap={minimap()}
        onToggleMinimap={toggleMinimap}
        files={files()}
        onToggleFiles={toggleFiles}
        onTurnMap={
          props.onTurnMap
            ? () => {
                const turnID = selectedTurn()
                if (turnID) props.onTurnMap?.(turnID)
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
            onModelApplied={applyModel}
            onRenderer={(instance) => {
              renderer = instance
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
            onSelect={select}
            onEscape={() => select(undefined)}
          />
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
        </div>
        <Show when={selectedNode() && !narrow()}>
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
            "w-0 overflow-hidden": !selectedNode(),
            // LE.4: at narrow widths the inspector is a real bottom sheet (a flex sibling below the
            // canvas), not an overlay, so the canvas is sized to the area above it and fit never
            // frames content under it.
            "h-1/2 w-full border-t border-border-weaker-base": !!(selectedNode() && narrow()),
            "border-s border-border-weaker-base": !!(selectedNode() && !narrow()),
          }}
          style={selectedNode() && !narrow() ? { width: `${inspectorWidth()}px`, "max-width": "60%" } : undefined}
          data-slot="graph-inspector-gutter"
          data-collapsed={!selectedNode()}
          data-layout={narrow() ? "sheet" : "side"}
        >
          <GraphInspector
            model={props.model}
            node={selectedNode()}
            diffSource={props.diffSource}
            renderSummary={props.renderSummary}
            onSelect={select}
            onOpenTranscript={props.onOpenTranscript}
          />
        </div>
      </div>
    </div>
  )
}