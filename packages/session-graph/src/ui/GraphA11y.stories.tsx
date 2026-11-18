import { buildFixtureGraph } from "@opencode/session-ui/graph"
import { createSignal } from "solid-js"
import type { RendererID } from "../canvas/renderer-registry"
import { GraphView } from "./GraphView"

const graph = buildFixtureGraph()

type Harness = {
  selected: () => string | undefined
  setRenderer: (id: RendererID) => void
}

// Uncontrolled so the keyboard mirror drives GraphView's own selection; the harness only observes.
const A11yHarness = () => {
  const [renderer, setRenderer] = createSignal<RendererID>("spacegraph")
  const [selected, setSelected] = createSignal<string | undefined>()
  ;(window as unknown as { __graphA11y?: Harness }).__graphA11y = { selected, setRenderer }

  return (
    <div style={{ width: "1100px", height: "640px", display: "flex" }}>
      <GraphView model={graph} preferredRenderer={renderer()} onSelect={setSelected} onBack={() => undefined} />
    </div>
  )
}

export default {
  title: "OpenCode/Session graph/Accessibility",
  id: "session-graph-a11y",
  component: A11yHarness,
}

export const Default = {
  render: () => <A11yHarness />,
}
