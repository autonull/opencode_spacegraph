import { describe, expect, test } from "bun:test"
import type { MountedSession, SetupContext } from "@opencode/plugin/gui"
import type { GraphViewData } from "@opencode/session-ui/graph"
import type definition from "./index"
import { createSpacegraph } from "./model"

function memory<T extends object>(initial: T) {
  const state = { value: initial }

  return {
    get value() {
      return state.value
    },
    update(update: (draft: T) => void) {
      const draft = structuredClone(state.value)
      update(draft)
      state.value = draft
    },
  }
}

type Stored = {
  surface?: string
  level?: "overview" | "execution" | "detail"
  layout?: "lanes" | "timeline" | "hierarchy" | "tree" | "force" | "grid" | "circular"
  arrangement?: "stacked" | "side" | "floating"
  side?: "start" | "end"
  turnMap?: boolean
  checkpoint?: number
  notes?: Record<string, unknown>
  pins?: string[]
  savedQueries?: { label: string; query: string }[]
}

// SAFETY: the model reads only `stores` and `surfaces.select`; the test session reads only `key`.
// oxlint-disable-next-line anti-slop/no-chained-type-assertions -- see SAFETY above
const session = {
  key: "fixture\nspacegraph",
  id: "test-session",
  server: {
    data: {
      session: {
        message: { list: () => [] },
        status: () => "idle",
        get: () => ({ title: "Test Session" }),
      },
    },
  },
} as unknown as MountedSession

function setup(flagsEnabled = true) {
  const prefs = memory<{ level?: string; layout?: string; arrangement?: string; side?: string }>({})
  const stored = memory<Stored>({})
  const selected: string[] = []

  // SAFETY: the model reads only these fake stores and the host's select callback.
  // oxlint-disable-next-line anti-slop/no-chained-type-assertions -- see SAFETY above
  const ctx = {
    stores: { prefs, session: () => stored },
    surfaces: { select: (id: string) => void selected.push(id) },
    flags: { enabled: () => flagsEnabled, loading: () => false },
    t: (key: string) => key,
    plural: (key: string) => key,
  } as unknown as SetupContext<typeof definition>

  return { model: createSpacegraph(ctx), prefs, stored, selected }
}

describe("spacegraph model", () => {
  test("cycles levels through the global default", () => {
    const { model, prefs } = setup()

    expect(model.level(session)).toBe("execution")
    model.cycleLevel(session)
    expect(model.level(session)).toBe("detail")
    model.cycleLevel(session)
    expect(model.level(session)).toBe("overview")
    model.cycleLevel(session)
    expect(model.level(session)).toBe("execution")

    expect(prefs.value.level).toBeUndefined()
  })

  test("uses the global default until the session overrides it", () => {
    const { model, prefs } = setup()

    prefs.update((draft) => {
      draft.level = "detail"
    })

    expect(model.level(session)).toBe("detail")
  })

  test("persists a chosen surface and forwards it to the host", () => {
    const { model, stored, selected } = setup()

    model.select(session, "spacegraph.hybrid")

    expect(stored.value.surface).toBe("spacegraph.hybrid")
    expect(selected).toEqual(["spacegraph.hybrid"])
  })

  test("cycleLevel cycles through all levels starting from execution default", () => {
    const { model, prefs, stored } = setup()

    // Initial level should be execution (global default)
    expect(model.level(session)).toBe("execution")

    // Cycle through all levels
    model.cycleLevel(session)
    expect(model.level(session)).toBe("detail")
    expect(stored.value.level).toBe("detail")

    model.cycleLevel(session)
    expect(model.level(session)).toBe("overview")
    expect(stored.value.level).toBe("overview")

    model.cycleLevel(session)
    expect(model.level(session)).toBe("execution")
    expect(stored.value.level).toBe("execution")

    // Global prefs should not be affected
    expect(prefs.value.level).toBeUndefined()
  })

  test("parks and resumes time travel at the selected turn", () => {
    const { model, stored } = setup()
    const graph = graphWithTurns(5)

    model.setCheckpoint(session, 2, graph.turns.length)
    expect(stored.value.checkpoint).toBe(2)
    expect(model.parked(session)).toBe(true)
    expect(model.checkpointIndex(session, graph)).toBe(2)
    expect(model.graphAt(session, graph).turns).toEqual(graph.turns.slice(0, 3))

    model.setCheckpoint(session, 4, graph.turns.length)
    expect(stored.value.checkpoint).toBeUndefined()
    expect(model.parked(session)).toBe(false)
    expect(model.graphAt(session, graph)).toBe(graph)
  })

  test("clamps a stale checkpoint to the live turn count", () => {
    const { model, stored } = setup()
    stored.update((draft) => {
      draft.checkpoint = 9
    })

    expect(model.checkpointIndex(session, graphWithTurns(3))).toBe(2)
    expect(model.graphAt(session, graphWithTurns(3)).turns).toEqual(["turn:0", "turn:1", "turn:2"])
  })

  test("persists notes per session through add, update, and delete", () => {
    const { model, stored } = setup()

    model.addNote(session, { id: "n1", target: "file:src/auth/token.ts", body: "Check refresh", createdAt: 1 })
    expect(stored.value.notes?.n1).toMatchObject({ id: "n1", body: "Check refresh", target: "file:src/auth/token.ts" })

    model.updateNote(session, "n1", "Check refresh and retry")
    expect(model.notes(session).n1.body).toBe("Check refresh and retry")

    model.updateNote(session, "n1", "")
    expect(model.notes(session).n1).toBeUndefined()
  })

  test("pins persist per session and toggle without rewriting other pins", () => {
    const { model, stored } = setup()

    model.togglePin(session, "file:src/auth/token.ts")
    model.togglePin(session, "turn:0")
    expect(model.pins(session)).toEqual(["file:src/auth/token.ts", "turn:0"])

    model.togglePin(session, "file:src/auth/token.ts")
    expect(model.pins(session)).toEqual(["turn:0"])
    expect(stored.value.pins).toEqual(["turn:0"])
  })

  test("saved questions persist as facet grammar and remove by query", () => {
    const { model, stored } = setup()
    const facets = {
      query: "",
      kinds: new Set(["tool"] as const),
      statuses: new Set(["failed"] as const),
      domains: new Set(["session"] as const),
    }

    model.saveFacets(session, facets)
    expect(model.savedQueries(session)).toEqual([{ label: "kind:tool status:failed domain:session", query: "kind:tool status:failed domain:session" }])

    model.removeSavedQuery(session, "kind:tool status:failed domain:session")
    expect(model.savedQueries(session)).toEqual([])
    expect(stored.value.savedQueries).toEqual([])
  })

  test("the layout breadth flag decides whether optional arrangements are exposed", () => {
    const { model } = setup()

    expect(model.availableLayouts()).toContain("grid")
    expect(model.availableLayouts()).toContain("circular")

    const off = setup(false).model
    expect(off.availableLayouts()).not.toContain("grid")
    expect(off.availableLayouts()).not.toContain("circular")
    expect(off.availableLayouts()).toContain("lanes")
  })

  test("the palette lists surfaces, lenses, and the commands the model can run", () => {
    const { model } = setup()
    const sources = model.paletteSources(session)

    expect(sources.actions?.map((action) => action.id)).toContain("surface.map")
    expect(sources.lenses?.length).toBeGreaterThan(0)
    expect(sources.surfaces).toBeUndefined()
  })
})

function graphWithTurns(count: number): GraphViewData {
  const turns = Array.from({ length: count }, (_, index) => `turn:${index}`)

  return {
    root: "session",
    nodes: turns.map((id) => ({ id, kind: "turn", label: id, status: "neutral", minLevel: "overview", turnID: id })),
    edges: [],
    turns,
    turnByMessageID: new Map(),
  }
}
