import { onCleanup, onMount } from "solid-js"
import { SpaceGraph, type GraphSpec } from "spacegraphjs/activity"

export const SPIKE_NODE_COUNT = 8

const CARD_WIDTH = 176
const CARD_HEIGHT = 84
const COLUMNS = 4
const COLUMN_GAP = 260
const ROW_GAP = 200

const card = (index: number, label: string, detail: string) => `
  <div style="display:flex;flex-direction:column;gap:6px;padding:10px 12px;font-family:system-ui,sans-serif">
    <span style="font-size:12px;font-weight:600;color:#e8e8ef">${label}</span>
    <span style="font-size:11px;color:#9aa0b4">${detail}</span>
  </div>`

const nodePosition = (index: number): [number, number, number] => [
  ((index % COLUMNS) - (COLUMNS - 1) / 2) * COLUMN_GAP,
  (0.5 - Math.floor(index / COLUMNS)) * ROW_GAP,
  0,
]

const spikeSpec = (): GraphSpec => ({
  nodes: Array.from({ length: SPIKE_NODE_COUNT }, (_, index) => ({
    id: `spike-${index}`,
    type: "HtmlNode",
    label: `Node ${index + 1}`,
    position: nodePosition(index),
    data: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      backgroundColor: index % 3 === 2 ? "rgba(64, 96, 180, 0.92)" : "rgba(38, 40, 56, 0.94)",
      showControls: false,
      html: card(index, `Node ${index + 1}`, `step ${index + 1} of ${SPIKE_NODE_COUNT}`),
    },
  })),
  edges: Array.from({ length: SPIKE_NODE_COUNT - 1 }, (_, index) => ({
    id: `spike-edge-${index}`,
    source: `spike-${index}`,
    target: `spike-${index + 1}`,
    type: "CurvedEdge",
  })),
})

export const GraphSpike = () => {
  let host!: HTMLDivElement
  let graph: SpaceGraph | undefined
  let disposed = false

  onMount(() => {
    SpaceGraph.create(host, spikeSpec())
      .then((sg) => {
        if (disposed) {
          sg.dispose()
          return
        }
        graph = sg
        sg.fitView(72)
        host.dataset.graphReady = "true"
        host.dataset.graphNodes = String(sg.nodeCount)
        host.dataset.graphEdges = String(sg.edgeCount)
      })
      .catch((error: unknown) => {
        host.dataset.graphError = error instanceof Error ? error.message : String(error)
      })
  })

  onCleanup(() => {
    disposed = true
    graph?.dispose()
    graph = undefined
  })

  return (
    <div
      ref={host}
      data-component="session-graph-spike"
      data-graph-ready="false"
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
    />
  )
}
