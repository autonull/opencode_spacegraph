import { useI18n } from "@opencode/ui/context/i18n"
import { For, onCleanup, onMount, type JSX } from "solid-js"
import { GraphIconButton } from "./GraphIconButton"

/**
 * T12 — a window is a panel that floats over the map, holds content, and can be moved, resized,
 * focused and closed by the reader. It is *durable*: it stays where the reader put it until they
 * close it. It is a **host** surface, not a node: it never enters the render model, the spec or
 * the export, and it is **screen-space** — a window you are reading should stay still while the
 * map moves.
 */
export type GraphWindowState = {
  id: string
  /** What the window holds. The host owns the kinds; the manager knows none of them. */
  kind: string
  /** The node a window is about, when it is about one. */
  nodeID?: string
  left: number
  top: number
  width: number
  height: number
  /** The stacking order: the front window answers Escape. */
  z: number
  /** The window follows its node across a pan. */
  pinned?: boolean
}

export const GRAPH_WINDOW_MIN_WIDTH = 240
export const GRAPH_WINDOW_MIN_HEIGHT = 160

export type GraphWindowsProps = {
  windows: readonly GraphWindowState[]
  /** The host owns the windows; the manager reports what the reader did to them. */
  onChange?: (windows: GraphWindowState[]) => void
  onClose?: (id: string) => void
  /** The content of a window. The host owns what a window says. */
  render: (window: GraphWindowState) => JSX.Element
  /** The window's title. */
  title: (window: GraphWindowState) => string
  /** Where a node sits on the screen, for a pinned window. */
  anchorOf?: (nodeID: string) => { x: number; y: number } | undefined
  /** The region the windows live in: the clamp, and the pinned anchor's origin. */
  bounds: () => { width: number; height: number }
}

/**
 * One window: a title bar that moves it, a corner that resizes it, and a close button. The window
 * answers Escape in the capture phase, so the library's own Escape — which clears the selection —
 * never sees the key: the reader asked for this surface, not for the map.
 */
const GraphWindowItem = (props: {
  window: GraphWindowState
  placement: () => { left: number; top: number }
  title: string
  onRaise: () => void
  onClose: () => void
  onMove: (event: PointerEvent) => void
  onResize: (event: PointerEvent) => void
  render: () => JSX.Element
}) => {
  const i18n = useI18n()
  let element!: HTMLDivElement

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.stopPropagation()
      props.onClose()
    }
    element.addEventListener("keydown", onKeyDown, { capture: true })
    onCleanup(() => element.removeEventListener("keydown", onKeyDown, { capture: true }))
  })

  return (
    <div
      ref={element}
      data-component="session-graph-window"
      data-slot="graph-window"
      data-window-id={props.window.id}
      data-window-kind={props.window.kind}
      role="dialog"
      aria-label={props.title}
      tabindex="0"
      class="pointer-events-auto absolute flex flex-col overflow-hidden rounded-md border border-border-weaker-base bg-surface-base shadow-lg outline-none"
      style={{
        left: `${props.placement().left}px`,
        top: `${props.placement().top}px`,
        width: `${props.window.width}px`,
        height: `${props.window.height}px`,
        "z-index": props.window.z,
      }}
      onPointerDown={props.onRaise}
    >
      <div
        data-slot="graph-window-title"
        class="flex h-8 shrink-0 cursor-grab items-center justify-between gap-2 border-b border-border-weaker-base px-2"
        onPointerDown={props.onMove}
      >
        <span class="truncate text-12-medium text-text-strong">{props.title}</span>
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.window.close")}
          icon="outline-xmark"
          onClick={props.onClose}
        />
      </div>
      <div data-slot="graph-window-body" class="min-h-0 flex-1 overflow-auto">
        {props.render()}
      </div>
      <div
        data-slot="graph-window-resize"
        class="absolute bottom-0 end-0 h-3 w-3 cursor-se-resize"
        onPointerDown={props.onResize}
      />
    </div>
  )
}

/**
 * The window manager. It owns the gestures — move, resize, focus, z-order, Escape — and holds no
 * content of its own. In screen space the pointer's delta *is* the window's delta, so nothing here
 * converts pixels to world units.
 */
export const GraphWindows = (props: GraphWindowsProps) => {
  let stopDrag: (() => void) | undefined
  onCleanup(() => stopDrag?.())

  const update = (id: string, patch: Partial<GraphWindowState>) =>
    props.onChange?.(props.windows.map((window) => (window.id === id ? { ...window, ...patch } : window)))

  /** The front window is the one that answers Escape. */
  const raise = (id: string) => {
    const top = props.windows.reduce((highest, window) => Math.max(highest, window.z), 0)
    const current = props.windows.find((window) => window.id === id)
    if (!current || current.z === top) return
    update(id, { z: top + 1 })
  }

  const beginDrag = (event: PointerEvent, id: string, mode: "move" | "resize") => {
    const start = props.windows.find((window) => window.id === id)
    if (!start) return
    event.preventDefault()
    raise(id)
    const originX = event.clientX
    const originY = event.clientY
    const handle = event.currentTarget as HTMLElement
    handle.setPointerCapture(event.pointerId)

    const move = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - originX
      const dy = moveEvent.clientY - originY
      if (mode === "move") {
        const bounds = props.bounds()
        update(id, {
          left: Math.min(Math.max(0, start.left + dx), Math.max(0, bounds.width - start.width)),
          top: Math.min(Math.max(0, start.top + dy), Math.max(0, bounds.height - start.height)),
        })
        return
      }
      update(id, {
        width: Math.max(GRAPH_WINDOW_MIN_WIDTH, start.width + dx),
        height: Math.max(GRAPH_WINDOW_MIN_HEIGHT, start.height + dy),
      })
    }
    const end = () => {
      handle.releasePointerCapture?.(event.pointerId)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", end)
      stopDrag = undefined
    }
    stopDrag?.()
    stopDrag = end
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", end)
  }

  /** A pinned window rides its node; a free window stays where the reader put it. */
  const placement = (window: GraphWindowState) => {
    if (!window.pinned || !window.nodeID) return { left: window.left, top: window.top }
    const anchor = props.anchorOf?.(window.nodeID)
    if (!anchor) return { left: window.left, top: window.top }
    return { left: anchor.x - window.width / 2, top: anchor.y - window.height / 2 }
  }

  return (
    <div
      data-component="session-graph-windows"
      data-slot="graph-windows"
      class="pointer-events-none absolute inset-0 z-30"
    >
      <For each={props.windows}>
        {(window) => (
          <GraphWindowItem
            window={window}
            placement={() => placement(window)}
            title={props.title(window)}
            onRaise={() => raise(window.id)}
            onClose={() => props.onClose?.(window.id)}
            onMove={(event) => beginDrag(event, window.id, "move")}
            onResize={(event) => beginDrag(event, window.id, "resize")}
            render={() => props.render(window)}
          />
        )}
      </For>
    </div>
  )
}
