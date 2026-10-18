import { buildFixtureGraph } from "@opencode/session-ui/graph"
import { createSignal } from "solid-js"
import type { RendererID } from "../canvas/renderer-registry"
import { GraphView } from "./GraphView"

const graph = buildFixtureGraph()

type Harness = {
  select: (id: string | undefined) => void
  setRenderer: (id: RendererID) => void
  selected: () => string | undefined
}

// A selected file node on load so the story and its component test see a populated inspector
// without depending on canvas hit-testing.
const INITIAL_SELECTION = "tool:prt_tool_read_1"

const ViewHarness = () => {
  const [renderer, setRenderer] = createSignal<RendererID>("spacegraph")
  const [selected, setSelected] = createSignal<string | undefined>(INITIAL_SELECTION)
  ;(window as unknown as { __graphView?: Harness }).__graphView = {
    select: setSelected,
    setRenderer,
    selected,
  }

  return (
    <div style={{ width: "1100px", height: "640px", display: "flex" }}>
      <GraphView
        model={graph}
        selection={selected()}
        preferredRenderer={renderer()}
        onSelect={setSelected}
        onOpenTranscript={() => undefined}
        onBack={() => undefined}
      />
    </div>
  )
}

export default {
  title: "OpenCode/Session graph/View",
  id: "session-graph-view",
  component: ViewHarness,
}

export const Default = {
  render: () => <ViewHarness />,
}
