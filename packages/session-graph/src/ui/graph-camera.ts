import type { FitOptions, GraphRenderer, RendererCapabilities, RendererViewport } from "@spacegraphjs/renderer"
import { Metrics, type Position } from "@opencode/session-ui/graph"
import { createSignal, onCleanup, untrack } from "solid-js"

/** The step a zoom click takes: a tenth of the fit, so one click is the same step at any fit. */
const ZOOM_STEP = 0.1

/** How long the camera waits for the viewport reports to stop before the frame is the reference. */
const SETTLE_MS = 120

export type GraphCameraOptions = {
  /** The live renderer; the camera drives it. */
  renderer: () => GraphRenderer | undefined
  /** The latest viewport the renderer reported. */
  viewport: () => RendererViewport | undefined
  /** The active renderer's capabilities; they bound the zoom. */
  capabilities: () => RendererCapabilities | undefined
  /** The nodes a fit holds. */
  content: () => string[]
  /** The frame's own options: the legibility floor and the insets the chrome needs. */
  fit: () => FitOptions
  /** A node's world position, for the jump a reader who asked for less motion gets. */
  positionOf: (id: string) => Position | undefined
  /** The width a card covers on the screen, in pixels. */
  cardWidth: () => number
  /** The card's world width. */
  cardWorldWidth: number
  /** The width a card must cover on the screen before the reader can read it. */
  readableWidth: number
}

/**
 * The camera: the frame, the zoom, and the 100% reference the readout shows.
 *
 * The renderer owns the geometry and the camera; the host owns what the frame should hold. A fit
 * emits viewports as the camera animates, so the baseline is read until the reports stop — the
 * settled frame becomes the 100% reference. A zoom is the reader's own act, so it ends that window
 * and the readout keeps telling the truth.
 */
export function createGraphCamera(options: GraphCameraOptions) {
  const [baseline, setBaseline] = createSignal(1)
  const [pending, setPending] = createSignal(false)
  let settleTimer: ReturnType<typeof setTimeout> | undefined

  const settle = () => {
    if (settleTimer) clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      settleTimer = undefined
      setPending(false)
      const current = untrack(options.viewport)
      if (current) setBaseline(current.zoom)
    }, SETTLE_MS)
  }

  onCleanup(() => {
    if (settleTimer) clearTimeout(settleTimer)
  })

  const request = (fit: () => void) => {
    setPending(true)
    settle()
    fit()
  }

  /** A zoom is the reader's own act: the 100% reference stops following the camera. */
  const endFitWindow = () => {
    if (!pending()) return
    setPending(false)
    if (settleTimer) clearTimeout(settleTimer)
    settleTimer = undefined
  }

  const fitContent = () => {
    Metrics.count("fit")
    request(() => options.renderer()?.fit(untrack(options.content), options.fit()))
  }

  /** The renderer reported a viewport: while the fit settles, the baseline follows it. */
  const report = (viewport: RendererViewport) => {
    if (!pending()) return
    setBaseline(viewport.zoom || 1)
    settle()
  }

  /**
   * T6.18: the reader may have asked for less motion, so the camera jumps instead of gliding. The
   * host knows the node's world position from the layout, and the contract's setViewport is instant.
   */
  const focus = (id: string) => {
    const instance = options.renderer()
    if (!instance) return
    const position = options.positionOf(id)
    const current = options.viewport()
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches || !position || !current) {
      instance.focus(id)
      return
    }
    instance.setViewport({ zoom: current.zoom, center: [position.x, position.y, position.z] })
  }

  /**
   * T11.2 (A) — in the card mode the selected card is the detail, so the camera brings it close
   * enough to read: a card's tier is measured in screen pixels, so a card that stays small cannot
   * say anything. The camera only ever moves closer, and only for the selection — a pan, a zoom or
   * a fit never re-frames the card behind the reader's back.
   */
  const frameReadable = (id: string) => {
    const instance = options.renderer()
    if (!instance) return
    if (options.cardWidth() >= options.readableWidth) {
      focus(id)
      return
    }
    // The fit's legibility floor is the card's reading width, so the frame lands on a card the
    // reader can read; the padding keeps the neighbourhood in view.
    request(() =>
      instance.fit([id], {
        ...options.fit(),
        minScale: options.readableWidth / options.cardWorldWidth,
        padding: options.cardWorldWidth * 2,
      }),
    )
  }

  const zoomLimits = () => {
    const range = options.capabilities()?.zoomRange
    return {
      min: Math.max(baseline() / 3, range?.min ?? 0),
      max: Math.min(baseline() * 2.5, range?.max ?? Number.POSITIVE_INFINITY),
    }
  }

  const zoomPercent = () => {
    const current = options.viewport()
    if (!current) return 100
    return Math.max(33, Math.round((current.zoom / baseline()) * 100))
  }

  const zoomBy = (direction: 1 | -1) => {
    const current = options.viewport()
    const instance = options.renderer()
    if (!current || !instance) return
    Metrics.count("zoom")
    endFitWindow()
    const step = baseline() * ZOOM_STEP
    const limits = zoomLimits()
    instance.setViewport({
      zoom: Math.min(limits.max, Math.max(limits.min, current.zoom + direction * step)),
      center: current.center,
    })
  }

  return {
    baseline,
    pending,
    endFitWindow,
    fitContent,
    focus,
    frameReadable,
    report,
    request,
    zoomBy,
    zoomLimits,
    zoomPercent,
  }
}
