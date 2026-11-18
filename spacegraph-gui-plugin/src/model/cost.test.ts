import { describe, expect, test } from "bun:test"
import type { SessionMessageInfo } from "@opencode/client/promise"
import { buildGraph } from "./build"
import { costLens, tokenTotal, turnCost } from "./cost"
import { turnNodeID } from "./model"

const user = { id: "u1", type: "user", text: "go", time: { created: 1_000 } } satisfies SessionMessageInfo

const step = (id: string, created: number, completed: number | undefined): SessionMessageInfo => ({
  id,
  type: "assistant",
  agent: "build",
  model: { id: "m", providerID: "p" },
  content: [{ type: "tool", id: `tool_${id}`, name: "read", state: { status: "completed", input: {}, content: [{ type: "text", text: "ok" }] }, time: { created } }],
  time: completed === undefined ? { created } : { created, completed },
  tokens: { input: 100, output: 50, reasoning: 10, cache: { read: 20, write: 5 } },
  cost: 0.01,
})

describe("cost lens", () => {
  test("sums each turn's tokens, wall time, and tools", () => {
    const model = buildGraph({
      messages: [user, step("a1", 2_000, 3_000), step("a2", 4_000, 5_500)],
      status: { type: "idle" },
    })
    const lens = costLens(model)
    const turn = lens.turns.get(turnNodeID("u1"))

    expect(turn).toBeDefined()
    expect(turn?.steps).toBe(2)
    expect(turn?.tools).toBe(2)
    expect(turn?.streaming).toBe(false)
    expect(turn?.wallTime).toBe(3_500)
    expect(tokenTotal(turn!.tokens)).toBe(370)
    expect(lens.session.turns).toBe(1)
    expect(lens.session.tools).toBe(2)
    expect(tokenTotal(lens.session.tokens)).toBe(370)
    expect(lens.session.cost).toBeCloseTo(0.02)
  })

  test("a streaming step records a lower bound", () => {
    const model = buildGraph({
      messages: [user, step("a1", 2_000, undefined)],
      status: { type: "busy" },
    })
    const turn = turnCost(model.nodes.find((node) => node.id === turnNodeID("u1"))!)

    expect(turn?.streaming).toBe(true)
    expect(turn?.steps).toBe(1)
    expect(turn?.wallTime).toBe(0)
  })

  test("a turn without usage has no lens entry", () => {
    const model = buildGraph({
      messages: [user, { ...user, id: "u2", text: "plain" }],
      status: { type: "idle" },
    })

    expect(costLens(model).turns.size).toBe(0)
  })
})
