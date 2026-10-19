import { CytoscapeRenderer } from "@spacegraphjs/cytoscape-renderer"
import { onCleanup, onMount } from "solid-js"
import { ADAPTER_MODEL, ADAPTER_THEME } from "./fixtures"

/** Dark theme matching the app's dark mode tokens for consistent captures. */
const DARK_THEME: typeof ADAPTER_THEME = {
  background: "#101014",
  surface: "#1b1b22",
  surfaceMuted: "#2a2a33",
  text: "#f5f5f7",
  textMuted: "#a0a0aa",
  border: "#3a3a44",
  accent: "#3b82f6",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  edge: "#6b7280",
  edgeMuted: "#4b5563",
  selection: "#60a5fa",
  focus: "#93c5fd",
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
}

export const CytoscapeContract = () => {
  let host!: HTMLDivElement
  let renderer: CytoscapeRenderer | undefined
  let disposed = false

  onMount(() => {
    renderer = new CytoscapeRenderer()
    renderer
      .mount(host, { theme: DARK_THEME, projection: "2d" })
      .then(() => {
        if (disposed) {
          renderer?.dispose()
          return
        }
        renderer!.setModel(ADAPTER_MODEL)
        renderer!.setSelection(["dot-1"])
        host.dataset.graphReady = "true"
        host.dataset.graphRenderer = "cytoscape"
        host.dataset.graphNodes = String(ADAPTER_MODEL.nodes.length)
        host.dataset.graphEdges = String(ADAPTER_MODEL.edges.length)
        host.dataset.graphCards = String(host.querySelectorAll('[data-slot="cytoscape-card"]').length)
        ;(host.ownerDocument.defaultView as unknown as Record<string, unknown>).__sessionGraphCytoscape = renderer
      })
      .catch((error: unknown) => {
        host.dataset.graphError = error instanceof Error ? error.message : String(error)
      })
  })

  onCleanup(() => {
    disposed = true
    renderer?.dispose()
    renderer = undefined
    const win = host?.ownerDocument?.defaultView as unknown as Record<string, unknown> | undefined
    if (win) win.__sessionGraphCytoscape = undefined
  })

  return (
    <div
      ref={host}
      data-component="session-graph-cytoscape"
      data-graph-ready="false"
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
    />
  )
}
