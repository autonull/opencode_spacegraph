import type { Projection, RenderTheme } from "@spacegraphjs/renderer"
import { buildFixtureGraph, type GraphModel, type ZoomLevel } from "@opencode/session-ui/graph"
import { createSignal } from "solid-js"
import type { RendererFactory, RendererID } from "../canvas/renderer-registry"
import { GraphView } from "./GraphView"

const graph = buildFixtureGraph()

/** The fixture has a session root; a truly empty model proves the empty state. */
const EMPTY_MODEL: GraphModel = { root: "session", nodes: [], edges: [], turns: [], turnByMessageID: new Map() }

/** A failing adapter factory pair forces the registry to throw, exercising the error state. */
const FAILING: Partial<Record<RendererID, RendererFactory>> = {
  spacegraph: () => Promise.reject(new Error("spacegraph unavailable")),
  cytoscape: () => Promise.reject(new Error("cytoscape unavailable")),
}

type Harness = {
  select: (id: string | undefined) => void
  setRenderer: (id: RendererID) => void
  selected: () => string | undefined
}

type HarnessProps = {
  model?: GraphModel
  selection?: string
  level?: ZoomLevel
  projection?: Projection
  renderer?: RendererID
  overrides?: Partial<Record<RendererID, RendererFactory>>
  theme?: RenderTheme
  width?: string
  height?: string
}

// A selected tool node on load so the story and its component test see a populated inspector
// without depending on canvas hit-testing.
const INITIAL_SELECTION = "tool:prt_tool_read_1"

const ViewHarness = (props: HarnessProps) => {
  const [renderer, setRenderer] = createSignal<RendererID>(props.renderer ?? "spacegraph")
  const [selected, setSelected] = createSignal<string | undefined>(props.selection)
  ;(window as unknown as { __graphView?: Harness }).__graphView = {
    select: setSelected,
    setRenderer,
    selected,
  }

  return (
    <div style={{ width: props.width ?? "1100px", height: props.height ?? "640px", display: "flex" }}>
      <GraphView
        model={props.model ?? graph}
        selection={selected()}
        level={props.level}
        projection={props.projection}
        preferredRenderer={renderer()}
        rendererOverrides={props.overrides}
        theme={props.theme}
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
  render: () => <ViewHarness selection={INITIAL_SELECTION} />,
}

export const Overview = {
  render: () => <ViewHarness level="overview" />,
}

export const Detail = {
  render: () => <ViewHarness level="detail" selection="result:prt_tool_shell_2" />,
}

export const Projection3D = {
  render: () => <ViewHarness projection="3d" selection={INITIAL_SELECTION} />,
}

export const Cytoscape = {
  render: () => <ViewHarness renderer="cytoscape" selection={INITIAL_SELECTION} />,
}

export const Empty = {
  render: () => <ViewHarness model={EMPTY_MODEL} />,
}

export const Error = {
  render: () => <ViewHarness overrides={FAILING} />,
}

export const Narrow = {
  render: () => <ViewHarness width="390px" height="844px" selection={INITIAL_SELECTION} />,
}
