// Local graph utilities — generic capabilities that belong in SpaceGraphJS but are implemented
// here because the pinned library commit doesn't have them yet. When the library publishes
// these, replace with imports from "@spacegraphjs/utils".

export type WidthThresholdFlags = {
  narrow?: boolean
  compact?: boolean
}

export type WidthThresholdTracker = {
  observe: (handler: (flags: WidthThresholdFlags) => void) => void
}

export function createWidthThresholdTracker(
  getElement: () => HTMLElement | undefined,
  thresholds: { narrow: number; compact: number },
): WidthThresholdTracker {
  let observer: ResizeObserver | undefined
  let currentFlags: WidthThresholdFlags = {}

  const observe = (handler: (flags: WidthThresholdFlags) => void) => {
    const el = getElement()
    if (!el) return

    const check = () => {
      const width = el.clientWidth
      const newFlags: WidthThresholdFlags = {}
      if (width < thresholds.narrow) newFlags.narrow = true
      if (width < thresholds.compact) newFlags.compact = true

      const changed = newFlags.narrow !== currentFlags.narrow || newFlags.compact !== currentFlags.compact
      if (changed) {
        currentFlags = newFlags
        handler(newFlags)
      }
    }

    observer = new ResizeObserver(check)
    observer.observe(el)
    check() // Initial check

    return () => {
      observer?.disconnect()
    }
  }

  return { observe }
}

export type TouchGestureOptions = {
  getViewport: () => { zoom: number; center: [number, number, number] } | undefined
  setViewport: (vp: { zoom: number; center: [number, number, number] }) => void
  capabilities: { zoomRange?: { min: number; max: number } }
}

export function attachTouchGestures(
  el: HTMLElement,
  options: TouchGestureOptions,
): () => void {
  let startTouches: Touch[] | null = null
  let startZoom = 1
  let startCenter: [number, number, number] | null = null

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      startTouches = Array.from(e.touches)
      const vp = options.getViewport()
      startZoom = vp?.zoom ?? 1
      startCenter = vp?.center ?? [0, 0, 0]
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!startTouches || e.touches.length !== 2) return
    e.preventDefault()

    const touch1 = e.touches[0]
    const touch2 = e.touches[1]
    const start1 = startTouches[0]
    const start2 = startTouches[1]

    // Pinch zoom
    const currentDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)
    const startDist = Math.hypot(start1.clientX - start2.clientX, start1.clientY - start2.clientY)

    if (startDist > 0) {
      const scale = currentDist / startDist
      const newZoom = Math.min(
        Math.max(startZoom * scale, options.capabilities.zoomRange?.min ?? 0.1),
        options.capabilities.zoomRange?.max ?? 10,
      )
      if (startCenter) {
        options.setViewport({ zoom: newZoom, center: startCenter })
      }
    }
  }

  const handleTouchEnd = () => {
    startTouches = null
    startCenter = null
  }

  el.addEventListener("touchstart", handleTouchStart, { passive: false })
  el.addEventListener("touchmove", handleTouchMove, { passive: false })
  el.addEventListener("touchend", handleTouchEnd)

  return () => {
    el.removeEventListener("touchstart", handleTouchStart)
    el.removeEventListener("touchmove", handleTouchMove)
    el.removeEventListener("touchend", handleTouchEnd)
  }
}

export type KeyboardShortcut = {
  key: string
  shift?: boolean
  alt?: boolean
  ctrl?: boolean
  meta?: boolean
  handler: () => void
}

export function attachKeyboardShortcuts(shortcuts: KeyboardShortcut[]): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      if (
        e.key.toLowerCase() === shortcut.key.toLowerCase() &&
        !!e.shiftKey === !!shortcut.shift &&
        !!e.altKey === !!shortcut.alt &&
        !!e.ctrlKey === !!shortcut.ctrl &&
        !!e.metaKey === !!shortcut.meta
      ) {
        e.preventDefault()
        shortcut.handler()
        break
      }
    }
  }

  window.addEventListener("keydown", handleKeyDown)
  return () => window.removeEventListener("keydown", handleKeyDown)
}

// Re-export proposeWindow from the local graph-windows module
export { proposeWindow } from "./graph-windows"