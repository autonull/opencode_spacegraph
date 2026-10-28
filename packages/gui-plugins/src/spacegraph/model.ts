import type { MountedSession, SetupContext } from "@opencode/plugin/gui"
import {
  GRAPH_ARRANGEMENTS,
  GRAPH_SIDES,
  LAYOUT_STRATEGIES,
  ZOOM_LEVELS,
  type GraphArrangement,
  type GraphSide,
  type LayoutStrategy,
  type ZoomLevel,
} from "@opencode/session-ui/graph"
import type definition from "./index"

function next<T>(values: readonly T[], current: T) {
  const index = values.indexOf(current)

  return values[(index + 1) % values.length] ?? current
}

export function createSpacegraph(ctx: SetupContext<typeof definition>) {
  const store = (session: MountedSession) => ctx.stores.session(session)

  return {
    focused: (session: MountedSession) => store(session).value?.focused,
    focus: (session: MountedSession, id: string | undefined) => {
      store(session).update((draft) => {
        draft.focused = id
      })
    },
    level: (session: MountedSession): ZoomLevel => store(session).value?.level ?? "overview",
    layout: (session: MountedSession): LayoutStrategy => store(session).value?.layout ?? "lanes",
    arrangement: (session: MountedSession): GraphArrangement => store(session).value?.arrangement ?? "side",
    side: (session: MountedSession): GraphSide => store(session).value?.side ?? "end",
    cycleLevel: (session: MountedSession) => {
      const level = next(ZOOM_LEVELS, store(session).value?.level ?? "overview")

      store(session).update((draft) => {
        draft.level = level
      })
    },
    cycleLayout: (session: MountedSession) => {
      const layout = next(LAYOUT_STRATEGIES, store(session).value?.layout ?? "lanes")

      store(session).update((draft) => {
        draft.layout = layout
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
  }
}

export type SpacegraphModel = ReturnType<typeof createSpacegraph>
