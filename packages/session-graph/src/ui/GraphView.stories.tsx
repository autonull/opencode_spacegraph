import type { Projection, RenderTheme } from "@spacegraphjs/renderer"
import { buildFixtureGraph, type GraphModel, type ZoomLevel } from "@opencode/session-ui/graph"
import { createSignal } from "solid-js"
import type { RendererFactory, RendererID } from "../canvas/renderer-registry"
import type { GraphDiffSource } from "./GraphDiff"
import { GraphView } from "./GraphView"

const graph = buildFixtureGraph()

/** A turn's changed-file diffs, loaded on demand when the diff node is inspected (RF.8). */
const FIXTURE_DIFFS = [
  {
    file: "src/auth/session.ts",
    patch: "@@ -1,3 +1,4 @@\n import { guard } from \"./guards\"\n+export const ttl = 60\n export function session() {}",
    additions: 1,
    deletions: 0,
    status: "modified" as const,
  },
  {
    file: "src/auth/token.ts",
    patch: "@@ -0,0 +1,2 @@\n+export const token = \"\"\n+export const refresh = () => token",
    additions: 2,
    deletions: 0,
    status: "added" as const,
  },
]

/** The fixture has a session root; a truly empty model proves the empty state. */
const EMPTY_MODEL: GraphModel = { root: "session", nodes: [], edges: [], turns: [], turnByMessageID: new Map() }

/** A failing adapter factory pair forces the registry to throw, exercising the error state. */
const FAILING: Partial<Record<RendererID, RendererFactory>> = {
  spacegraph: () => Promise.reject(new Error("spacegraph unavailable")),
  cytoscape: () => Promise.reject(new Error("cytoscape unavailable")),
}

/** A mount that never settles keeps the canvas in its loading skeleton without an error. */
const PENDING: Partial<Record<RendererID, RendererFactory>> = {
  spacegraph: () => new Promise(() => {}),
  cytoscape: () => new Promise(() => {}),
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
  // On-demand turn diffs: nothing is available until a diff node is inspected and calls `load`.
  const [diffLoaded, setDiffLoaded] = createSignal(false)
  const diffSource: GraphDiffSource = {
    get: (from) => (diffLoaded() && from === "msg_user_1" ? FIXTURE_DIFFS : undefined),
    load: (from) => {
      if (from === "msg_user_1") setDiffLoaded(true)
    },
  }
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
        diffSource={diffSource}
        renderSummary={(node) =>
          node.kind === "message" || node.kind === "reasoning" ? (
            <div data-slot="test-summary">{node.summary}</div>
          ) : undefined
        }
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

/** Nothing selected at mount, like the app before the user interacts. */
export const NoSelection = {
  render: () => <ViewHarness level="execution" />,
}

export const Detail = {
  render: () => <ViewHarness level="detail" selection="result:prt_tool_shell_2" />,
}

/** A turn's diff node: the changed files load on demand through the host diff source (RF.8). */
export const Diff = {
  render: () => <ViewHarness level="execution" selection="diff:msg_idle_1" />,
}

/** An assistant message renders its summary through the host renderer (Markdown in the app, RF.8). */
export const MarkdownSummary = {
  render: () => <ViewHarness level="execution" selection="msg_plan_1:text:0" />,
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

export const Loading = {
  render: () => <ViewHarness overrides={PENDING} />,
}

export const Narrow = {
  render: () => <ViewHarness width="390px" height="844px" selection={INITIAL_SELECTION} />,
}

/** A tool node with long output proves the inspector scrolls rather than growing the panel. */
const LONG_OUTPUT_MODEL: GraphModel = {
  root: "session",
  nodes: [
    {
      id: "session",
      kind: "session",
      label: "Session",
      status: "neutral",
      minLevel: "overview",
      summary: "Fix the authentication test failures",
    },
    {
      id: "tool:long",
      kind: "tool",
      label: "shell",
      status: "failed",
      messageID: "msg_long",
      minLevel: "execution",
      data: {
        name: "shell",
        category: "verify",
        exit: 1,
        input: {
          command: "bun test packages/session-ui",
          lines: Array.from({ length: 120 }, (_, index) => `line ${index}: expected 1 to equal 2`),
        },
      },
    },
  ],
  edges: [{ id: "e1", kind: "part-of", source: "tool:long", target: "session", confidence: "explicit" }],
  turns: [],
  turnByMessageID: new Map(),
}

export const LongOutput = {
  render: () => <ViewHarness model={LONG_OUTPUT_MODEL} selection="tool:long" level="execution" />,
}
