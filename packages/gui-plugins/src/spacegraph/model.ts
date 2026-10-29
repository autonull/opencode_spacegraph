import type { MountedSession, SetupContext } from "@opencode/plugin/gui"
import {
  GRAPH_ARRANGEMENTS,
  GRAPH_SIDES,
  LAYOUTS,
  ZOOM_LEVELS,
  type DepthMode,
  type GraphArrangement,
  type GraphSide,
  type Layout,
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

  const sessionValue = (session: MountedSession) => store(session).value
  const prefValue = () => prefs.value

  return {
    focused: (session: MountedSession) => sessionValue(session)?.focused,
    focus: (session: MountedSession, id: string | undefined) => {
      store(session).update((draft) => {
        draft.focused = id
      })
    },
    level: (session: MountedSession): ZoomLevel => sessionValue(session)?.level ?? prefValue().level ?? "overview",
    layout: (session: MountedSession): Layout => sessionValue(session)?.layout ?? prefValue().layout ?? "lanes",
    depth: (session: MountedSession): DepthMode => sessionValue(session)?.depth ?? prefValue().depth ?? "flat",
    setDepth: (session: MountedSession, depth: DepthMode) => {
      store(session).update((draft) => {
        draft.depth = depth
      })
    },
    arrangement: (session: MountedSession): GraphArrangement => sessionValue(session)?.arrangement ?? prefValue().arrangement ?? "stacked",
    side: (session: MountedSession): GraphSide => sessionValue(session)?.side ?? prefValue().side ?? "end",
    surface: (session: MountedSession) => sessionValue(session)?.surface,
    select: (session: MountedSession, id: string) => {
      store(session).update((draft) => {
        draft.surface = id
      })
      ctx.surfaces.select(id, session)
    },
    turnMap: (session: MountedSession) => sessionValue(session)?.turnMap ?? false,
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
    setLayout: (session: MountedSession, layout: Layout) => {
      store(session).update((draft) => {
        draft.layout = layout
      })
    },
    cycleLayout: (session: MountedSession) => {
      const layout = next(LAYOUTS, store(session).value?.layout ?? "lanes")

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
      const layoutStrategy = (store(session).value?.layout ?? prefs.value.layout ?? "lanes") as LayoutStrategy
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
