import type {
  GraphRenderer,
  RendererViewport,
} from "@spacegraphjs/renderer"
import type {
  Position,
} from "@opencode/session-ui/graph"
import { createGraphCamera } from "./graph-camera"
import { createSignal, onCleanup } from "solid-js"

export type GraphViewportTrackerProps = {
  renderer: () => GraphRenderer | undefined
  displayPositions: () => ReadonlyMap<string, Position>
  contentIDs: () => string[]
  fitOptions: () => { minScale: number; insets: undefined }
  cardScreenWidth: () => number
  CARD_SIZE: readonly [number, number]
  READABLE_CARD_WIDTH: number
}

export type GraphViewportTrackerReturn = {
  camera: ReturnType<typeof createGraphCamera>
  viewport: () => RendererViewport | undefined
  setViewport: (vp: RendererViewport | undefined) => void
  resting: () => [number, number, number] | undefined
  setResting: (center: { zoom: number; center: number[] }) => void
  fitContent: () => void
  zoomBy: (delta: -1 | 1) => void
  zoomPercent: () => number
  zoomLimits: () => { min: number; max: number }
  frame: (ids: string[]) => void
  focus: (id: string) => void
  getNodeScreenPosition: (nodeID: string) => { x: number; y: number } | undefined
}

/**
 * The viewport tracker for the graph — manages camera, viewport, resting position, and fit logic.
 */
export const useGraphViewport = (props: GraphViewportTrackerProps): GraphViewportTrackerReturn => {
  const {
    renderer,
    displayPositions,
    contentIDs,
    fitOptions,
    cardScreenWidth,
    CARD_SIZE,
    READABLE_CARD_WIDTH,
  } = props

  // T17.5 — the camera's resting place: the centre the camera last came to rest at. The card
  // budget follows the camera, and a budget that changed on every frame would rebuild the map on
  // every frame and make the cards churn under the reader's hand.
  const [resting, setRestingSignal] = createSignal<[number, number, number]>()
  let restTimer: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => {
    if (restTimer) clearTimeout(restTimer)
  })

  // T17.5 — the camera's resting place: the centre the camera last came to rest at. The card
  // budget follows the camera, and a budget that changed on every frame would rebuild the map on
  // every frame and make the cards churn under the reader's hand.
  const REST_SETTLE_MS = 120
  void REST_SETTLE_MS

  // The viewport is the renderer's current view: zoom + center. The host does not drive it; the
  // renderer reports it, and the host reflects it. This is the single source of truth for where
  // the reader is looking.
  const [viewport, setViewport] = createSignal<RendererViewport>()

  const camera = createGraphCamera({
    renderer,
    viewport,
    capabilities: () => undefined,
    content: contentIDs,
    fit: fitOptions,
    positionOf: (id) => displayPositions().get(id),
    cardWidth: cardScreenWidth,
    cardWorldWidth: CARD_SIZE[0],
    readableWidth: READABLE_CARD_WIDTH,
  })

  const setResting = (center: { zoom: number; center: number[] }) => {
    if (restTimer) clearTimeout(restTimer)
    restTimer = setTimeout(() => {
      restTimer = undefined
      setRestingSignal([center.center[0], center.center[1], center.center[2] ?? center.zoom])
    }, REST_SETTLE_MS)
  }

  const zoomBy = (delta: -1 | 1) => camera.zoomBy(delta)

  return {
    camera,
    viewport,
    setViewport,
    resting,
    setResting,
    fitContent: () => camera.fitContent(),
    zoomBy,
    zoomPercent: () => camera.zoomPercent(),
    zoomLimits: () => camera.zoomLimits(),
    frame: (ids: string[]) => camera.frame(ids),
    focus: (id: string) => camera.focus(id),
    getNodeScreenPosition: (nodeID: string) => renderer()?.getNodeScreenPosition?.(nodeID),
  }
}