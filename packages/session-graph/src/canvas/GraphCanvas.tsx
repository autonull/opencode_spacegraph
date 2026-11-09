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
import { diffRenderModels } from "@spacegraphjs/adapter"

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
  /** When true, all camera animations (fit, focus, depth transitions) complete instantly without easing. */
  reducedMotion?: boolean | (() => boolean)
  /** Register the instance on `window.SpaceGraph` and `SpaceGraph.instances` for developer tooling. Off by default. */
  global?: boolean | (() => boolean)
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

  // Streaming state
  let previousModel: RenderModel | null = null
  let patchTimeout: number | null = null
  const PATCH_DEBOUNCE_MS = 80

  const getProjection = () => typeof props.projection === "function" ? props.projection() : (props.projection ?? "2d")
  const getDepth = () => typeof props.depth === "function" ? props.depth() : (props.depth ?? (getProjection() === "3d" ? "orbit" : "flat"))
  const cardFacing = () => props.cardFacing ?? "plane"

  /** Check if we can apply an incremental patch instead of a full model rebuild. */
  function canPatch(prev: RenderModel, next: RenderModel): boolean {
    // Cold mount or no previous model -> full rebuild
    if (!prev) return false

    // Structural changes (level/layout/depth/projection) -> full rebuild
    // These are handled by separate effects, so we assume if we're here, they haven't changed

    // Check for removed nodes
    const prevNodeIds = new Set(prev.nodes.map((n) => n.id))
    const nextNodeIds = new Set(next.nodes.map((n) => n.id))
    for (const id of prevNodeIds) {
      if (!nextNodeIds.has(id)) return false
    }

    // Check for changed kind/shape/position on existing nodes
    const prevNodes = new Map(prev.nodes.map((n) => [n.id, n]))
    for (const nextNode of next.nodes) {
      const prevNode = prevNodes.get(nextNode.id)
      if (prevNode) {
        if (prevNode.kind !== nextNode.kind) return false
        if (prevNode.shape !== nextNode.shape) return false
        // Position rewrites for existing ids
        if (prevNode.position[0] !== nextNode.position[0] ||
            prevNode.position[1] !== nextNode.position[1] ||
            prevNode.position[2] !== nextNode.position[2]) {
          return false
        }
      }
    }

    // Check for removed edges
    const prevEdgeIds = new Set(prev.edges.map((e) => e.id))
    const nextEdgeIds = new Set(next.edges.map((e) => e.id))
    for (const id of prevEdgeIds) {
      if (!nextEdgeIds.has(id)) return false
    }

    return true
  }

  /** Apply model with streaming support: use applyPatch for append-only changes, else setModel. */
  function applyModel(model: RenderModel) {
    if (!mounted) return

    const renderer = mounted.renderer
    const hasApplyPatch = typeof renderer.applyPatch === "function"

    if (hasApplyPatch && previousModel && canPatch(previousModel, model)) {
      // Use incremental patch
      const patch = diffRenderModels(previousModel, model)
      const hasChanges = patch.nodes.added.length > 0 ||
        patch.nodes.changed.length > 0 ||
        patch.nodes.removed.length > 0 ||
        patch.edges.added.length > 0 ||
        patch.edges.changed.length > 0 ||
        patch.edges.removed.length > 0

      if (hasChanges) {
        // Debounce: coalesce bursts within 80ms window
        if (patchTimeout) clearTimeout(patchTimeout)
        patchTimeout = window.setTimeout(() => {
          renderer.applyPatch?.(patch)
          previousModel = model
          patchTimeout = null
        }, PATCH_DEBOUNCE_MS)
        return
      }
    }

    // Full model path (or no changes to patch)
    if (patchTimeout) {
      clearTimeout(patchTimeout)
      patchTimeout = null
    }
    renderer.setModel(model)
    previousModel = model
    props.onModelApplied?.(renderer)
  }

  const teardown = () => {
    if (patchTimeout) {
      clearTimeout(patchTimeout)
      patchTimeout = null
    }
    for (const unsubscribe of unsubscribers) unsubscribe()
    unsubscribers = []
    props.onRenderer?.(undefined)
    mounted?.renderer.dispose()
    mounted = undefined
    setReady(false)
    previousModel = null
  }

  const start = (id: RendererID) => {
    const current = ++generation
    teardown()

    const getReducedMotion = () => typeof props.reducedMotion === "function" ? props.reducedMotion() : (props.reducedMotion ?? false)
    const getGlobal = () => typeof props.global === "function" ? props.global() : (props.global ?? false)

    mountRenderer(host, { theme: props.theme, projection: getProjection(), preferred: id, reducedMotion: getReducedMotion(), global: getGlobal() }, props.overrides ?? {})
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
        // Reset previousModel on renderer change (cold mount)
        previousModel = null
        applyModel(props.model)
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
    applyModel(model)
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
    // Only default depth from projection when depth is not explicitly provided (undefined).
    // If depth is explicitly set (even to "flat"), use that value.
    const depthProp = typeof props.depth === "function" ? props.depth() : props.depth
    const value = depthProp ?? (projection === "3d" ? "orbit" : "flat")

    if (!mounted) return
    console.log('[GraphCanvas] Depth effect running', { depthProp, projection, value, depthType: typeof props.depth })
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