import { describe, expect, test } from "bun:test"
import type { SessionMessageInfo } from "@opencode/client/promise"
import { buildGraph, type GraphModel } from "./model"
import { layoutGraph } from "./layout"
import { scaleWindow, scopeToTurns, TURN_WINDOW } from "./scale"

const user = (id: string) => ({ id, type: "user", text: id, time: { created: 1 } }) as const

const text = (id: string) =>
  ({
    id,
    type: "assistant",
    agent: "build",
    model: { id: "m", providerID: "p" },
    content: [{ type: "text", text: "hi" }],
    time: { created: 1, completed: 2 },
  }) as const

const idle = (id: string) => ({ id, type: "idle", outcome: "succeeded", time: { created: 1 } }) as const

/** A session of `turns` executions, each one user message, one answer, one idle marker. */
function session(turns: number): SessionModel {
  const messages: SessionMessageInfo[] = []

  for (let index = 0; index < turns; index++) {
    messages.push(user(`u${index}`))
    messages.push(text(`a${index}`))
    messages.push(idle(`i${index}`))
  }

  return buildGraph(messages, { type: "idle" })
}

type SessionModel = GraphModel

describe("scale — the drawn window", () => {
  test("a session that fits the window is drawn whole", () => {
    const model = session(4)
    const window = scaleWindow(model)

    expect(window.total).toBe(model.turns.length)
    expect(window.hidden).toBe(0)
    expect(window.turns.size).toBe(model.turns.length)
  })

  test("a long session is drawn as its recent tail", () => {
    const model = session(TURN_WINDOW + 40)
    const window = scaleWindow(model)

    expect(window.total).toBe(TURN_WINDOW + 40)
    expect(window.turns.size).toBe(TURN_WINDOW)
    expect(window.hidden).toBe(40)
    expect([...window.turns].at(-1)).toBe(model.turns.at(-1))
  })

  test("the turn the reader is looking at stays in the window", () => {
    const model = session(TURN_WINDOW + 40)
    const first = model.turns[0]!
    const window = scaleWindow(model, [first])

    expect(window.turns.has(first)).toBe(true)
    expect(window.turns.size).toBe(TURN_WINDOW + 1)
    expect(window.hidden).toBe(39)
  })

  test("an unknown turn does not enlarge the window", () => {
    const model = session(TURN_WINDOW + 40)
    const window = scaleWindow(model, ["turn:nope"])

    expect(window.turns.size).toBe(TURN_WINDOW)
  })
})

describe("scale — the scoped model", () => {
  test("the scope keeps the window's turns and drops the rest", () => {
    const model = session(TURN_WINDOW + 10)
    const window = scaleWindow(model)
    const scoped = scopeToTurns(model, window.turns)

    expect(scoped.turns.length).toBe(TURN_WINDOW)
    expect(scoped.nodes.length).toBeLessThan(model.nodes.length)
    expect(scoped.nodes.some((node) => node.kind === "turn" && !window.turns.has(node.id))).toBe(false)
  })

  test("the scope keeps the session root", () => {
    const model = session(TURN_WINDOW + 10)
    const scoped = scopeToTurns(model, scaleWindow(model).turns)

    expect(scoped.nodes.some((node) => node.id === model.root)).toBe(true)
  })

  test("no edge points at a node the scope dropped", () => {
    const model = session(TURN_WINDOW + 10)
    const scoped = scopeToTurns(model, scaleWindow(model).turns)
    const ids = new Set(scoped.nodes.map((node) => node.id))

    for (const edge of scoped.edges) {
      expect(ids.has(edge.source)).toBe(true)
      expect(ids.has(edge.target)).toBe(true)
    }
  })

  test("a session that fits the window is scoped to itself", () => {
    const model = session(4)

    expect(scopeToTurns(model, scaleWindow(model).turns)).toBe(model)
  })

  test("the window slides without moving the nodes that stay", () => {
    const base = session(TURN_WINDOW + 5)
    const extended = session(TURN_WINDOW + 10)
    const before = layoutGraph(base).positions
    const after = layoutGraph(extended).positions
    const kept = [...scaleWindow(extended).turns].filter((turn) => base.turns.includes(turn))

    expect(kept.length).toBeGreaterThan(0)

    for (const turn of kept) {
      const node = base.nodes.find((candidate) => candidate.id === turn)!

      expect(after.get(turn)).toEqual(before.get(turn))
      expect(node).toBeDefined()
    }
  })
})
