import type { GraphRenderer, Projection, RendererCapabilities, RendererViewport, RenderTheme } from "@spacegraphjs/renderer"
import { supports } from "@spacegraphjs/renderer"
import type { GraphLayout, GraphModel, GraphNode, LayoutStrategy, Position, Representation, ZoomLevel } from "@opencode/session-ui/graph"
import {
  ancestors,
  breadcrumbs,
  layoutGraph,
  LEVEL_RANK,
  matrixLayout,
  minLevelOf,
  nodeByID,
  representationLevel,
  ribbonLayout,
  subtree,
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
import { GraphInspector } from "./GraphInspector"
import { GraphMinimap } from "./GraphMinimap"
import { GraphSearch } from "./GraphSearch"
import { GraphToolbar } from "./GraphToolbar"
import { createGraphTheme } from "./theme"

export type GraphViewProps = {
  model: GraphModel
  /** Defaults to the live host theme read from CSS tokens (U3.7). */
  theme?: RenderTheme
  level?: ZoomLevel
  projection?: Projection
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
  /** RF.8: host loader for a finished turn's changed-file diffs, shown on demand in the inspector. */
  diffSource?: GraphDiffSource
  /** Optional host renderer for a node's summary (for example Markdown); falls back to plain text. */
  renderSummary?: (node: GraphNode) => JSX.Element | undefined
  renderCard?: CardTemplate
  /** Reserved inline-end length for host chrome that floats over the panel's top-right corner. */
  endInset?: string
  onSelect?: (id: string | undefined) => void
  onProjectionChange?: (projection: Projection) => void
  onStrategyChange?: (strategy: LayoutStrategy) => void
  onRepresentationChange?: (representation: Representation) => void
  onMinimapChange?: (minimap: boolean) => void
  onOpenTranscript?: (id: string) => void
  /** Opens the hybrid turn map (H6.2) for a turn; the toolbar offers it when a turn is selected. */
  onTurnMap?: (turnID: string) => void
  onBack?: () => void
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
  const [strategy, setStrategy] = createSignal<LayoutStrategy>(props.strategy ?? "lanes")
  const [representation, setRepresentation] = createSignal<Representation>(props.representation ?? "graph")
  const [minimap, setMinimap] = createSignal<boolean>(props.minimap ?? false)
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
  const [canvasReady, setCanvasReady] = createSignal(false)
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

    return layoutGraph(props.model, { strategy: strategy() })
  })
  // LE.7: the ribbon and matrix are overview-first summaries; the graph is the only representation the
  // semantic level control drives.
  const effectiveLevel = createMemo<ZoomLevel>(() => representationLevel(representation()) ?? level())
  const renderModel = createMemo(() =>
    buildRenderModel(props.model, {
      level: effectiveLevel(),
      positions: layout().positions,
      bands: representation() === "graph",
      edges: representation() === "graph",
      focus: representation() === "graph" && level() === "execution" ? selection()[0] : undefined,
      renderCard: renderCard(),
      renderBand: renderBand(),
    }),
  )
  const selectedNode = () => {
    const id = selection()[0]
    return id ? nodeByID(props.model, id) : undefined
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
    props.onProjectionChange?.(next)
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
    if (props.strategy !== undefined) setStrategy(props.strategy)
  })
  createEffect(() => {
    if (props.representation !== undefined) setRepresentation(props.representation)
  })
  createEffect(() => {
    if (props.minimap !== undefined) setMinimap(props.minimap)
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
    if (current && projection() === "3d" && !supports(current, "3d")) changeProjection("2d")
  })
  // §5.5: frame the model on first load, renderer switch, an explicit level/projection/strategy
  // change, and when the inspector toggles (LE.1). Deferred a microtask so the canvas has applied the
  // matching model before we measure its bounds; the ids are read untracked so streaming does not refit.
  createEffect(() => {
    const ready = canvasReady()
    level()
    projection()
    strategy()
    representation()
    inspectorOpen()
    if (ready) queueMicrotask(() => renderer?.fit(untrack(contentIDs)))
  })

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
        projection={projection()}
        onProjection={changeProjection}
        capabilities={capabilities()}
        renderer={rendererID()}
        onFit={() => renderer?.fit()}
        onSearch={() => setSearchOpen((open) => !open)}
        strategy={strategy()}
        onStrategy={changeStrategy}
        representation={representation()}
        onRepresentation={changeRepresentation}
        minimap={minimap()}
        onToggleMinimap={toggleMinimap}
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
        onBack={props.onBack}
        searching={searchOpen()}
        compact={compact()}
        endInset={props.endInset}
      />
      <GraphBreadcrumbs crumbs={crumbs()} onSelect={fitSubtree} />
      <Show when={fallback() && !error()}>
        <div
          data-slot="graph-fallback"
          class="border-b border-border-weaker-base bg-surface-base px-2 py-1 text-12-regular text-text-weak"
        >
          {i18n.t("ui.sessionGraph.fallback")}
        </div>
      </Show>
      <div class="relative flex min-h-0 flex-1" classList={{ "flex-col": narrow() }}>
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
            selection={selection()}
            preferredRenderer={props.preferredRenderer}
            overrides={props.rendererOverrides}
            onSelect={(ids) => select(ids)}
            onNodeDoubleClick={expandToGraph}
            onBackgroundClick={() => select(undefined)}
            onRenderer={(instance) => {
              renderer = instance
              setCanvasReady(!!instance)
            }}
            onReady={(info) => {
              setError(undefined)
              setCapabilities(info.capabilities)
              setRendererID(info.id)
              setFallback(info.fallback)
            }}
            onError={(cause) => setError(cause instanceof Error ? cause.message : String(cause))}
            onViewportChange={setViewport}
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
