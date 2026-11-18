import type { MountedSession } from "@opencode/plugin/gui"
import type { GraphRenderer } from "@spacegraphjs/renderer"
import type { WidgetRegistry } from "spacegraphjs/widgets"
import { useI18n } from "./i18n"
import { createEffect, createSignal, getOwner, onCleanup, onMount, runWithOwner, type Accessor } from "solid-js"
import type { GraphViewData, LayoutStrategy, ZoomLevel } from "../model"
import { NodeWidgetLayer } from "./widgets/NodeWidgetLayer"

/**
 * Mounts the ported renderer host into a DOM node: the session model becomes a
 * render model through the library adapter, then a renderer draws it. The
 * preferred SpaceGraphJS adapter falls back to Cytoscape on a mount failure.
 * A host-provided widget registry mounts interactive widgets above the canvas.
 * When `graph` is supplied the canvas redraws whenever the shared model changes,
 * so the chrome's layout and navigation controls take effect on the live view.
 */
export function GraphCanvas(props: {
  session: MountedSession
  class: string
  registry?: () => WidgetRegistry | undefined
  graph?: Accessor<GraphViewData>
  layout?: LayoutStrategy
  level?: ZoomLevel
}) {
  let container!: HTMLDivElement
  const i18n = useI18n()
  const [view, setView] = createSignal<GraphViewData>()
  const [renderer, setRenderer] = createSignal<GraphRenderer>()

  onMount(() => {
    const owner = getOwner()
    let disposed = false
    let dispose: (() => void) | undefined

    void (async () => {
      const [
        { buildGraph, layoutGraph },
        { buildRenderModel },
        { mountRenderer },
        { DARK_THEME },
        { createCardTemplate },
        { createCardCopy },
        { withWidgetRequests },
      ] = await Promise.all([
        import("../model"),
        import("./canvas/buildRenderModel"),
        import("./canvas/renderer-registry"),
        import("./canvas/fixtures"),
        import("./ui/cardTemplate"),
        import("./ui/card-copy"),
        import("./widget-registry"),
      ])
      if (disposed) return

      const messages = props.session.server.data.session.message.list(props.session.id)
      const status = props.session.server.data.session.status(props.session.id) === "running"
        ? ({ type: "busy" } as const)
        : ({ type: "idle" } as const)
      const localGraph = buildGraph({ messages: [...messages], status })

      // Three.js measures the container once at mount. Host CSS (contributed as a Style) can arrive
      // after this component mounts, leaving a 0-height canvas that never recovers. Wait for a real
      // box before mounting the renderer.
      if (container.getBoundingClientRect().height < 1) {
        await new Promise<void>((resolve) => {
          const deadline = performance.now() + 5000
          const check = () => {
            if (container.getBoundingClientRect().height >= 1 || performance.now() >= deadline || disposed) return resolve()
            requestAnimationFrame(check)
          }
          check()
        })
      }
      if (disposed) return

      const mounted = await mountRenderer(container, { theme: DARK_THEME, projection: "2d" })
      if (disposed) {
        mounted.renderer.dispose()
        return
      }

      const makeModel = (graph: GraphViewData) => {
        const level = props.level ?? "execution"
        const layout = layoutGraph(graph, { level, strategy: props.layout })
        return withWidgetRequests(
          buildRenderModel(graph, {
            level,
            positions: layout.positions,
            renderCard: createCardTemplate(DARK_THEME, { copy: createCardCopy(i18n) }),
          }),
          graph,
        )
      }

      const initial = props.graph?.() ?? localGraph
      mounted.renderer.setModel(makeModel(initial))
      // Frame the freshly mounted graph so it is visible without a manual fit; the renderer keeps the
      // camera at the origin otherwise, pushing laid-out cards off-screen.
      mounted.renderer.fit()
      setView(initial)
      setRenderer(mounted.renderer)

      // Host CSS can arrive after mount; keep the renderer's backing size in sync with the container
      // and refit once it first becomes visible so cards are never drawn into a 0-height canvas.
      let framed = container.getBoundingClientRect().height >= 1
      const observer = new ResizeObserver(() => {
        if (disposed) return
        mounted.renderer.resize()
        const height = container.getBoundingClientRect().height
        if (!framed && height >= 1) {
          framed = true
          mounted.renderer.fit()
        }
      })
      observer.observe(container)

      dispose = () => {
        observer.disconnect()
        mounted.renderer.dispose()
      }

      if (props.graph && owner) {
        runWithOwner(owner, () => createEffect(() => {
          const graph = props.graph?.()
          if (!graph) return
          mounted.renderer.setModel(makeModel(graph))
          setView(graph)
        }))
      }
    })()

    onCleanup(() => {
      disposed = true
      dispose?.()
      setRenderer(undefined)
      setView(undefined)
    })
  })

  return (
    <div class={props.class} data-slot="spacegraph-graph-canvas" style={{ position: "relative" }}>
      <div ref={container} style={{ position: "absolute", inset: 0, height: "100%", "min-height": "200px" }} />
      <NodeWidgetLayer
        renderer={renderer}
        contentIDs={() => view()?.nodes.map((node) => node.id) ?? []}
        model={() => ({ nodes: view()?.nodes ?? [] })}
        registry={() => props.registry?.()}
      />
    </div>
  )
}
