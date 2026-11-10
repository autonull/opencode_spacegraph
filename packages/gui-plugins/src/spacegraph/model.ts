import { createMemo } from "solid-js"
import type { MountedSession, SetupContext } from "@opencode/plugin/gui"
import {
  GRAPH_ARRANGEMENTS,
  GRAPH_SIDES,
  LAYOUTS,
  LAYOUT_STRATEGIES,
  ZOOM_LEVELS,
  type DepthMode,
  type GraphArrangement,
  type GraphSide,
  type Layout,
  type LayoutStrategy,
  type ZoomLevel,
  type DetailMode,
  buildGraphIncremental,
  layoutGraph,
  type GraphLayout,
  type IncrementalBuilderState,
  type Annotations,
} from "@opencode/session-ui/graph"
import { buildRenderModel, exportGraph, DEFAULT_THEME } from "@opencode/session-graph"
import type definition from "./index"
import type { State } from "./index"

function next<T>(values: readonly T[], current: T) {
  const index = values.indexOf(current)

  return values[(index + 1) % values.length] ?? current
}

function toLayoutStrategy(layout: Layout): LayoutStrategy {
  return LAYOUT_STRATEGIES.includes(layout as LayoutStrategy) ? (layout as LayoutStrategy) : "lanes"
}

export function createSpacegraph(ctx: SetupContext<typeof definition>) {
  const store = (session: MountedSession) => ctx.stores.session(session)
  const prefs = ctx.stores.prefs

  const sessionValue = (session: MountedSession) => store(session).value as State
  const prefValue = () => prefs.value

  /** Incremental graph builder state per session. */
  const graphState = new Map<string, { builderState: IncrementalBuilderState; layout: GraphLayout }>()

  /** Shared graph memo - built incrementally per session, reused by panel, full-map, hybrid, etc. */
  const graph = (session: MountedSession) =>
    createMemo(() => {
      const status: { type: "busy" | "idle" } =
        session.server.data.session.status(session.id) === "running" ? { type: "busy" } : { type: "idle" }

      const key = session.id
      const prev = graphState.get(key)

      const { graph: builtGraph, state } = buildGraphIncremental({
        messages: session.server.data.session.message.list(session.id),
        status,
        snapshot: prev?.builderState.snapshot,
        sessionID: prev?.builderState.sessionID,
        lineage: prev?.builderState.lineage,
        diffByTurn: prev?.builderState.diffByTurn,
        previousState: prev?.builderState,
      })

      // Compute incremental layout preserving previous positions
      const layout = layoutGraph(builtGraph, {
        strategy: toLayoutStrategy(sessionValue(session)?.layout ?? prefValue().layout ?? "lanes"),
        previous: prev?.layout?.positions,
      })

      // Store the new state for next incremental update
      graphState.set(key, { builderState: state, layout })

      return builtGraph
    })

  return {
    focused: (session: MountedSession) => sessionValue(session)?.focused,
    focus: (session: MountedSession, id: string | undefined) => {
      store(session).update((draft) => {
        draft.focused = id
      })
    },
    level: (session: MountedSession): ZoomLevel => sessionValue(session)?.level ?? prefValue().level ?? "execution",
    layout: (session: MountedSession): Layout => sessionValue(session)?.layout ?? prefValue().layout ?? "lanes",
    depth: (session: MountedSession): DepthMode => sessionValue(session)?.depth ?? prefValue().depth ?? "flat",
    detailMode: (session: MountedSession): DetailMode => sessionValue(session)?.detailMode ?? prefValue().detailMode ?? "panel",
    setLevel: (session: MountedSession, level: ZoomLevel) => {
      store(session).update((draft) => {
        draft.level = level
      })
    },
    setLayout: (session: MountedSession, layout: Layout) => {
      store(session).update((draft) => {
        draft.layout = layout
      })
    },
    setDepth: (session: MountedSession, depth: DepthMode) => {
      store(session).update((draft) => {
        draft.depth = depth
      })
    },
    setDetailMode: (session: MountedSession, detailMode: DetailMode) => {
      store(session).update((draft) => {
        draft.detailMode = detailMode
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
      const nextVal = !store(session).value?.turnMap

      store(session).update((draft) => {
        draft.turnMap = nextVal
      })
    },
    closeTurnMap: (session: MountedSession) => {
      store(session).update((draft) => {
        draft.turnMap = false
      })
    },
    renderer: () => "spacegraph" as const,
    cycleLevel: (session: MountedSession) => {
      const level = next(ZOOM_LEVELS, store(session).value?.level ?? "execution")

      store(session).update((draft) => {
        draft.level = level
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
      const arrangement = next(GRAPH_ARRANGEMENTS, store(session).value?.arrangement ?? prefValue().arrangement ?? "stacked")

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
    copyPermalink: (session: MountedSession) => {
      const node = store(session).value?.focused

      if (!node) return

      const layout = store(session).value?.layout ?? prefs.value.layout ?? "lanes"
      location.hash = `spacegraph:${layout}:${node}`
      void navigator.clipboard.writeText(location.href)
    },
    export: (session: MountedSession, format: "svg" | "json" | "html") => {
      const g = graph(session)()
      const level = store(session).value?.level ?? prefs.value.level ?? "execution"
      const layoutStrategy = (store(session).value?.layout ?? prefs.value.layout ?? "lanes") as LayoutStrategy
      const layout = layoutGraph(g, { strategy: layoutStrategy })
      const renderModel = buildRenderModel(g, {
        level,
        positions: layout.positions,
      })
      const sessionTitle = session.server.data.session.get(session.id)?.title ?? "OpenCode Session"
      const testedCommit = "unknown"
      exportGraph(format, renderModel, { theme: DEFAULT_THEME, sessionTitle, testedCommit })
    },
    /** The shared graph memo for this session. */
    graph,

    // Shared state accessors (Phase 17.2)
    /** Get the trace kind for the session. */
    traceKind: (session: MountedSession) => sessionValue(session)?.traceKind,
    /** Set the trace kind for the session. */
    setTraceKind: (session: MountedSession, kind: "why" | "led-here" | "related" | null) => {
      store(session).update((draft) => {
        draft.traceKind = kind ?? undefined
      })
    },
    /** Get the trace source for the session. */
    traceSource: (session: MountedSession) => sessionValue(session)?.traceSource,
    /** Set the trace source for the session. */
    setTraceSource: (session: MountedSession, source: string | null) => {
      store(session).update((draft) => {
        draft.traceSource = source ?? undefined
      })
    },
    /** Get the trace history for the session. */
    traceHistory: (session: MountedSession) => sessionValue(session)?.traceHistory ?? [],
    /** Get the trace history index for the session. */
    traceHistoryIndex: (session: MountedSession) => sessionValue(session)?.traceHistoryIndex ?? -1,
    /** Push a trace history entry. */
    pushTraceHistory: (session: MountedSession, entry: { kind: "why" | "led-here" | "related"; source: string; label: string }, index: number) => {
      store(session).update((draft) => {
        const history = draft.traceHistory ?? []
        const truncated = history.slice(0, index + 1)
        draft.traceHistory = [...truncated, entry]
        draft.traceHistoryIndex = index + 1
      })
    },
    /** Set trace history index. */
    setTraceHistoryIndex: (session: MountedSession, index: number) => {
      store(session).update((draft) => {
        draft.traceHistoryIndex = index
      })
    },
    /** Get explicitly collapsed groups for the session. */
    explicitlyCollapsedGroups: (session: MountedSession) => new Set(sessionValue(session)?.explicitlyCollapsedGroups ?? []) as ReadonlySet<string>,
    /** Toggle explicit collapse state for a group. */
    toggleExplicitlyCollapsedGroup: (session: MountedSession, groupId: string) => {
      store(session).update((draft) => {
        const groups = new Set(draft.explicitlyCollapsedGroups ?? [])
        if (groups.has(groupId)) {
          groups.delete(groupId)
        } else {
          groups.add(groupId)
        }
        draft.explicitlyCollapsedGroups = [...groups]
      })
    },
    /** Collapse all other groups explicitly. */
    collapseOtherGroupsExplicit: (session: MountedSession, currentGroupId: string, allGroupIds: string[]) => {
      store(session).update((draft) => {
        draft.explicitlyCollapsedGroups = allGroupIds.filter((id) => id !== currentGroupId)
      })
    },
    /** Get notes for the session. */
    notes: (session: MountedSession) => (sessionValue(session)?.notes as Annotations) ?? ({} as Annotations),
    /** Set notes for the session. */
    setNotes: (session: MountedSession, notes: Annotations) => {
      store(session).update((draft) => {
        draft.notes = notes as any
      })
    },
    /** Update a single note. */
    updateNote: (session: MountedSession, noteId: string, body: string) => {
      store(session).update((draft) => {
        const notes = { ...(draft.notes ?? {}) } as Annotations
        if (body.trim().length === 0) {
          delete notes[noteId]
        } else {
          notes[noteId] = { ...notes[noteId], body } as any
        }
        draft.notes = notes as any
      })
    },
    /** Delete a note. */
    deleteNote: (session: MountedSession, noteId: string) => {
      store(session).update((draft) => {
        const notes = { ...(draft.notes ?? {}) } as Annotations
        delete notes[noteId]
        draft.notes = notes as any
      })
    },
    /** Add a new note. */
    addNote: (session: MountedSession, note: { id: string; target: string; body: string; createdAt: number }) => {
      store(session).update((draft) => {
        const notes = { ...(draft.notes ?? {}) } as Annotations
        notes[note.id] = note as any
        draft.notes = notes as any
      })
    },
  }
}

export type SpacegraphModel = ReturnType<typeof createSpacegraph>