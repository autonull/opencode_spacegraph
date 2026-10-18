import type { GraphRenderer, Projection, RendererCapabilities, RendererViewport, RenderTheme } from "@spacegraphjs/renderer"
import { supports } from "@spacegraphjs/renderer"
import type { GraphLayout, GraphModel, GraphNode, LayoutStrategy, Position, ZoomLevel } from "@opencode/session-ui/graph"
import { layoutGraph, LEVEL_RANK, minLevelOf, nodeByID, ancestors } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { createEffect, createMemo, createSignal, createUniqueId, Show } from "solid-js"
import { buildRenderModel, type CardTemplate } from "../canvas/buildRenderModel"
import { GraphCanvas } from "../canvas/GraphCanvas"
import type { RendererFactory, RendererID } from "../canvas/renderer-registry"
import { GraphA11y } from "./GraphA11y"
import { GraphBreadcrumbs } from "./GraphBreadcrumbs"
import { createBandTemplate, createCardTemplate } from "./cardTemplate"
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
  /** RF.7: controlled minimap visibility; the host persists the choice (default off). */
  minimap?: boolean
  renderCard?: CardTemplate
  /** Reserved inline-end length for host chrome that floats over the panel's top-right corner. */
  endInset?: string
  onSelect?: (id: string | undefined) => void
  onProjectionChange?: (projection: Projection) => void
  onStrategyChange?: (strategy: LayoutStrategy) => void
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
  const [minimap, setMinimap] = createSignal<boolean>(props.minimap ?? false)
  const [internalSelection, setSelection] = createSignal<readonly string[]>(props.selection ? [props.selection] : [])
  const [searchOpen, setSearchOpen] = createSignal(false)
  const [capabilities, setCapabilities] = createSignal<RendererCapabilities>()
  const [rendererID, setRendererID] = createSignal<RendererID>()
  const [fallback, setFallback] = createSignal(false)
  const [error, setError] = createSignal<string>()
  const [canvasReady, setCanvasReady] = createSignal(false)
  const [viewport, setViewport] = createSignal<RendererViewport>()
  let renderer: GraphRenderer | undefined

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

    return layoutGraph(props.model, { strategy: strategy() })
  })
  const selection = (): readonly string[] => (props.selection !== undefined ? [props.selection] : internalSelection())
  const renderModel = createMemo(() =>
    buildRenderModel(props.model, {
      level: level(),
      positions: layout().positions,
      clusters: layout().clusters,
      focus: level() === "execution" ? selection()[0] : undefined,
      renderCard: renderCard(),
      renderBand: renderBand(),
    }),
  )
  const selectedNode = () => {
    const id = selection()[0]
    return id ? nodeByID(props.model, id) : undefined
  }
  const selectedTurn = () => {
    const id = selection()[0]

    if (!id) return undefined
    const node = nodeByID(props.model, id)

    if (node?.kind === "turn") return node.id

    return ancestors(props.model, id).find((ancestor) => ancestor.kind === "turn")?.id
  }

  const select = (id: string | undefined) => {
    setSelection(id ? [id] : [])
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
    if (props.minimap !== undefined) setMinimap(props.minimap)
  })
  // A capability gap is never silent: when the active renderer cannot do 3D, fall back to 2D rather
  // than leaving the model in a projection the renderer ignores.
  createEffect(() => {
    const current = capabilities()
    if (current && projection() === "3d" && !supports(current, "3d")) changeProjection("2d")
  })
  // §5.5: frame the model on first load, renderer switch, and an explicit level/projection change.
  // Deferred a microtask so the canvas has applied the matching model before we measure its bounds.
  createEffect(() => {
    const ready = canvasReady()
    level()
    projection()
    strategy()
    if (ready) queueMicrotask(() => renderer?.fit())
  })

  return (
    <div data-component="session-graph-view" data-slot="graph-view" class="flex h-full w-full flex-col overflow-hidden">
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
        onBack={props.onBack}
        searching={searchOpen()}
        endInset={props.endInset}
      />
      <GraphBreadcrumbs model={props.model} selected={selection()[0]} onSelect={select} />
      <Show when={fallback() && !error()}>
        <div
          data-slot="graph-fallback"
          class="border-b border-border-weaker-base bg-surface-base px-2 py-1 text-12-regular text-text-weak"
        >
          {i18n.t("ui.sessionGraph.fallback")}
        </div>
      </Show>
      <div class="relative flex min-h-0 flex-1">
        <div
          class="relative min-w-0 flex-1"
          data-slot="graph-canvas-region"
          role="group"
          aria-label={i18n.t("ui.sessionGraph.canvas.label")}
          aria-describedby={a11yInstructionsId}
          tabindex="0"
        >
          <GraphCanvas
            model={renderModel()}
            theme={theme()}
            projection={projection()}
            selection={selection()}
            preferredRenderer={props.preferredRenderer}
            overrides={props.rendererOverrides}
            onSelect={(ids) => {
              setSelection(ids)
              props.onSelect?.(ids[0])
            }}
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
        <div
          class={selectedNode() ? "w-72 max-w-[45%] shrink-0" : "w-0 shrink-0 overflow-hidden"}
          data-slot="graph-inspector-gutter"
          data-collapsed={!selectedNode()}
        >
          <GraphInspector
            model={props.model}
            node={selectedNode()}
            onSelect={select}
            onOpenTranscript={props.onOpenTranscript}
          />
        </div>
      </div>
    </div>
  )
}
