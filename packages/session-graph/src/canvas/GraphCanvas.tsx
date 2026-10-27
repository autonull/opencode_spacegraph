import type {
  DepthMode,
  GraphRenderer,
  Projection,
  RendererCapabilities,
  RenderModel,
  RendererViewport,
  RenderTheme,
} from "@spacegraphjs/renderer"
import { createEffect, createRenderEffect, createSignal, onCleanup, onMount, Show } from "solid-js"
import { mountRenderer, type MountedRenderer, type RendererFactory, type RendererID } from "./renderer-registry"

export type GraphCanvasReady = { id: RendererID; capabilities: RendererCapabilities; fallback: boolean }

export type GraphCanvasProps = {
  model: RenderModel
  theme: RenderTheme
  projection?: Projection | (() => Projection)
  /** LE.14: depth treatment applied after mount; unsupported modes are the host's to gate. */
  depth?: DepthMode | (() => DepthMode)
  cardFacing?: "plane" | "camera"
  selection?: readonly string[]
  preferredRenderer?: () => RendererID
  /** Replaces an adapter factory (tests and stories); the registry still owns ordering and fallback. */
  overrides?: Partial<Record<RendererID, RendererFactory>>
  onSelect?: (ids: readonly string[]) => void
  /** LE.8/LE.9: a double-click expands a ribbon/matrix segment into the node-link graph. */
  onNodeDoubleClick?: (id: string) => void
  onBackgroundClick?: () => void
  onReady?: (info: GraphCanvasReady) => void
  onError?: (error: string | undefined) => void
  onViewportChange?: (viewport: RendererViewport) => void
  /** The node under the pointer, and none when the pointer leaves one. */
  onHover?: (id: string | undefined) => void
  /** B3: the edge under the pointer, and none when it leaves. */
  onEdgeHover?: (id: string | undefined) => void
  /** B3: an edge was clicked; the host names it and offers a trace from its source. */
  onEdgeSelect?: (id: string) => void
  /** B2: the group header's chevron was clicked, so the host folds or unfolds the group. */
  onGroupToggle?: (id: string) => void
  /** B2: the reader right-clicked a group card; the host owns the menu. */
  onGroupMenu?: (id: string, at: { x: number; y: number }) => void
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
  /** Fires when the renderer has been mounted with its id. */
  onRendererMounted?: (renderer: GraphRenderer, id: RendererID) => void
}

const groupIDOf = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return undefined
  const id = target.closest<HTMLElement>("[data-node-id]")?.dataset.nodeId
  return id?.startsWith("band:") ? id.slice("band:".length) : id
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
  // Track the previous preferredRenderer using a ref
  const getPreferredRenderer = () => props.preferredRenderer?.() ?? "spacegraph"
  let prevPreferredRenderer: RendererID = getPreferredRenderer()

  const getProjection = () => typeof props.projection === "function" ? props.projection() : (props.projection ?? "2d")
  const getDepth = () => typeof props.depth === "function" ? props.depth() : (props.depth ?? (getProjection() === "3d" ? "orbit" : "flat"))
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

    mountRenderer(host, { theme: props.theme, projection: getProjection(), preferred: id }, props.overrides ?? {})
      .then((result) => {
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
          result.renderer.on("hoverChange", ({ id, kind }) => {
            props.onHover?.(kind === "edge" ? undefined : id)
            props.onEdgeHover?.(kind === "edge" ? id : undefined)
          }),
          result.renderer.on("edgeClick", ({ id }) => props.onEdgeSelect?.(id)),
          result.renderer.on("nodeMoved", ({ nodes }) => props.onNodeMoved?.(nodes)),
          result.renderer.on("nodeResized", (resize) => props.onNodeResized?.(resize)),
        ]
        result.renderer.setModel(props.model)
        props.onModelApplied?.(result.renderer)
        result.renderer.setSelection(props.selection ?? [])
        result.renderer.setDepth(getDepth())
        result.renderer.setCardFacing?.(cardFacing())
        host.dataset.graphRenderer = result.id
        host.dataset.graphProjection = getProjection()
        host.dataset.graphDepth = getDepth()
        host.dataset.graphCardFacing = cardFacing()
        host.dataset.graphReady = "true"
        setReady(true)
        props.onRenderer?.(result.renderer)
        props.onRendererMounted?.(result.renderer, result.id)
        props.onReady?.({ id: result.id, capabilities: result.renderer.capabilities, fallback: result.fallback })
      })
      .catch((error: unknown) => {
        if (current !== generation) return
        host.dataset.graphReady = "false"
        const message = error instanceof Error ? error.message : String(error)
        host.dataset.graphError = message
        props.onError?.(message)
      })
  }

  const onClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element) || !event.target.closest("[data-group-toggle]")) return
    const id = groupIDOf(event.target)
    if (!id) return
    event.preventDefault()
    event.stopPropagation()
    props.onGroupToggle?.(id)
  }
  const onContextMenu = (event: MouseEvent) => {
    if (!(event.target instanceof Element) || !event.target.closest("[data-group-members], [data-band]")) return
    const id = groupIDOf(event.target)
    if (!id) return
    event.preventDefault()
    props.onGroupMenu?.(id, { x: event.clientX, y: event.clientY })
  }

  onMount(() => {
    host.addEventListener("click", onClick, true)
    host.addEventListener("contextmenu", onContextMenu, true)
    onCleanup(() => {
      host.removeEventListener("click", onClick, true)
      host.removeEventListener("contextmenu", onContextMenu, true)
    })
    start(getPreferredRenderer())
    prevPreferredRenderer = getPreferredRenderer()
  })

  // Watch for preferredRenderer changes and trigger renderer switch
  createRenderEffect(() => {
    const next = getPreferredRenderer()

    if (prevPreferredRenderer !== next) {
      prevPreferredRenderer = next
      start(next)
    }
  })

  createEffect(() => {
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
    const projection = typeof props.projection === "function" ? props.projection() : (props.projection ?? "2d")

    if (!mounted || !projection) return
    mounted.renderer.setProjection(projection)
    host.dataset.graphProjection = projection
  })
  createEffect(() => {
    const projection = typeof props.projection === "function" ? props.projection() : (props.projection ?? "2d")
    const value = typeof props.depth === "function" ? props.depth() : (props.depth ?? (projection === "3d" ? "orbit" : "flat"))

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