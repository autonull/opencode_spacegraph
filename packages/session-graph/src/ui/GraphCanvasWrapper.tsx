import type {
  GraphRenderer,
  Projection,
  RenderModel,
  RendererViewport,
  RenderTheme,
} from "@spacegraphjs/renderer"
import { createEffect, createRenderEffect, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js"
import { mountRenderer, type MountedRenderer, type RendererFactory, type RendererID } from "../canvas/renderer-registry"

export type GraphCanvasWrapperProps = {
  model: RenderModel
  theme: RenderTheme
  projection?: Projection
  depth?: "flat" | "layered" | "depth-stack" | "orbit"
  cardFacing?: "plane" | "camera"
  selection?: readonly string[]
  preferredRenderer?: RendererID
  overrides?: Partial<Record<RendererID, RendererFactory>>
  onSelect?: (ids: readonly string[]) => void
  onNodeDoubleClick?: (id: string) => void
  onBackgroundClick?: () => void
  onHover?: (id: string | undefined) => void
  onEdgeHover?: (id: string | undefined) => void
  onEdgeSelect?: (id: string) => void
  onGroupToggle?: (id: string) => void
  onGroupMenu?: (id: string, at: { x: number; y: number }) => void
  onNodeMoved?: (nodes: readonly { id: string; position: [number, number, number] }[]) => void
  onNodeResized?: (resize: { id: string; size: [number, number]; position: [number, number, number] }) => void
  onModelApplied?: (renderer: GraphRenderer) => void
  onRenderer?: (renderer: GraphRenderer | undefined) => void
  onRendererMounted?: (renderer: GraphRenderer, id: RendererID) => void
  onViewportChange?: (viewport: RendererViewport) => void
  onError?: (error: string | undefined) => void
}

const groupIDOf = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return undefined
  const id = target.closest<HTMLElement>("[data-node-id]")?.dataset.nodeId
  return id?.startsWith("band:") ? id.slice("band:".length) : id
}

export const GraphCanvasWrapper = (props: GraphCanvasWrapperProps): JSX.Element => {
  let host!: HTMLDivElement
  let mounted: MountedRenderer | undefined
  let unsubscribers: (() => void)[] = []
  let generation = 0
  const [ready, setReady] = createSignal(false)
  // Track the previous preferredRenderer using a ref
  let prevPreferredRenderer: RendererID = props.preferredRenderer ?? "spacegraph"

  const depth = () => props.depth ?? (props.projection === "3d" ? "orbit" : "flat")
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
        result.renderer.setDepth(depth())
        result.renderer.setCardFacing?.(cardFacing())
        host.dataset.graphRenderer = result.id
        host.dataset.graphProjection = props.projection ?? "2d"
        host.dataset.graphDepth = depth()
        host.dataset.graphCardFacing = cardFacing()
        host.dataset.graphReady = "true"
        setReady(true)
        props.onRenderer?.(result.renderer)
        props.onRendererMounted?.(result.renderer, result.id)
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
    start(props.preferredRenderer ?? "spacegraph")
    prevPreferredRenderer = props.preferredRenderer ?? "spacegraph"
  })

  // Watch for preferredRenderer changes and trigger renderer switch
  createRenderEffect(() => {
    const next = props.preferredRenderer ?? "spacegraph"

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