import { buildFixtureGraph } from "@opencode/session-ui/graph"
import { createSignal } from "solid-js"
import type { DetailMode } from "@opencode/session-ui/graph"
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

  const testHarness = {
    selected: () => selected(),
    select: (id: string | undefined) => setSelected(id),
    setRenderer: (id: RendererID) => setRenderer(id),
    searchOpen: () => false,
    setSearchOpen: () => {},
    legendOpen: () => false,
    setLegendOpen: () => {},
    galleryOpen: () => false,
    setGalleryOpen: () => {},
    groupMenu: () => undefined,
    setGroupMenu: () => {},
    detailMode: () => "panel" as DetailMode,
    setDetailMode: () => {},
    level: () => "execution" as const,
    setLevel: () => {},
  }

  ;(window as unknown as { __graph?: typeof testHarness }).__graph = testHarness
  ;(window as unknown as { __graphA11y?: Harness }).__graphA11y = { selected: testHarness.selected, setRenderer: testHarness.setRenderer }

  return (
    <div style={{ width: "1100px", height: "640px", display: "flex" }}>
      <GraphView model={graph} preferredRenderer={renderer} onSelect={setSelected} onBack={() => undefined} testHarness={testHarness} />
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
