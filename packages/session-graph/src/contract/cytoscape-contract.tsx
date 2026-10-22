import { CytoscapeRenderer } from "@spacegraphjs/cytoscape-renderer"
import { onCleanup, onMount } from "solid-js"
import { DARK_THEME } from "../fixtures"
import { ADAPTER_MODEL } from "./fixtures"

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
