import type {
  GraphRenderer,
  Projection,
  RendererCapabilities,
  RenderModel,
  RendererViewport,
  RenderTheme,
} from "@spacegraphjs/renderer"
import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js"
import { mountRenderer, type MountedRenderer, type RendererID } from "./renderer-registry"

export type GraphCanvasReady = { id: RendererID; capabilities: RendererCapabilities; fallback: boolean }

export type GraphCanvasProps = {
  model: RenderModel
  theme: RenderTheme
  projection?: Projection
  selection?: readonly string[]
  preferredRenderer?: RendererID
  onSelect?: (ids: readonly string[]) => void
  onReady?: (info: GraphCanvasReady) => void
  onError?: (error: unknown) => void
  onViewportChange?: (viewport: RendererViewport) => void
  onBackgroundClick?: () => void
  /** Exposes the live renderer so a host can call `fit`/`focus`; `undefined` after teardown. */
  onRenderer?: (renderer: GraphRenderer | undefined) => void
}

/**
 * Renderer-agnostic canvas (§4.3): it owns one container, mounts the selected adapter once, pushes
 * new `RenderModel`s, mirrors selection both ways, and disposes on teardown. Session semantics stay
 * out of it; it speaks only the contract and the registry.
 */
export const GraphCanvas = (props: GraphCanvasProps) => {
  let host!: HTMLDivElement
  let mounted: MountedRenderer | undefined
  let unsubscribers: (() => void)[] = []
  let generation = 0
  const [ready, setReady] = createSignal(false)

  const teardown = () => {
    for (const unsubscribe of unsubscribers) unsubscribe()
    unsubscribers = []
    props.onRenderer?.(undefined)
    mounted?.renderer.dispose()
    mounted = undefined
    setReady(false)
  }

  const start = (id: RendererID) => {
    const current = ++generation
    teardown()

    mountRenderer(host, { theme: props.theme, projection: props.projection ?? "2d", preferred: id })
      .then((result) => {
        // A newer mount or an unmount superseded this one; drop the late result instead of leaking it.
        if (current !== generation) {
          result.renderer.dispose()
          return
        }

        mounted = result
        unsubscribers = [
          result.renderer.on("selectionChange", ({ ids }) => props.onSelect?.(ids)),
          result.renderer.on("backgroundClick", () => props.onBackgroundClick?.()),
          result.renderer.on("bandChange", ({ band }) => {
            host.dataset.graphBand = band
          }),
          result.renderer.on("viewportChange", (viewport) => props.onViewportChange?.(viewport)),
        ]
        result.renderer.setModel(props.model)
        result.renderer.setSelection(props.selection ?? [])
        host.dataset.graphRenderer = result.id
        host.dataset.graphProjection = props.projection ?? "2d"
        host.dataset.graphReady = "true"
        setReady(true)
        props.onRenderer?.(result.renderer)
        props.onReady?.({ id: result.id, capabilities: result.renderer.capabilities, fallback: result.fallback })
      })
      .catch((error: unknown) => {
        if (current !== generation) return
        host.dataset.graphReady = "false"
        host.dataset.graphError = error instanceof Error ? error.message : String(error)
        props.onError?.(error)
      })
  }

  onMount(() => start(props.preferredRenderer ?? "spacegraph"))

  createEffect((previous: RendererID | undefined) => {
    const next = props.preferredRenderer ?? "spacegraph"

    if (previous !== undefined && previous !== next) start(next)

    return next
  }, undefined)

  createEffect(() => {
    mounted?.renderer.setModel(props.model)
  })
  createEffect(() => {
    const selection = props.selection

    if (mounted && selection) mounted.renderer.setSelection(selection)
  })
  createEffect(() => {
    mounted?.renderer.setTheme(props.theme)
  })
  createEffect(() => {
    const projection = props.projection

    if (!mounted || !projection) return
    mounted.renderer.setProjection(projection)
    host.dataset.graphProjection = projection
  })

  onCleanup(() => {
    generation++
    teardown()
  })

  return (
    <div data-component="session-graph-canvas" style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={host}
        data-slot="graph-canvas-host"
        data-graph-ready="false"
        style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
      />
      <Show when={!ready()}>
        <div
          data-slot="graph-canvas-skeleton"
          style={{ position: "absolute", inset: "0", "pointer-events": "none", opacity: "0.4" }}
        />
      </Show>
    </div>
  )
}
