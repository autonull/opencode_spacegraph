import type {
  DepthMode,
  GraphRenderer,
  Projection,
  RendererCapabilities,
  RenderModel,
  RendererViewport,
  RenderTheme,
} from "@spacegraphjs/renderer"
import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js"
import { mountRenderer, type MountedRenderer, type RendererFactory, type RendererID } from "./renderer-registry"

export type GraphCanvasReady = { id: RendererID; capabilities: RendererCapabilities; fallback: boolean }

export type GraphCanvasProps = {
  model: RenderModel
  theme: RenderTheme
  projection?: Projection
  /** LE.14: depth treatment applied after mount; unsupported modes are the host's to gate. */
  depth?: DepthMode
  cardFacing?: "plane" | "camera"
  selection?: readonly string[]
  preferredRenderer?: RendererID
  /** Replaces an adapter factory (tests and stories); the registry still owns ordering and fallback. */
  overrides?: Partial<Record<RendererID, RendererFactory>>
  onSelect?: (ids: readonly string[]) => void
  /** LE.8/LE.9: a double-click expands a ribbon/matrix segment into the node-link graph. */
  onNodeDoubleClick?: (id: string) => void
  onReady?: (info: GraphCanvasReady) => void
  onError?: (error: unknown) => void
  onViewportChange?: (viewport: RendererViewport) => void
  onBackgroundClick?: () => void
  /** The node under the pointer, and none when the pointer leaves one. */
  onHover?: (id: string | undefined) => void
  /** Settled drag positions; a group reports every descendant it carried. */
  onNodeMoved?: (nodes: readonly { id: string; position: [number, number, number] }[]) => void
  /** A DOM node's settled size after its resize handle is released. */
  onNodeResized?: (resize: { id: string; size: [number, number]; position: [number, number, number] }) => void
  /**
   * Fires once the adapter has applied the current model, so a host can sequence a fit *after* the
   * new nodes and positions exist (LE.1) instead of framing a stale layout.
   */
  onModelApplied?: (renderer: GraphRenderer) => void
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
  // Depth defaults to the projection's coarse treatment; the adapter derives it at mount, so an unset
  // depth is not a conflict (LE.14).
  const depth = () => props.depth ?? (props.projection === "3d" ? "orbit" : "flat")
  // The cards lie in the content plane unless the host asks for the billboard (T1.19).
  const cardFacing = () => props.cardFacing ?? "plane"

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

    mountRenderer(host, { theme: props.theme, projection: props.projection ?? "2d", preferred: id }, props.overrides ?? {})
      .then((result) => {
        // A newer mount or an unmount superseded this one; drop the late result instead of leaking it.
        if (current !== generation) {
          result.renderer.dispose()
          return
        }

        mounted = result
        unsubscribers = [
          result.renderer.on("selectionChange", ({ ids }) => props.onSelect?.(ids)),
          result.renderer.on("nodeDoubleClick", ({ id }) => props.onNodeDoubleClick?.(id)),
          result.renderer.on("backgroundClick", () => props.onBackgroundClick?.()),
          result.renderer.on("bandChange", ({ band }) => {
            host.dataset.graphBand = band
          }),
          result.renderer.on("viewportChange", (viewport) => props.onViewportChange?.(viewport)),
          result.renderer.on("hoverChange", ({ id }) => props.onHover?.(id)),
          result.renderer.on("nodeMoved", ({ nodes }) => props.onNodeMoved?.(nodes)),
          result.renderer.on("nodeResized", (resize) => props.onNodeResized?.(resize)),
        ]
        result.renderer.setModel(props.model)
        props.onModelApplied?.(result.renderer)
        result.renderer.setSelection(props.selection ?? [])
        result.renderer.setDepth(depth())
        result.renderer.setCardFacing?.(cardFacing())
        host.dataset.graphRenderer = result.id
        host.dataset.graphProjection = props.projection ?? "2d"
        host.dataset.graphDepth = depth()
        host.dataset.graphCardFacing = cardFacing()
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
    // Read the props before the optional chain: `mounted?.x(props.y)` never evaluates `props.y` while
    // the mount is pending, so the effect would not track the prop and later updates would be dropped.
    const model = props.model

    if (!mounted) return
    mounted.renderer.setModel(model)
    props.onModelApplied?.(mounted.renderer)
  })
  createEffect(() => {
    const selection = props.selection

    if (mounted && selection) mounted.renderer.setSelection(selection)
  })
  createEffect(() => {
    const theme = props.theme

    mounted?.renderer.setTheme(theme)
  })
  createEffect(() => {
    const projection = props.projection

    if (!mounted || !projection) return
    mounted.renderer.setProjection(projection)
    host.dataset.graphProjection = projection
  })
  createEffect(() => {
    const value = depth()

    if (!mounted) return
    mounted.renderer.setDepth(value)
    host.dataset.graphDepth = value
  })
  createEffect(() => {
    const value = cardFacing()

    if (!mounted) return
    mounted.renderer.setCardFacing?.(value)
    host.dataset.graphCardFacing = value
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
