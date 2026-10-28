import type { MountedSession, SetupContext } from "@opencode/plugin/gui"
import {
  GRAPH_ARRANGEMENTS,
  GRAPH_SIDES,
  LAYOUT_STRATEGIES,
  ZOOM_LEVELS,
  type DepthMode,
  type GraphArrangement,
  type GraphSide,
  type LayoutStrategy,
  type ZoomLevel,
} from "@opencode/session-ui/graph"
import type definition from "./index"
import { buildGraph, layoutGraph } from "@opencode/session-ui/graph"
import { buildRenderModel, exportGraph, DEFAULT_THEME } from "@opencode/session-graph"

function next<T>(values: readonly T[], current: T) {
  const index = values.indexOf(current)

  return values[(index + 1) % values.length] ?? current
}

export function createSpacegraph(ctx: SetupContext<typeof definition>) {
  const store = (session: MountedSession) => ctx.stores.session(session)
  const prefs = ctx.stores.prefs

  return {
    focused: (session: MountedSession) => store(session).value?.focused,
    focus: (session: MountedSession, id: string | undefined) => {
      store(session).update((draft) => {
        draft.focused = id
      })
    },
    level: (session: MountedSession): ZoomLevel => store(session).value?.level ?? prefs.value.level ?? "overview",
    layout: (session: MountedSession): LayoutStrategy => store(session).value?.layout ?? prefs.value.layout ?? "lanes",
    depth: (session: MountedSession): DepthMode => store(session).value?.depth ?? prefs.value.depth ?? "flat",
    setDepth: (session: MountedSession, depth: DepthMode) => {
      store(session).update((draft) => {
        draft.depth = depth
      })
    },
    arrangement: (session: MountedSession): GraphArrangement =>
      store(session).value?.arrangement ?? prefs.value.arrangement ?? "side",
    side: (session: MountedSession): GraphSide => store(session).value?.side ?? prefs.value.side ?? "end",
    surface: (session: MountedSession) => store(session).value?.surface,
    select: (session: MountedSession, id: string) => {
      store(session).update((draft) => {
        draft.surface = id
      })
      ctx.surfaces.select(id, session)
    },
    turnMap: (session: MountedSession) => store(session).value?.turnMap ?? false,
    toggleTurnMap: (session: MountedSession) => {
      const next = !store(session).value?.turnMap

      store(session).update((draft) => {
        draft.turnMap = next
      })
    },
    closeTurnMap: (session: MountedSession) => {
      store(session).update((draft) => {
        draft.turnMap = false
      })
    },
    cycleLevel: (session: MountedSession) => {
      const level = next(ZOOM_LEVELS, store(session).value?.level ?? "overview")

      store(session).update((draft) => {
        draft.level = level
      })
    },
    setLayout: (session: MountedSession, layout: LayoutStrategy) => {
      store(session).update((draft) => {
        draft.layout = layout
      })
    },
    cycleLayout: (session: MountedSession) => {
      const layout = next(LAYOUT_STRATEGIES, store(session).value?.layout ?? "lanes")

      store(session).update((draft) => {
        draft.layout = layout
      })
    },
    setArrangement: (session: MountedSession, arrangement: GraphArrangement) => {
      store(session).update((draft) => {
        draft.arrangement = arrangement
      })
    },
    setSide: (session: MountedSession, side: GraphSide) => {
      store(session).update((draft) => {
        draft.side = side
      })
    },
    cycleArrangement: (session: MountedSession) => {
      const arrangement = next(GRAPH_ARRANGEMENTS, store(session).value?.arrangement ?? "side")

      store(session).update((draft) => {
        draft.arrangement = arrangement
      })
    },
    toggleSide: (session: MountedSession) => {
      const side = next(GRAPH_SIDES, store(session).value?.side ?? "end")

      store(session).update((draft) => {
        draft.side = side
      })
    },
    export: (session: MountedSession, format: "svg" | "json" | "html") => {
      const status: { type: "busy" | "idle" } =
        session.server.data.session.status(session.id) === "running" ? { type: "busy" } : { type: "idle" }
      const graph = buildGraph({ messages: session.server.data.session.message.list(session.id), status })
      const level = store(session).value?.level ?? prefs.value.level ?? "overview"
      const layoutStrategy = store(session).value?.layout ?? prefs.value.layout ?? "lanes"
      const layout = layoutGraph(graph, { strategy: layoutStrategy })
      const renderModel = buildRenderModel(graph, {
        level,
        positions: layout.positions,
      })
      const sessionTitle = session.server.data.session.get(session.id)?.title ?? "OpenCode Session"
      const testedCommit = "unknown"
      exportGraph(format, renderModel, { theme: DEFAULT_THEME, sessionTitle, testedCommit })
    },
  }
}

export type SpacegraphModel = ReturnType<typeof createSpacegraph>
