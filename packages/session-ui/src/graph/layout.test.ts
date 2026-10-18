import { describe, expect, test } from "bun:test"
import type { SessionMessageInfo } from "@opencode/client/promise"
import { buildFixtureGraph } from "./fixture"
import { buildGraph, fileNodeID, toolNodeID, turnNodeID } from "./model"
import { CARD_SIZE, LANES, layoutGraph, nodeSize, type GraphLayout } from "./layout"

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

const LANE_STRIDE = CARD_SIZE[1] + 24

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

    expect(y(turnNodeID("msg_user_1"))).toBe(LANES.indexOf("prompt") * LANE_STRIDE)
    expect(y(toolNodeID("prt_tool_read_1"))).toBe(LANES.indexOf("explore") * LANE_STRIDE)
    expect(y(toolNodeID("prt_tool_edit_1"))).toBe(LANES.indexOf("edit") * LANE_STRIDE)
    expect(y(toolNodeID("prt_tool_shell_1"))).toBe(LANES.indexOf("verify") * LANE_STRIDE)
    expect(point(layout, "session")?.z).toBe(0)
    expect(point(layout, turnNodeID("msg_user_1"))?.z).toBe(64)
  })

  test("a file node is anchored inside its owning turn, never at x=0", () => {
    const layout = layoutGraph(buildFixtureGraph())
    const file = point(layout, fileNodeID("src/auth/token.ts"))!
    const turn = point(layout, turnNodeID("msg_user_1"))!

    expect(file.x).toBeGreaterThan(turn.x)
  })

  test("no two nodes overlap at execution", () => {
    const layout = layoutGraph(buildFixtureGraph())
    const placed = buildFixtureGraph().nodes.map((node) => ({ node, position: point(layout, node.id)! }))

    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const [a, b] = [placed[i]!, placed[j]!]

        if (a.position.y !== b.position.y) continue

        const gap = Math.abs(a.position.x - b.position.x) - (nodeSize(a.node)[0] + nodeSize(b.node)[0]) / 2

        expect(gap).toBeGreaterThanOrEqual(0)
      }
    }
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

  test("turn bands are emitted for every turn", () => {
    const model = buildFixtureGraph()
    const layout = layoutGraph(model)

    for (const turnID of model.turns) expect(layout.clusters.has(turnID)).toBe(true)
  })
})

describe("layout — alternate strategies", () => {
  test("timeline and hierarchy are deterministic and place every node", () => {
    const model = buildFixtureGraph()

    for (const strategy of ["timeline", "hierarchy"] as const) {
      const a = layoutGraph(model, { strategy })
      const b = layoutGraph(model, { strategy })
      expect(a.strategy).toBe(strategy)
      expect(a.positions.size).toBe(model.nodes.length)
      expect([...a.positions.entries()]).toEqual([...b.positions.entries()])
    }
  })
})
