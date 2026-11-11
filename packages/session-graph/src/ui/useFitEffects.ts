import { createEffect, createSignal, untrack } from "solid-js"
import type { GraphRenderer } from "@spacegraphjs/renderer"
import type { Layout, GraphArrangement, SpatialMemoryCamera } from "@opencode/session-ui/graph"

export function useFitEffects(
  props: {
    refitKey?: string
    arrangement?: GraphArrangement
    layout: () => Layout
    inspectorOpen: () => boolean
    files: () => boolean
    level: () => import("@opencode/session-ui/graph").ZoomLevel
    projection: () => import("@spacegraphjs/renderer").Projection
    depth: () => import("@spacegraphjs/renderer").DepthMode
  },
  state: {
    renderer: () => GraphRenderer | undefined
    viewportTracker: ReturnType<typeof import("./useGraphViewport").useGraphViewport> | undefined
    contentIDs: () => string[]
    fitOptions: () => { minScale: number; insets: undefined }
    setNeedsFit: (v: boolean) => void
    needsFit: () => boolean
    detailFraming: () => import("@opencode/session-ui/graph").DetailFraming
    selection: { selection: () => readonly string[] }
    rendererReady: () => boolean
    inspectorOpen: () => boolean
    /** Pops a stored camera exactly once, on the renderer that should receive it. */
    takeRestoredCamera?: () => SpatialMemoryCamera | undefined
  },
) {
  // LE.1: frame the drawn content on first load, renderer/level/projection/layout change, inspector toggle
  createEffect(() => {
    props.level()
    props.projection()
    props.depth()
    props.layout()
    state.inspectorOpen()
    props.files()
    state.setNeedsFit(true)
  })

  // Selection framing (detailFraming === "card")
  const [framedSelection, setFramedSelection] = createSignal<string | undefined>()
  createEffect(() => {
    if (state.detailFraming() !== "card") return
    const id = state.selection.selection()[0]
    if (!id) return
    const vt = state.viewportTracker
    if (!vt) return
    if (vt.camera.pending()) return
    if (!state.rendererReady()) return
    const current = vt.viewport()
    if (!current) return
    if (framedSelection() === id) return
    setFramedSelection(id)
    vt.camera.frameReadable(id)
  })

  // Structural refit (refitKey, arrangement change)
  createEffect(() => {
    void props.refitKey
    void props.arrangement
    const instance = state.renderer()
    if (!instance) return
    const vt = state.viewportTracker
    if (!vt) return

    const restored = state.takeRestoredCamera?.()
    if (restored && instance.setViewport) {
      instance.setViewport({ zoom: restored.zoom, center: restored.center })
      vt.setViewport({
        zoom: restored.zoom,
        center: [...restored.center],
        extent: vt.viewport()?.extent,
        band: vt.viewport()?.band,
      })
      return
    }

    untrack(() =>
      vt.camera.request(() => instance.fit(untrack(state.contentIDs), untrack(state.fitOptions))),
    )
  })
}