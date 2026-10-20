import type { DepthMode, Projection, RenderTheme, GraphRenderer } from "@spacegraphjs/renderer"
import {
  buildFixtureGraph,
  buildFixtureMessages,
  buildGraph,
  type GraphEdge,
  type GraphModel,
  type GraphNode,
  type Representation,
  type ZoomLevel,
} from "@opencode/session-ui/graph"
import { createSignal } from "solid-js"
import type { RendererFactory, RendererID } from "../canvas/renderer-registry"
import type { GraphDiffSource } from "./GraphDiff"
import { GraphView } from "./GraphView"

const graph = buildFixtureGraph()

/** Dark theme matching the app's dark mode tokens for consistent captures. */
const DARK_THEME: RenderTheme = {
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

/**
 * T6.6: a session long enough to hit the drawn window. The map shows its recent tail and says how
 * much of the session it left out, so a capped view is never a silent one.
 */
const SCALE_MODEL: GraphModel = (() => {
  const nodes: GraphNode[] = [
    { id: "session", kind: "session", label: "Session", status: "neutral", minLevel: "overview" },
  ]
  const edges: GraphEdge[] = []
  const turns: string[] = []

  for (let index = 0; index < 80; index++) {
    const turnID = `turn:msg_user_${index}`

    turns.push(turnID)
    nodes.push({
      id: turnID,
      kind: "turn",
      label: `Turn ${index + 1}`,
      status: "neutral",
      turnID,
      minLevel: "overview",
    })

    const toolID = `tool:prt_tool_${index}`

    nodes.push({
      id: toolID,
      kind: "tool",
      label: "read",
      summary: `src/module${index % 12}/file${index}.ts`,
      status: "success",
      turnID,
    })
    edges.push({
      id: `sequence:${turnID}->${toolID}`,
      kind: "sequence",
      source: turnID,
      target: toolID,
      confidence: "explicit",
    })
  }

  return { root: "session", nodes, edges, turns, turnByMessageID: new Map() }
})()

/**
 * T6.5: a session that was forked from another one. The attribution rides on the root node, so the
 * inspector can name where this session came from and offer to open it.
 */
const FORKED_MODEL: GraphModel = buildGraph(buildFixtureMessages(), { type: "idle" }, "ses_abc", {
  forkedFrom: { sessionID: "ses_origin", boundary: { type: "through", messageID: "msg_user_1" } },
})

/**
 * T6.5: a compaction that replayed the provider's replacement window instead of leaving a summary.
 * The node says which one it was, so the reader knows what the agent could still see.
 */
const COMPACTED_MODEL: GraphModel = buildGraph(
  [
    ...buildFixtureMessages().slice(0, 2),
    {
      id: "msg_compact_1",
      type: "compaction",
      status: "completed",
      reason: "auto",
      summary: "",
      native: { messages: [{ role: "user", content: "earlier work" }] },
      time: { created: 3 },
    },
  ],
  { type: "idle" },
)

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
  /** The camera's frame, read back from the renderer (T6.18). */
  getViewport: () => { zoom: number; center: number[] } | undefined
}

type HarnessProps = {
  model?: GraphModel
  selection?: string
  level?: ZoomLevel
  projection?: Projection
  depth?: DepthMode
  representation?: Representation
  /** LE.12: open the changed-files rail on mount. */
  files?: boolean
  renderer?: RendererID
  overrides?: Partial<Record<RendererID, RendererFactory>>
  theme?: RenderTheme
  width?: string
  height?: string
  /** LE.5: fill the story viewport so the capture matches the app's canvas size. */
  fullscreen?: boolean
}

// A selected tool node on load so the story and its component test see a populated inspector
// without depending on canvas hit-testing.
const INITIAL_SELECTION = "tool:prt_tool_read_1"

const ViewHarness = (props: HarnessProps) => {
  const [renderer, setRenderer] = createSignal<RendererID>(props.renderer ?? "spacegraph")
  const [selected, setSelected] = createSignal<string | undefined>(props.selection)
  // T6.5: the session the reader asked to open, recorded in the DOM so a component test can see it.
  const [openedSession, setOpenedSession] = createSignal<string | undefined>()
  // On-demand turn diffs: nothing is available until a diff node is inspected and calls `load`.
  const [diffLoaded, setDiffLoaded] = createSignal(false)
  const diffSource: GraphDiffSource = {
    get: (from) => (diffLoaded() && from === "msg_user_1" ? FIXTURE_DIFFS : undefined),
    load: (from) => {
      if (from === "msg_user_1") setDiffLoaded(true)
    },
  }

  // The live renderer, so a test can read the camera back (T6.18).
  let graphRenderer: GraphRenderer | undefined

  ;(window as unknown as { __graphView?: Harness }).__graphView = {
    select: setSelected,
    setRenderer,
    selected,
    getViewport: () => graphRenderer?.getViewport?.(),
  }

  const size = props.fullscreen
    ? { width: "100vw", height: "100vh" }
    : { width: props.width ?? "1100px", height: props.height ?? "640px" }

  return (
    <div style={{ ...size, display: "flex" }} data-opened-session={openedSession()}>
      <GraphView
        model={props.model ?? graph}
        selection={selected()}
        level={props.level}
        projection={props.projection}
        depth={props.depth}
        representation={props.representation}
        files={props.files}
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
        onOpenSession={setOpenedSession}
        onBack={() => undefined}
        onRenderer={(r) => {
          graphRenderer = r
        }}
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

/** Fills the browser viewport, so a component test can assert layout at real window sizes. */
export const Fullscreen = {
  render: () => <ViewHarness selection={INITIAL_SELECTION} fullscreen />,
  parameters: { layout: "fullscreen" },
}

export const Overview = {
  render: () => <ViewHarness level="overview" />,
}

/** A file selected while overview hides it: the breadcrumb path and the show affordance must explain it. */
export const OverviewSelection = {
  render: () => <ViewHarness level="overview" selection="file:src/auth/token.ts" />,
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

/** LE.14: the 2.5D `layered` treatment — a shallow camera with a subtle depth fade. */
export const Layered = {
  render: () => <ViewHarness depth="layered" selection={INITIAL_SELECTION} />,
}

/** LE.14: `depth-stack` separates the hierarchy Z under a steeper camera with a stronger fade. */
export const DepthStack = {
  render: () => <ViewHarness depth="depth-stack" selection={INITIAL_SELECTION} />,
}

/** LE.8: the turn ribbon — one horizontal bar of phase segments per turn. */
export const Ribbon = {
  render: () => <ViewHarness representation="ribbon" />,
}

/** LE.9: the turn matrix — turns as rows, phase categories as columns. */
export const Matrix = {
  render: () => <ViewHarness representation="matrix" />,
}

/** LE.12: the file-first lens — the changed-files rail with bundled provenance edges. */
export const Files = {
  render: () => <ViewHarness files={true} selection="file:src/auth/token.ts" />,
}

export const Cytoscape = {
  render: () => <ViewHarness renderer="cytoscape" selection={INITIAL_SELECTION} fullscreen theme={DARK_THEME} />,
  parameters: { layout: "fullscreen" },
}

export const Empty = {
  render: () => <ViewHarness model={EMPTY_MODEL} />,
}

/** T6.6: a long session, so the drawn window and its notice are visible. */
export const Scale = {
  render: () => <ViewHarness model={SCALE_MODEL} level="overview" fullscreen />,
  parameters: { layout: "fullscreen" },
}

/** T6.5: the delegated child session, so the inspector can offer to open it. */
export const ChildSession = {
  render: () => <ViewHarness selection="sub:ses_child_auth" />,
}

/** T6.5: a session forked from another one, so its origin is named and reachable. */
export const ForkedSession = {
  render: () => <ViewHarness model={FORKED_MODEL} selection="session" />,
}

/** T6.5: a compaction that replayed the provider's window instead of leaving a summary. */
export const Compacted = {
  render: () => <ViewHarness model={COMPACTED_MODEL} selection="msg:msg_compact_1" />,
}

export const ErrorState = {
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

/**
 * T6.7 — hostile content in a label, a summary and a tool command. The card markup is injected with
 * `innerHTML` by the renderer, so this story is the end-to-end proof that escaping holds.
 */
const HOSTILE_MODEL: GraphModel = {
  root: "session",
  nodes: [
    { id: "session", kind: "session", label: "Session", status: "neutral", minLevel: "overview" },
    { id: "turn:hostile", kind: "turn", label: "Turn 1", status: "success", minLevel: "overview" },
    {
      id: "tool:hostile",
      kind: "tool",
      label: "<script>window.__xss = 1</script>",
      summary: '<img src=x onerror="window.__xss = 1">',
      status: "success",
      turnID: "turn:hostile",
      minLevel: "execution",
      data: { name: "shell", input: { command: "echo <script>window.__xss = 1</script>" } },
    },
  ],
  edges: [
    { id: "e1", kind: "part-of", source: "turn:hostile", target: "session", confidence: "structural" },
    { id: "e2", kind: "sequence", source: "tool:hostile", target: "turn:hostile", confidence: "explicit" },
  ],
  turns: ["turn:hostile"],
  turnByMessageID: new Map(),
}

export const Hostile = {
  render: () => <ViewHarness model={HOSTILE_MODEL} selection="tool:hostile" level="execution" />,
}
