import { expect, test } from "bun:test"
import type { SessionMessageInfo } from "@opencode/client/promise"
import { buildGraph, layoutGraph, scaleWindow, scopeToTurns, TURN_WINDOW } from "@opencode/session-ui/graph"
import { buildRenderModel } from "./buildRenderModel"

/**
 * T6.6 — the scale guard. A long session must build a bounded render model and carry only a
 * window of turns. Layout uses the lanes strategy: the force simulation is quadratic at this
 * size and belongs to a benchmark, not a unit test. Structural bounds catch an accidental
 * quadratic pass through the test timeout instead of a wall-clock assertion.
 */
const MESSAGES = 5_000

function session(count: number): SessionMessageInfo[] {
  const messages: SessionMessageInfo[] = []

  for (let index = 0; index < count / 3; index++) {
    messages.push({ id: `u${index}`, type: "user", text: `task ${index}`, time: { created: index * 3 } })
    messages.push({
      id: `a${index}`,
      type: "assistant",
      agent: "build",
      model: { id: "m", providerID: "p" },
      content: [
        { type: "text", text: `plan ${index}` },
        {
          type: "tool",
          id: `t${index}`,
          name: "edit",
          state: {
            status: "completed",
            input: { path: `src/file${index % 40}.ts` },
            content: [{ type: "text", text: "ok" }],
          },
          time: { created: index * 3, completed: index * 3 },
        },
      ],
      time: { created: index * 3 + 1, completed: index * 3 + 2 },
    })
    messages.push({ id: `i${index}`, type: "idle", outcome: "succeeded", time: { created: index * 3 + 3 } })
  }

  return messages
}

const messages = session(MESSAGES)
const model = buildGraph({ messages: messages, status: { type: "idle" } })
const positions = layoutGraph(model, { strategy: "lanes" }).positions

test("a long session builds a render model with a band per turn", () => {
  const built = buildRenderModel(model, { level: "execution", positions, bands: true })

  expect(built.nodes.length).toBeGreaterThan(0)
  expect(built.nodes.filter((node) => node.kind === "band").length).toBeGreaterThan(0)
})

test("the capped window keeps the map inside the budget of drawn turns", () => {
  const window = scaleWindow(model)
  const scoped = scopeToTurns(model, window.turns)
  const built = buildRenderModel(scoped, { level: "execution", positions, bands: true })
  const drawnTurns = new Set(
    built.nodes.filter((node) => node.kind === "turn").map((node) => node.id),
  )

  expect(window.hidden).toBeGreaterThan(0)
  expect(drawnTurns.size).toBeLessThanOrEqual(TURN_WINDOW)
  expect(built.nodes.length).toBeLessThan(model.nodes.length)
})
