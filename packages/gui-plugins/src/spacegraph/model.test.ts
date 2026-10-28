import { describe, expect, test } from "bun:test"
import type { MountedSession, SetupContext } from "@opencode/plugin/gui"
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
}

// SAFETY: the model reads only `stores` and `surfaces.select`; the test session reads only `key`.
// oxlint-disable-next-line anti-slop/no-chained-type-assertions -- see SAFETY above
const session = { key: "fixture\nspacegraph" } as unknown as MountedSession

function setup() {
  const prefs = memory<{ level?: string; layout?: string; arrangement?: string; side?: string }>({})
  const stored = memory<Stored>({})
  const selected: string[] = []

  // SAFETY: the model reads only these fake stores and the host's select callback.
  // oxlint-disable-next-line anti-slop/no-chained-type-assertions -- see SAFETY above
  const ctx = {
    stores: { prefs, session: () => stored },
    surfaces: { select: (id: string) => void selected.push(id) },
  } as unknown as SetupContext<typeof definition>

  return { model: createSpacegraph(ctx), prefs, stored, selected }
}

describe("spacegraph model", () => {
  test("cycles levels through the global default", () => {
    const { model, prefs } = setup()

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
})
