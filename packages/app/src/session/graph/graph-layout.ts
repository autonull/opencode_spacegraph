import { createRoot, createSignal } from "solid-js"
import type {
  DetailFraming,
  DetailMode,
  EqualizerRule,
  GraphArrangement,
  GraphSide,
  Layout,
} from "@opencode/session-ui/graph"

export type GraphWindow = {
  id: string
  kind: string
  nodeID?: string
  left: number
  top: number
  width: number
  height: number
  z: number
  pinned?: boolean
}

export type SessionGraphLayout = ReturnType<typeof createSessionGraphLayout>

function createSessionGraphLayout() {
  // App-lifetime state: one root per session layout, with no owner to dispose it.
  return createRoot(() => {
    const [map, setMap] = createSignal(false)
    const [sideBySide, setSideBySide] = createSignal(false)
    const [arrangement, setArrangement] = createSignal<GraphArrangement>("stacked")
    const [arrangementSide, setArrangementSide] = createSignal<GraphSide>("start")
    const [split, setSplit] = createSignal(0.5)
    const [logTextScale, setLogTextScale] = createSignal(1)
    const [projection, setProjection] = createSignal<"2d" | "3d">("2d")
    const [renderer, setRenderer] = createSignal<"spacegraph" | "cytoscape" | undefined>()
    const [selected, setSelected] = createSignal<string | undefined>()
    const [layout, setLayout] = createSignal<Layout>("lanes")
    const [depth, setDepth] = createSignal<"flat" | "layered" | "depth-stack" | "orbit">("flat")
    const [detailMode, setDetailMode] = createSignal<DetailMode>("panel")
    const [detailFraming, setDetailFraming] = createSignal<DetailFraming>("off")
    const [peek, setPeek] = createSignal(false)
    const [followLog, setFollowLog] = createSignal(false)
    const [minimap, setMinimap] = createSignal(false)
    const [files, setFiles] = createSignal(false)
    const [turnMap, setTurnMap] = createSignal<string | undefined>()
    const [rules, setRules] = createSignal<readonly EqualizerRule[]>([])
    const [windows, setWindows] = createSignal<readonly GraphWindow[]>([])

    return {
      map,
      sideBySide,
      arrangement,
      arrangementSide,
      split,
      logTextScale,
      projection,
      renderer,
      selected,
      layout,
      depth,
      detailMode,
      detailFraming,
      peek,
      followLog,
      minimap,
      files,
      turnMap,
      rules,
      windows,
      setMap,
      setSideBySide,
      setArrangement,
      setArrangementSide,
      setSplit,
      setLogTextScale,
      setProjection,
      setRenderer,
      setSelected,
      setLayout,
      setDepth,
      setDetailMode,
      setDetailFraming,
      setPeek,
      setFollowLog,
      setMinimap,
      setFiles,
      setTurnMap,
      setRules,
      setWindows,
    }
  })!
}

const layouts = new Map<string, SessionGraphLayout>()

/** One graph layout per routed session, shared by the header toggle and the map surface. */
export function graphLayoutFor(key: string): SessionGraphLayout {
  let layout = layouts.get(key)
  if (!layout) {
    layout = createSessionGraphLayout()
    layouts.set(key, layout)
  }
  return layout
}
