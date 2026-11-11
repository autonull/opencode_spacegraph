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
  layout?: "lanes" | "timeline" | "hierarchy" | "tree" | "force"
  arrangement?: "stacked" | "side" | "floating"
  side?: "start" | "end"
  turnMap?: boolean
  checkpoint?: number
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

function setup() {
  const prefs = memory<{ level?: string; layout?: string; arrangement?: string; side?: string }>({})
  const stored = memory<Stored>({})
  const selected: string[] = []

  // SAFETY: the model reads only these fake stores and the host's select callback.
  // oxlint-disable-next-line anti-slop/no-chained-type-assertions -- see SAFETY above
  const ctx = {
    stores: { prefs, session: () => stored },
    surfaces: { select: (id: string) => void selected.push(id) },
    flags: { enabled: () => true, loading: () => false },
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
