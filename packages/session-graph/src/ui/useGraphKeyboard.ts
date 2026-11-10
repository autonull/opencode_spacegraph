import { onMount, onCleanup } from "solid-js"
import { attachKeyboardShortcuts } from "./graph-utils"
import type { GraphViewData } from "@opencode/session-ui/graph"
import { neighborStep } from "@opencode/session-ui/graph"
import type { UseGraphAnnotationsReturn } from "./useGraphAnnotations"
import type { UseGraphSelectionReturn } from "./useGraphSelection"
import { registerGraphBus, setActiveGraphInstance } from "./graph-router"
import { createGraphBus } from "./graph-bus"

export type UseGraphKeyboardOptions = {
  model: () => GraphViewData
  selection: () => readonly string[]
  onSelect: (id: string | undefined, add?: boolean) => void
  camera: { fitContent: () => void; frameReadable: (id: string) => void; zoomBy: (delta: number) => void; pending: () => boolean }
  annotations: UseGraphAnnotationsReturn
  graphSelection: UseGraphSelectionReturn
  groupCollapse: ReturnType<typeof import("./useGroupCollapse").useGroupCollapse>
  openWindow: (kind: string, nodeID?: string) => void
  setFindInitialTab: (tab: "search" | "filters" | "outline") => void
  openSearch: (initial?: string) => void
  setLevel: (level: "overview" | "execution" | "detail") => void
  setGroupMenu: (menu: { id: string; x: number; y: number } | undefined) => void
  groupMenu: () => { id: string; x: number; y: number } | undefined
  dismissDetail: () => void
  undoManual: () => void
  redoManual: () => void
  onGroupToggle: (id: string) => void
  /** Unique instance ID for this graph. */
  instanceId: string
  /** Whether this instance is the active one (has pointer/focus). */
  isActiveInstance: () => boolean
  /** Set whether this instance is active. */
  setActiveInstance: (active: boolean) => void
}

export function useGraphKeyboard(options: UseGraphKeyboardOptions) {
  const {
    model,
    selection,
    onSelect,
    camera,
    annotations,
    groupCollapse,
    openWindow,
    setFindInitialTab,
    openSearch,
    setLevel,
    setGroupMenu,
    groupMenu,
    dismissDetail,
    undoManual,
    redoManual,
    onGroupToggle,
    instanceId,
    isActiveInstance,
    setActiveInstance,
  } = options

  // Create and register the bus for this instance
  const bus = createGraphBus(instanceId)
  onMount(() => {
    const unregister = registerGraphBus(bus)
    onCleanup(unregister)
  })

  // Track pointer/focus to become active instance
  onMount(() => {
    const handlePointerDown = () => {
      if (!isActiveInstance()) {
        setActiveGraphInstance(instanceId)
        setActiveInstance(true)
      }
    }
    const handleFocus = () => {
      if (!isActiveInstance()) {
        setActiveGraphInstance(instanceId)
        setActiveInstance(true)
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true)
    document.addEventListener("focusin", handleFocus, true)
    onCleanup(() => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
      document.removeEventListener("focusin", handleFocus, true)
    })
  })

  // Subscribe to bus commands (only active instance receives them)
  onMount(() => {
    const unsubscribe = bus.on((name, payload) => {
      // Only handle commands if we're the active instance
      if (!isActiveInstance()) return

      if (name === "why" || name === "led-here" || name === "related") {
        annotations.startTrace(name, payload?.source)
        return
      }
      if (name === "compare") {
        // compareSelectedTurns would need to be passed in
        return
      }
      if (name === "note") {
        annotations.openNoteComposer()
        return
      }
      if (name === "failureProgress") {
        openWindow("failureProgress")
        return
      }
      if (name === "find") {
        openWindow("find")
        return
      }
    })
    onCleanup(unsubscribe)
  })

  // Global shortcuts (Shift+F, Shift+O, Alt+f) - only work when this instance is active
  onMount(() => {
    const cleanupShortcuts = attachKeyboardShortcuts([
      { key: "F", shift: true, handler: () => { if (isActiveInstance()) openWindow("failureProgress") } },
      { key: "O", shift: true, handler: () => { if (isActiveInstance()) { setFindInitialTab("outline"); openWindow("find") } } },
      { key: "f", alt: true, handler: () => { if (isActiveInstance()) { setFindInitialTab("filters"); openWindow("find") } } },
    ])
    onCleanup(cleanupShortcuts)
  })

  // RF.10: a small keyboard map on the canvas region
  const handleRegionKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null

    if (target?.closest("[data-slot='graph-a11y'], input, textarea, [contenteditable]")) return

    // Band keyboard access: when a band is focused, Enter/Space toggles it
    const bandEl = target?.closest("[data-band]")
    if (bandEl && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault()
      const clusterId = bandEl.getAttribute("data-cluster-id")
      if (clusterId) {
        onGroupToggle(clusterId)
      }
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      if (groupMenu()) {
        setGroupMenu(undefined)
        return
      }
      dismissDetail()
      return
    }

    // Trace keyboard shortcuts (A1): w=Why, e=Led-here, r=Related, [/]=step lit nodes
    const selectionId = selection()[0]
    if (selectionId) {
      if (event.key === "n") {
        event.preventDefault()
        annotations.openNoteComposer()
        return
      }
      if (event.key === "Enter" && groupCollapse.selectedGroup()) {
        event.preventDefault()
        groupCollapse.toggleGroup()
        return
      }
      if (event.key === "w") {
        event.preventDefault()
        annotations.startTrace("why", selectionId)
        return
      }
      if (event.key === "e") {
        event.preventDefault()
        annotations.startTrace("led-here", selectionId)
        return
      }
      if (event.key === "r") {
        event.preventDefault()
        annotations.startTrace("related", selectionId)
        return
      }
      if (event.key === "[" || event.key === "]") {
        event.preventDefault()
        const delta = event.key === "[" ? -1 : 1
        const overlay = annotations.traceOverlay()
        if (overlay) {
          const next = annotations.stepLitNode(delta)
          if (next) onSelect(next)
        } else {
          const next = neighborStep(model(), selectionId, delta)
          if (next) onSelect(next)
        }
        return
      }
    }

    if (event.key === "/") {
      event.preventDefault()
      openSearch()
      return
    }

    if (event.key === "g") {
      event.preventDefault()
      openSearch("g ")
      return
    }

    if (event.key === "f") {
      event.preventDefault()
      camera.fitContent()
      return
    }

    if (event.key === "1" || event.key === "2" || event.key === "3") {
      const level = { "1": "overview", "2": "execution", "3": "detail" }[event.key] as "overview" | "execution" | "detail"
      event.preventDefault()
      setLevel(level)
      return
    }

    // V115: Undo/redo for manual positions (z / Z)
    if ((event.key === "z" || event.key === "Z") && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      if (event.shiftKey || event.key === "Z") {
        redoManual()
      } else {
        undoManual()
      }
      return
    }
  }

  return { handleRegionKeyDown }
}