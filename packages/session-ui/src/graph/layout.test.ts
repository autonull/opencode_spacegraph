import { describe, expect, test } from "bun:test"
import type { SessionMessageInfo } from "@opencode/client/promise"
import { buildFixtureGraph } from "./fixture"
import { buildGraph, fileNodeID, toolNodeID, turnNodeID } from "./model"
import { CARD_SIZE, LANES, layoutGraph, nodeSize, type GraphLayout } from "./layout"
import { isVisibleAt } from "./levels"

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

describe("layout — level-aware overview", () => {
  test("overview sizes turn columns from the nodes overview draws", () => {
    const model = buildFixtureGraph()
    const overview = layoutGraph(model, { level: "overview" })
    const execution = layoutGraph(model, { level: "execution" })
    const width = (layout: GraphLayout) => {
      const xs = [...layout.positions.values()].map((point) => point.x)
      return Math.max(...xs) - Math.min(...xs)
    }

    expect(width(overview)).toBeLessThan(width(execution))
  })

  test("overview places every visible node and no hidden one", () => {
    const model = buildFixtureGraph()
    const overview = layoutGraph(model, { level: "overview" })

    for (const node of model.nodes) expect(overview.positions.has(node.id)).toBe(isVisibleAt(node, "overview"))
  })

  test("overview chips do not overlap within a row", () => {
    const model = buildFixtureGraph()
    const overview = layoutGraph(model, { level: "overview" })
    const placed = model.nodes.filter((node) => overview.positions.has(node.id))

    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const [a, b] = [placed[i]!, placed[j]!]
        const [pa, pb] = [overview.positions.get(a.id)!, overview.positions.get(b.id)!]

        if (pa.y !== pb.y) continue

        expect(Math.abs(pa.x - pb.x)).toBeGreaterThanOrEqual((nodeSize(a)[0] + nodeSize(b)[0]) / 2)
      }
    }
  })

  test("execution and detail keep the positions of the unlevelled layout", () => {
    const model = buildFixtureGraph()
    const base = [...layoutGraph(model).positions.entries()]

    for (const level of ["execution", "detail"] as const)
      expect([...layoutGraph(model, { level }).positions.entries()]).toEqual(base)
  })

  test("overview is stable within the level across appends", () => {
    const base = [user("u1"), text("a1", "hi"), idle("i1")] satisfies SessionMessageInfo[]
    const extended = [...base, user("u2"), text("a2", "more"), idle("i2")] satisfies SessionMessageInfo[]
    const before = layoutGraph(buildGraph(base, { type: "idle" }), { level: "overview" })
    const after = layoutGraph(buildGraph(extended, { type: "idle" }), { level: "overview" })

    for (const id of before.positions.keys()) expect(after.positions.get(id)).toEqual(before.positions.get(id))
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

  test("timeline wraps a turn's cards into rows bounded by the column count", () => {
    const model = buildFixtureGraph()
    const columns = 4
    const layout = layoutGraph(model, { strategy: "timeline", columns })
    const points = [...layout.positions.values()]

    // More than one row: the turn is not a single long smear.
    expect(new Set(points.map((point) => point.y)).size).toBeGreaterThan(1)
    // A row never exceeds the wrapped column width (4 cards of 220 + 3 gaps of 24).
    expect(Math.max(...points.map((point) => point.x))).toBeLessThan(columns * (CARD_SIZE[0] + 24))

    // No two cards share a row and overlap.
    const byRow = new Map<number, { x: number; width: number }[]>()

    for (const node of model.nodes) {
      const point = layout.positions.get(node.id)!
      const row = byRow.get(point.y) ?? []
      row.push({ x: point.x, width: nodeSize(node)[0] })
      byRow.set(point.y, row)
    }

    for (const row of byRow.values()) {
      const sorted = [...row].sort((a, b) => a.x - b.x)

      for (let i = 1; i < sorted.length; i++)
        expect(sorted[i]!.x - sorted[i - 1]!.x).toBeGreaterThanOrEqual(
          (sorted[i]!.width + sorted[i - 1]!.width) / 2,
        )
    }
  })

  test("timeline starts each turn on its own row band and labels the boundary", () => {
    const model = buildFixtureGraph()
    const layout = layoutGraph(model, { strategy: "timeline", columns: 5 })
    const ranges = model.turns.map((turnID) => {
      expect(layout.clusters.has(turnID)).toBe(true)
      const ys = model.nodes
        .filter((node) => node.turnID === turnID || node.id === turnID)
        .flatMap((node) => {
          const point = layout.positions.get(node.id)
          return point ? [point.y] : []
        })

      return { min: Math.min(...ys), max: Math.max(...ys) }
    })

    for (let i = 1; i < ranges.length; i++) expect(ranges[i]!.min).toBeGreaterThan(ranges[i - 1]!.max)
  })

  test("hierarchy wraps its outline into capped columns, indented by depth", () => {
    const model = buildFixtureGraph()
    const rows = 8
    const layout = layoutGraph(model, { strategy: "hierarchy", rows })
    const points = [...layout.positions.values()]

    // At most `rows` rows are used, so the fitted height stays legible; extra nodes wrap columns.
    expect(new Set(points.map((point) => point.y)).size).toBeLessThanOrEqual(rows)
    expect(new Set(points.map((point) => point.x)).size).toBeGreaterThan(rows)

    // Deeper kinds sit further right and further back.
    const session = point(layout, "session")!
    const tool = point(layout, toolNodeID("prt_tool_read_1"))!
    expect(tool.x).toBeGreaterThan(session.x)
    expect(tool.z).toBeGreaterThan(session.z)

    // Every node still has a position and two builds agree.
    expect(layout.positions.size).toBe(model.nodes.length)
    expect([...layoutGraph(model, { strategy: "hierarchy", rows }).positions.entries()]).toEqual([
      ...layout.positions.entries(),
    ])
  })
})
