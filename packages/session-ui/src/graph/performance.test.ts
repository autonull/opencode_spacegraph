import { describe, expect, test } from "bun:test"
import type { JsonValue, SessionMessageAssistantTool, SessionMessageInfo } from "@opencode/client/promise"
import { buildGraph } from "./build"
import { layoutGraph } from "./layout"

// §9 performance budgets are fixture (< 16ms) and 200 messages (< 50ms). This guard uses a much
// larger, tool-heavy stream and a generous ceiling: it is meant to catch an accidental O(n^2) join
// in the model walk, not to measure a warm machine, so it does not flake under CI load.
const BUDGET_MS = 250

const TURNS = 100

function tool(id: string, name: string, input: Record<string, JsonValue>): SessionMessageAssistantTool {
  return {
    type: "tool",
    id,
    name,
    state: { status: "completed", input, content: [{ type: "text", text: "ok" }] },
    time: { created: 1, completed: 2 },
  }
}

function syntheticStream(turns: number): SessionMessageInfo[] {
  const messages: SessionMessageInfo[] = []

  for (let index = 0; index < turns; index++) {
    messages.push({ id: `u${index}`, type: "user", text: `task ${index}`, time: { created: index * 3 } })
    messages.push({
      id: `a${index}`,
      type: "assistant",
      agent: "build",
      model: { id: "m", providerID: "p" },
      time: { created: index * 3 + 1, completed: index * 3 + 2 },
      content: [
        { type: "text", text: `plan ${index}` },
        tool(`t${index}r`, "read", { path: `src/file${index}.ts` }),
        tool(`t${index}e`, "edit", { path: `src/file${index}.ts` }),
        tool(`t${index}s`, "shell", { command: `bun test ${index}` }),
      ],
    })
    messages.push({ id: `i${index}`, type: "idle", outcome: "succeeded", time: { created: index * 3 + 3 } })
  }

  return messages
}

describe("graph model — build cost", () => {
  test(`builds and lays out ${TURNS * 3} messages within the complexity guard`, () => {
    const messages = syntheticStream(TURNS)
    // Warm the walk once so the measurement is not dominated by first-call JIT.
    const warm = buildGraph({ messages: messages, status: { type: "idle" } })

    const start = performance.now()
    const model = buildGraph({ messages: messages, status: { type: "idle" } })
    const layout = layoutGraph(model)
    const elapsed = performance.now() - start

    expect(model.nodes.length).toBe(warm.nodes.length)
    expect(layout.positions.size).toBe(model.nodes.length)
    expect(elapsed).toBeLessThan(BUDGET_MS)
  })
})
