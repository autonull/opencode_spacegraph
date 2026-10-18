import { describe, expect, test } from "bun:test"
import type { SessionMessageInfo } from "@opencode/client/promise"
import { buildFixtureGraph } from "./fixture"
import { buildGraph, fileNodeID, toolNodeID, turnNodeID } from "./model"
import { LANES, layoutGraph, type GraphLayout } from "./layout"

const user = (id: string, text = id) => ({ id, type: "user", text, time: { created: 1 } }) as const

const text = (messageID: string, body: string): SessionMessageInfo => ({
  id: messageID,
  type: "assistant",
  agent: "build",
  model: { id: "m", providerID: "p" },
  content: [{ type: "text", text: body }],
  time: { created: 1, completed: 2 },
})

const idle = (id: string) => ({ id, type: "idle", outcome: "succeeded", time: { created: 1 } }) as const

const point = (layout: GraphLayout, id: string) => layout.positions.get(id)

describe("layout — determinism and append-only", () => {
  test("two builds produce identical positions", () => {
    const a = layoutGraph(buildFixtureGraph())
    const b = layoutGraph(buildFixtureGraph())

    expect([...a.positions.entries()]).toEqual([...b.positions.entries()])
  })

  test("appending a new turn leaves earlier positions unchanged", () => {
    const base = [user("u1"), text("a1", "hi"), idle("i1")] satisfies SessionMessageInfo[]
    const extended = [...base, user("u2"), text("a2", "more"), idle("i2")] satisfies SessionMessageInfo[]
    const before = layoutGraph(buildGraph(base, { type: "idle" }))
    const after = layoutGraph(buildGraph(extended, { type: "idle" }))

    for (const id of before.positions.keys()) expect(after.positions.get(id)).toEqual(before.positions.get(id))
  })
})

describe("layout — lanes, depth and provenance anchoring", () => {
  test("nodes occupy their activity lane with hierarchy depth", () => {
    const layout = layoutGraph(buildFixtureGraph())
    const y = (id: string) => point(layout, id)?.y

    expect(y(turnNodeID("msg_user_1"))).toBe(LANES.indexOf("prompt") * 56)
    expect(y(toolNodeID("prt_tool_read_1"))).toBe(LANES.indexOf("explore") * 56)
    expect(y(toolNodeID("prt_tool_edit_1"))).toBe(LANES.indexOf("edit") * 56)
    expect(y(toolNodeID("prt_tool_shell_1"))).toBe(LANES.indexOf("verify") * 56)
    expect(point(layout, "session")?.z).toBe(0)
    expect(point(layout, turnNodeID("msg_user_1"))?.z).toBe(64)
  })

  test("a file node sits near its first tool write", () => {
    const layout = layoutGraph(buildFixtureGraph())

    expect(point(layout, fileNodeID("src/auth/token.ts"))?.x).toBe(point(layout, toolNodeID("prt_tool_write_1"))?.x)
  })

  test("phase cluster bounds contain their members", () => {
    const model = buildFixtureGraph()
    const layout = layoutGraph(model)
    const phase = model.nodes.find((node) => node.id === "phase:turn:msg_user_1:edit:3")!
    const bounds = layout.clusters.get(phase.id)!

    for (const member of phase.clusterOf ?? []) {
      const position = point(layout, member)!
      expect(position.x).toBeGreaterThanOrEqual(bounds.min.x)
      expect(position.x).toBeLessThanOrEqual(bounds.max.x)
    }
  })
})
