import { useI18n } from "@opencode/ui/context/i18n"
import { For, onCleanup, onMount, type JSX } from "solid-js"

export type WindowState = {
  id: string
  kind: string
  nodeID?: string
  left: number
  top: number
  width: number
  height: number
  z: number
  pinned?: boolean
}

const WINDOW_MIN_WIDTH = 240
const WINDOW_MIN_HEIGHT = 160

export type WindowsProps = {
  windows: readonly WindowState[]
  onChange?: (windows: WindowState[]) => void
  onClose?: (id: string) => void
  render: (window: WindowState) => JSX.Element
  title: (window: WindowState) => string
  anchorOf?: (nodeID: string) => { x: number; y: number } | undefined
  bounds: () => { width: number; height: number }
}

const WindowItem = (props: {
  window: WindowState
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
  let focusTrapCleanup: (() => void) | undefined

  const setupFocusTrap = (el: HTMLDivElement) => {
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const getFocusableElements = () => Array.from(el.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return
      const focusable = getFocusableElements()
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        props.onClose()
      }
    }

    el.addEventListener("keydown", handleKeyDown)
    el.addEventListener("keydown", handleEscape, { capture: true })

    const focusable = getFocusableElements()
    if (focusable.length > 0) {
      focusable[0].focus()
    }

    return () => {
      el.removeEventListener("keydown", handleKeyDown)
      el.removeEventListener("keydown", handleEscape, { capture: true })
    }
  }

  onMount(() => {
    focusTrapCleanup = setupFocusTrap(element)
    onCleanup(() => focusTrapCleanup?.())
  })

  return (
    <div
      ref={element}
      data-component="spacegraph-window"
      data-slot="spacegraph-window"
      data-window-id={props.window.id}
      data-window-kind={props.window.kind}
      role="dialog"
      aria-label={props.title}
      tabindex="0"
      class="pointer-events-auto absolute flex flex-col overflow-hidden rounded-md border border-v2-border-border-base bg-v2-background-bg-base shadow-lg outline-none"
      style={{
        "inset-inline-start": `${props.placement().left}px`,
        top: `${props.placement().top}px`,
        width: `${props.window.width}px`,
        height: `${props.window.height}px`,
        "z-index": props.window.z,
      }}
      onPointerDown={props.onRaise}
    >
      <div
        data-slot="spacegraph-window-title"
        class="flex h-8 shrink-0 cursor-grab items-center justify-between gap-2 border-b border-v2-border-border-base px-2"
        onPointerDown={props.onMove}
      >
        <span class="truncate text-12-medium text-text-strong">{props.title}</span>
        <button
          type="button"
          class="rounded-md p-1 text-text-weak hover:bg-v2-overlay-simple-overlay-hover hover:text-text-base"
          onClick={props.onClose}
          aria-label={i18n.t("panel.windowClose")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 4L4 10M4 4L10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div data-slot="spacegraph-window-body" class="min-h-0 flex-1 overflow-auto">
        {props.render()}
      </div>
      <div
        data-slot="spacegraph-window-resize"
        class="absolute bottom-0 inset-inline-end-0 h-3 w-3 cursor-se-resize"
        onPointerDown={props.onResize}
      />
    </div>
  )
}

export const Windows = (props: WindowsProps) => {
  let stopDrag: (() => void) | undefined
  onCleanup(() => stopDrag?.())

  const update = (id: string, patch: Partial<WindowState>) =>
    props.onChange?.(props.windows.map((window) => (window.id === id ? { ...window, ...patch } : window)))

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

    const isRTL = document.documentElement.dir === "rtl"

    const move = (moveEvent: PointerEvent) => {
      let dx = moveEvent.clientX - originX
      const dy = moveEvent.clientY - originY
      if (isRTL) dx = -dx
      if (mode === "move") {
        const bounds = props.bounds()
        update(id, {
          left: Math.min(Math.max(0, start.left + dx), Math.max(0, bounds.width - start.width)),
          top: Math.min(Math.max(0, start.top + dy), Math.max(0, bounds.height - start.height)),
        })
        return
      }
      update(id, {
        width: Math.max(WINDOW_MIN_WIDTH, start.width + dx),
        height: Math.max(WINDOW_MIN_HEIGHT, start.height + dy),
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

  const placement = (window: WindowState) => {
    if (!window.pinned || !window.nodeID) return { left: window.left, top: window.top }
    const anchor = props.anchorOf?.(window.nodeID)
    if (!anchor) return { left: window.left, top: window.top }
    return { left: anchor.x - window.width / 2, top: anchor.y - window.height / 2 }
  }

  return (
    <div
      data-component="spacegraph-windows"
      data-slot="spacegraph-windows"
      class="pointer-events-none absolute inset-0 z-30"
    >
      <For each={props.windows}>
        {(window) => (
          <WindowItem
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