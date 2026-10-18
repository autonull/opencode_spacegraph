import type { GraphRenderer, Projection, RendererCapabilities, RenderTheme } from "@spacegraphjs/renderer"
import { supports } from "@spacegraphjs/renderer"
import type { GraphModel, GraphNode, Position, ZoomLevel } from "@opencode/session-ui/graph"
import { layoutGraph, LEVEL_RANK, minLevelOf, nodeByID } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { createEffect, createMemo, createSignal, createUniqueId, Show } from "solid-js"
import { buildRenderModel, type CardTemplate } from "../canvas/buildRenderModel"
import { GraphCanvas } from "../canvas/GraphCanvas"
import type { RendererID } from "../canvas/renderer-registry"
import { GraphA11y } from "./GraphA11y"
import { GraphBreadcrumbs } from "./GraphBreadcrumbs"
import { GraphInspector } from "./GraphInspector"
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
  positions?: ReadonlyMap<string, Position>
  renderCard?: CardTemplate
  onSelect?: (id: string | undefined) => void
  onOpenTranscript?: (id: string) => void
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
  const [internalSelection, setSelection] = createSignal<readonly string[]>(props.selection ? [props.selection] : [])
  const [searchOpen, setSearchOpen] = createSignal(false)
  const [capabilities, setCapabilities] = createSignal<RendererCapabilities>()
  const [rendererID, setRendererID] = createSignal<RendererID>()
  let renderer: GraphRenderer | undefined

  const theme = () => props.theme ?? resolvedTheme()
  const layout = createMemo(() => props.positions ?? layoutGraph(props.model).positions)
  const selection = (): readonly string[] => (props.selection !== undefined ? [props.selection] : internalSelection())
  const renderModel = createMemo(() =>
    buildRenderModel(props.model, {
      level: level(),
      positions: layout(),
      focus: level() === "execution" ? selection()[0] : undefined,
      renderCard: props.renderCard,
    }),
  )
  const selectedNode = () => {
    const id = selection()[0]
    return id ? nodeByID(props.model, id) : undefined
  }

  const select = (id: string | undefined) => {
    setSelection(id ? [id] : [])
    props.onSelect?.(id)
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
  // A capability gap is never silent: when the active renderer cannot do 3D, fall back to 2D rather
  // than leaving the model in a projection the renderer ignores.
  createEffect(() => {
    const current = capabilities()
    if (current && projection() === "3d" && !supports(current, "3d")) setProjection("2d")
  })

  return (
    <div data-component="session-graph-view" data-slot="graph-view" class="flex h-full w-full flex-col overflow-hidden">
      <GraphToolbar
        level={level()}
        onLevel={setLevel}
        projection={projection()}
        onProjection={setProjection}
        capabilities={capabilities()}
        renderer={rendererID()}
        onFit={() => renderer?.fit()}
        onSearch={() => setSearchOpen((open) => !open)}
        onBack={props.onBack}
        searching={searchOpen()}
      />
      <GraphBreadcrumbs model={props.model} selected={selection()[0]} onSelect={select} />
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
            onSelect={(ids) => {
              setSelection(ids)
              props.onSelect?.(ids[0])
            }}
            onBackgroundClick={() => select(undefined)}
            onRenderer={(instance) => (renderer = instance)}
            onReady={(info) => {
              setCapabilities(info.capabilities)
              setRendererID(info.id)
            }}
          />
          <GraphA11y
            model={renderModel()}
            selection={selection()}
            instructionsId={a11yInstructionsId}
            onSelect={select}
            onEscape={() => select(undefined)}
          />
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
        <div class="w-72 max-w-[45%] shrink-0">
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
