import { onCleanup, type Accessor } from "solid-js"

export type UseInspectorResizeOptions = {
  inspectorWidth: Accessor<number>
  setInspectorWidth: (width: number) => void
  rootEl: Accessor<HTMLDivElement | undefined>
}

export type UseInspectorResizeReturn = {
  startResize: (event: PointerEvent) => void
  stopResize: () => void
}

export function useInspectorResize(options: UseInspectorResizeOptions): UseInspectorResizeReturn {
  const { inspectorWidth, setInspectorWidth, rootEl } = options

  let resizeMove: ((event: PointerEvent) => void) | undefined
  let resizeEnd: (() => void) | undefined

  const stopResize = () => {
    if (resizeMove) window.removeEventListener("pointermove", resizeMove)
    if (resizeEnd) window.removeEventListener("pointerup", resizeEnd)
    resizeMove = undefined
    resizeEnd = undefined
  }

  const startResize = (event: PointerEvent) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = inspectorWidth()
    resizeMove = (moveEvent) => {
      const max = Math.max(240, rootEl()?.clientWidth ?? 0 * 0.6)
      setInspectorWidth(Math.min(max, Math.max(220, startWidth - (moveEvent.clientX - startX))))
    }
    resizeEnd = stopResize
    window.addEventListener("pointermove", resizeMove)
    window.addEventListener("pointerup", resizeEnd)
  }

  onCleanup(stopResize)

  return { startResize, stopResize }
}