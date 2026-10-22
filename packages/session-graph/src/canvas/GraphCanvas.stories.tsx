import { buildFixtureGraph, layoutGraph } from "@opencode/session-ui/graph"
import { createSignal } from "solid-js"
import { DARK_THEME } from "../fixtures"
import { buildRenderModel } from "./buildRenderModel"
import { GraphCanvas, type GraphCanvasReady } from "./GraphCanvas"
import type { RendererID } from "./renderer-registry"

const graph = buildFixtureGraph()
const model = buildRenderModel(graph, { level: "execution", positions: layoutGraph(graph).positions })

type Harness = {
  setRenderer: (id: RendererID) => void
  setSelection: (ids: string[]) => void
  ready?: GraphCanvasReady
}

const CanvasHarness = () => {
  const [renderer, setRenderer] = createSignal<RendererID>("spacegraph")
  const [selection, setSelection] = createSignal<readonly string[]>([])
  const harness: Harness = {
    setRenderer: (id) => setRenderer(id),
    setSelection: (ids) => setSelection(ids),
  }

  ;(window as unknown as { __sessionGraphCanvas?: Harness }).__sessionGraphCanvas = harness

  return (
    <div style={{ width: "960px", height: "600px", border: "1px solid var(--v2-border, #333)", overflow: "hidden" }}>
      <GraphCanvas
        model={model}
        theme={DARK_THEME}
        projection="2d"
        selection={selection()}
        preferredRenderer={renderer()}
        onReady={(info) => {
          harness.ready = info
        }}
      />
    </div>
  )
}

export default {
  title: "OpenCode/Session graph/Canvas",
  id: "session-graph-canvas",
  component: CanvasHarness,
}

export const Default = {
  render: () => <CanvasHarness />,
}
