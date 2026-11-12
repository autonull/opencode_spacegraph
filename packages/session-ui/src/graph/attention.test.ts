import { describe, expect, test } from "bun:test"
import { attention } from "./attention"
import { buildFixtureGraph } from "./fixture"

const model = buildFixtureGraph()

describe("attention — one failure signal for every surface", () => {
  test("a failed session reports danger and the failures it can open", () => {
    const signal = attention(model)
    const ids = new Set(model.nodes.filter((node) => node.kind === "error" || node.kind === "retry").map((node) => node.id))

    expect(signal.tone).toBe("danger")
    expect(signal.errors).toBeGreaterThan(0)
    expect(signal.count).toBe(ids.size)
    expect(signal.ids).toEqual([...ids])
  })

  test("the latest failure carries its turn and a stable node id", () => {
    const signal = attention(model)
    const expected = [...model.nodes].reverse().find((node) => node.kind === "error" || node.kind === "retry")

    expect(signal.latest?.nodeID).toBe(expected?.id)
    expect(signal.latest?.turnID).toBeTruthy()
    expect(signal.latest?.turnNumber).toBeGreaterThan(0)
  })

  test("a session without failures stays quiet", () => {
    const clean = {
      ...model,
      nodes: model.nodes.filter((node) => node.kind !== "error" && node.kind !== "retry"),
    }
    const signal = attention(clean)

    expect(signal).toMatchObject({ tone: "none", count: 0, errors: 0, retries: 0, latest: undefined, ids: [] })
  })
})
