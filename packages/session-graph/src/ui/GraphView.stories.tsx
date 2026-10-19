import type { DepthMode, Projection, RenderTheme, GraphRenderer } from "@spacegraphjs/renderer"
import { buildFixtureGraph, type GraphModel, type Representation, type ZoomLevel } from "@opencode/session-ui/graph"
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
  /** Zoom to a specific percentage of fit (100% = fit, 150% = 1.5x fit, 250% = 2.5x fit). */
  zoomTo: (percent: number) => void
  /** Pan to center on a specific node ID. */
  panTo: (nodeId: string) => void
  /** Get the current viewport for verification. */
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
  // On-demand turn diffs: nothing is available until a diff node is inspected and calls `load`.
  const [diffLoaded, setDiffLoaded] = createSignal(false)
  const diffSource: GraphDiffSource = {
    get: (from) => (diffLoaded() && from === "msg_user_1" ? FIXTURE_DIFFS : undefined),
    load: (from) => {
      if (from === "msg_user_1") setDiffLoaded(true)
    },
  }

  // Store the live renderer instance for zoom/pan control
  let graphRenderer: import("@spacegraphjs/renderer").GraphRenderer | undefined

  ;(window as unknown as { __graphView?: Harness }).__graphView = {
    select: setSelected,
    setRenderer,
    selected,
    zoomTo: (percent: number) => {
      if (graphRenderer) {
        const viewport = graphRenderer.getViewport?.()
        if (viewport) {
          // Convert percentage to zoom value (100% = fit = viewport.zoom at fit)
          // The zoom is relative to the fit baseline stored in GraphView
          graphRenderer.setViewport({ zoom: viewport.zoom * (percent / 100), center: viewport.center })
        }
      }
    },
    panTo: (nodeId: string) => {
      if (graphRenderer) {
        graphRenderer.focus(nodeId)
      }
    },
    getViewport: () => {
      if (graphRenderer) {
        return graphRenderer.getViewport?.()
      }
      return undefined
    },
  }

  const size = props.fullscreen
    ? { width: "100vw", height: "100vh" }
    : { width: props.width ?? "1100px", height: props.height ?? "640px" }

  return (
    <div style={{ ...size, display: "flex" }}>
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
