import { createSignal, createMemo, For, Show } from "solid-js"
import { PluginStory } from "../../stories/src/plugin"
import type { Meta, StoryObj } from "@storybook/web-components"
import { MapSurface } from "./map-surface"
import { HybridSurface } from "./hybrid-surface"
import { TurnMapLayer } from "./turn-map-layer"
import { Inspector } from "./Inspector"
import { Windows } from "./Windows"
import type { WindowState } from "./Windows"
import type { SpacegraphModel } from "./model"

const meta: Meta = {
  title: "Plugins/Spacegraph",
  component: "spacegraph",
  decorators: [
    (story) => (
      <PluginStory file="../../gui-plugins/src/spacegraph/index.ts">
        {story()}
      </PluginStory>
    ),
  ],
}

export default meta

function createMockModel() {
  const [focused, setFocused] = createSignal<string | undefined>("node-1")
  const [level, setLevel] = createSignal<"overview" | "execution" | "detail">("overview")
  const [layout, setLayout] = createSignal<"lanes" | "timeline" | "hierarchy" | "tree" | "force">("lanes")
  const [depth, setDepth] = createSignal<"flat" | "layered" | "depth-stack" | "orbit">("flat")
  const [arrangement, setArrangement] = createSignal<"stacked" | "side" | "floating">("side")
  const [side, setSide] = createSignal<"start" | "end">("end")
  const [turnMap, setTurnMap] = createSignal(false)

  const nodes = [
    { id: "node-1", label: "Read src/auth/session.ts", kind: "tool", summary: "Read file", provenance: { source: "tree", confidence: "explicit", asOf: Date.now() } },
    { id: "node-2", label: "Write src/auth/token.ts", kind: "tool", summary: "Write file", provenance: { source: "tree", confidence: "explicit", asOf: Date.now() } },
    { id: "node-3", label: "Grep for 'session'", kind: "tool", summary: "Search", provenance: { source: "tree", confidence: "explicit", asOf: Date.now() } },
    { id: "node-4", label: "src/auth/session.ts", kind: "file", summary: "Authentication module" },
    { id: "node-5", label: "src/auth/token.ts", kind: "file", summary: "Token management" },
  ]

  return {
    focused,
    focus: (session: unknown, id: string) => setFocused(id),
    level: () => level(),
    layout: () => layout(),
    depth: () => depth(),
    setDepth: (_: unknown, d: "flat" | "layered" | "depth-stack" | "orbit") => setDepth(d),
    arrangement: () => arrangement(),
    side: () => side(),
    setArrangement: (_: unknown, a: "stacked" | "side" | "floating") => setArrangement(a),
    setSide: (_: unknown, s: "start" | "end") => setSide(s),
    turnMap: () => turnMap(),
    toggleTurnMap: (_: unknown) => setTurnMap((t) => !t),
    closeTurnMap: (_: unknown) => setTurnMap(false),
    cycleLevel: (_: unknown) => setLevel((l) => (l === "overview" ? "execution" : l === "execution" ? "detail" : "overview")),
    cycleLayout: (_: unknown) => setLayout((l) => {
      const order = ["lanes", "timeline", "hierarchy", "tree", "force"]
      return order[(order.indexOf(l) + 1) % order.length]
    }),
    cycleArrangement: (_: unknown) => setArrangement((a) => {
      const order = ["stacked", "side", "floating"] as const
      return order[(order.indexOf(a) + 1) % order.length]
    }),
    toggleSide: (_: unknown) => setSide((s) => (s === "start" ? "end" : "start")),
    surface: () => "spacegraph.map",
    select: (_: unknown, id: string) => setFocused(id),
    export: () => {},
  } satisfies SpacegraphModel
}

function createMockSession() {
  return {
    id: "session-1",
    key: "test\ntest",
    server: {
      data: {
        session: {
          status: () => "idle",
          message: {
            list: () => [],
          },
          get: () => ({ title: "Test Session" }),
        },
      },
    },
  }
}

function createMockScreen() {
  return {
    transcript: {
      activeMessageID: () => undefined,
      reveal: (messageID: string, partID?: string) => console.log("reveal", messageID, partID),
    },
  }
}

function Transcript() {
  return (
    <div data-testid="transcript" style={{ height: "200px", overflow: "auto", background: "var(--v2-background-bg-base)" }}>
      <div style={{ height: "800px", padding: "16px" }}>
        <h4 style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 500 }}>Transcript Content</h4>
        <div style={{ fontSize: "13px", lineHeight: "1.5", color: "var(--v2-text-text-base)" }}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        </div>
      </div>
    </div>
  )
}

export const MapSurfaceStory: StoryObj = {
  render: () => {
    const model = createMockModel()
    const session = createMockSession()
    const screen = createMockScreen()
    return <MapSurface model={model} session={session} screen={screen} transcript={<Transcript />} />
  },
}

export const HybridSurfaceStacked: StoryObj = {
  render: () => {
    const model = createMockModel()
    const session = createMockSession()
    const screen = createMockScreen()
    // Force stacked arrangement
    Object.assign(model, { arrangement: () => "stacked" })
    return <HybridSurface model={model} session={session} screen={screen} transcript={<Transcript />} />
  },
}

export const HybridSurfaceSide: StoryObj = {
  render: () => {
    const model = createMockModel()
    const session = createMockSession()
    const screen = createMockScreen()
    Object.assign(model, { arrangement: () => "side", side: () => "end" })
    return <HybridSurface model={model} session={session} screen={screen} transcript={<Transcript />} />
  },
}

export const HybridSurfaceFloating: StoryObj = {
  render: () => {
    const model = createMockModel()
    const session = createMockSession()
    const screen = createMockScreen()
    Object.assign(model, { arrangement: () => "floating", side: () => "end" })
    return <HybridSurface model={model} session={session} screen={screen} transcript={<Transcript />} />
  },
}

export const TurnMapLayerStory: StoryObj = {
  render: () => {
    const model = createMockModel()
    const session = createMockSession()
    const screen = createMockScreen()
    Object.assign(model, { turnMap: () => true })
    return (
      <TurnMapLayer
        model={model}
        session={session}
        screen={screen}
        surface={{ id: "spacegraph.map", title: "Map", order: 10, render: () => null, layers: [] }}
        labels={{
          title: "This turn",
          open: "Open full map",
          close: "Close turn map",
          empty: "No turn to show yet",
        }}
        openFull={() => console.log("open full map")}
      />
    )
  },
}

export const InspectorStory: StoryObj = {
  render: () => {
    const model = createMockModel()
    return (
      <div style={{ width: "300px", height: "400px", border: "1px solid var(--v2-border-border-base)" }}>
        <Inspector
          model={{
            nodes: [
              { id: "node-1", label: "Read src/auth/session.ts", kind: "tool", summary: "Read file content", provenance: { source: "tree", confidence: "explicit", asOf: Date.now() } },
              { id: "node-2", label: "Write src/auth/token.ts", kind: "tool", summary: "Write file content", provenance: { source: "tree", confidence: "explicit", asOf: Date.now() } },
            ],
            edges: [],
            activeTurn: "turn-1",
            turnByMessageID: new Map(),
          }}
          node={{ id: "node-1", label: "Read src/auth/session.ts", kind: "tool", summary: "Read file content", provenance: { source: "tree", confidence: "explicit", asOf: Date.now() } }}
          onSelect={(id) => console.log("focus", id)}
          onOpenTranscript={(messageID, partID) => console.log("reveal", messageID, partID)}
        />
      </div>
    )
  },
}

export const InspectorEmptyStory: StoryObj = {
  render: () => {
    return (
      <div style={{ width: "300px", height: "400px", border: "1px solid var(--v2-border-border-base)" }}>
        <Inspector
          model={{
            nodes: [],
            edges: [],
            activeTurn: undefined,
            turnByMessageID: new Map(),
          }}
          node={undefined}
        />
      </div>
    )
  },
}

export const WindowsStory: StoryObj = {
  render: () => {
    const [windows, setWindows] = createSignal<WindowState[]>([
      { id: "w1", kind: "inspector", nodeID: "node-1", left: 100, top: 100, width: 350, height: 300, z: 1, pinned: true },
      { id: "w2", kind: "details", nodeID: undefined, left: 500, top: 150, width: 400, height: 350, z: 2, pinned: false },
    ])

    return (
      <div style={{ position: "relative", width: "1000px", height: "600px", border: "1px solid var(--v2-border-border-base)" }}>
        <Windows
          windows={windows()}
          onChange={setWindows}
          onClose={(id) => setWindows((w) => w.filter((win) => win.id !== id))}
          render={(window) => (
            <div style={{ padding: "16px" }}>
              <strong>{window.kind}</strong>{" "}
              {window.nodeID && <span>— {window.nodeID}</span>}
            </div>
          )}
          title={(window) => (window.nodeID ? `Inspector: ${window.nodeID}` : window.kind)}
          anchorOf={() => undefined}
          bounds={() => ({ width: 1000, height: 600 })}
        />
      </div>
    )
  },
}