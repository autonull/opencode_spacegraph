import { describe, expect, test } from "bun:test"
import type { SessionMessageInfo } from "@opencode/client/promise"
import { buildFixtureGraph } from "./fixture"
import { buildGraph, fileNodeID, toolNodeID, turnNodeID } from "./model"
import { CARD_SIZE, LANES, layoutGraph, nodeSize, type GraphLayout } from "./layout"
import { matrixLayout, ribbonLayout } from "./representation"
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

describe("layout — golden positions", () => {
  test("the fixture lands exactly where it did before the strategies moved to SpaceGraphJS", async () => {
    const golden = await Bun.file(new URL("./layout.golden.json", import.meta.url)).json()
    const model = buildFixtureGraph()

    expect({
      lanes: dump(layoutGraph(model)),
      overview: dump(layoutGraph(model, { level: "overview" })),
      execution: dump(layoutGraph(model, { level: "execution" })),
      timeline: dump(layoutGraph(model, { strategy: "timeline" })),
      hierarchy: dump(layoutGraph(model, { strategy: "hierarchy" })),
      tree: dump(layoutGraph(model, { strategy: "tree" })),
      force: dump(layoutGraph(model, { strategy: "force" })),
      ribbon: dump(ribbonLayout(model)),
      matrix: dump(matrixLayout(model)),
    }).toEqual(golden)
  })
})

/** The positions, the cluster bounds, and the overall bounds as plain rows. */
function dump(layout: GraphLayout) {
  const round = (value: number) => Math.round(value * 100) / 100

  return [
    ...[...layout.positions.entries()].map(([id, point]) => [id, round(point.x), round(point.y), round(point.z)]),
    ...[...layout.clusters.entries()].map(([id, bounds]) => [
      id,
      round(bounds.min.x),
      round(bounds.min.y),
      round(bounds.min.z),
      round(bounds.max.x),
      round(bounds.max.y),
      round(bounds.max.z),
    ]),
    [
      round(layout.bounds.min.x),
      round(layout.bounds.min.y),
      round(layout.bounds.min.z),
      round(layout.bounds.max.x),
      round(layout.bounds.max.y),
      round(layout.bounds.max.z),
    ],
  ]
}

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

    for (const id of before.positions.keys())
      expect(after.positions.get(id)).toEqual(before.positions.get(id))
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

    for (const id of before.positions.keys())
      expect(after.positions.get(id)).toEqual(before.positions.get(id))
  })
})

describe("layout — alternate strategies", () => {
  test("timeline and hierarchy are deterministic and place every node", () => {    const model = buildFixtureGraph()

    for (const strategy of ["timeline", "hierarchy"] as const) {
      const a = layoutGraph(model, { strategy })
      const b = layoutGraph(model, { strategy })
      expect(a.strategy).toBe(strategy)
      expect(a.positions.size).toBe(model.nodes.length)
      expect([...a.positions.entries()]).toEqual([...b.positions.entries()])
    }
  })

  test("timeline lays out turns as left-to-right columns with vertical wrapping", () => {
    const model = buildFixtureGraph()
    const columns = 4
    const layout = layoutGraph(model, { strategy: "timeline", columns })
    const points = [...layout.positions.values()]

    // Multiple turn columns: time flows left-to-right
    expect(new Set(points.map((point) => Math.floor(point.x / 100))).size).toBeGreaterThan(1)
    // A column never exceeds the wrapped column width (cards wrap vertically within each turn column)
    const maxX = Math.max(...points.map((point) => point.x))
    const turnColumnWidth = columns * (CARD_SIZE[0] + 24) + 48
    expect(maxX).toBeLessThan(model.turns.length * turnColumnWidth + turnColumnWidth)

    // No two cards in the same turn column AND same row overlap.
    const byColumnAndRow = new Map<string, { x: number; width: number }[]>()

    for (const node of model.nodes) {
      const point = layout.positions.get(node.id)!
      // Determine which turn column this node belongs to
      const col = Math.floor(point.x / turnColumnWidth)
      const row = Math.round(point.y / (CARD_SIZE[1] + 20))
      const key = `${col}:${row}`
      const colData = byColumnAndRow.get(key) ?? []
      colData.push({ x: point.x, width: nodeSize(node)[0] })
      byColumnAndRow.set(key, colData)
    }

    for (const colData of byColumnAndRow.values()) {
      const sorted = [...colData].sort((a, b) => a.x - b.x)

      for (let i = 1; i < sorted.length; i++)
        expect(sorted[i]!.x - sorted[i - 1]!.x).toBeGreaterThanOrEqual(
          (sorted[i]!.width + sorted[i - 1]!.width) / 2,
        )
    }
  })

  test("timeline emits a turn band for each turn spanning its column", () => {
    const model = buildFixtureGraph()
    const layout = layoutGraph(model, { strategy: "timeline", columns: 5 })

    for (const turnID of model.turns) {
      expect(layout.clusters.has(turnID)).toBe(true)
      const cluster = layout.clusters.get(turnID)!
      // Band spans horizontally across the turn's column
      expect(cluster.max.x - cluster.min.x).toBeGreaterThan(100)
    }
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

describe("layout — the tree and the force layout", () => {
  test("every layout is deterministic and places every node", () => {
    const model = buildFixtureGraph()

    for (const strategy of ["lanes", "timeline", "hierarchy", "tree", "force"] as const) {
      const a = layoutGraph(model, { strategy })
      const b = layoutGraph(model, { strategy })

      expect(a.strategy).toBe(strategy)
      expect(a.positions.size).toBe(model.nodes.length)
      expect([...a.positions.entries()]).toEqual([...b.positions.entries()])
    }
  })

  test("the tree hangs a node under the turn it belongs to", () => {
    const model = buildFixtureGraph()
    const layout = layoutGraph(model, { strategy: "tree" })
    const turn = point(layout, turnNodeID("msg_user_1"))!
    const tool = point(layout, toolNodeID("prt_tool_read_1"))!

    // The tree grows downward: the work sits a row below the turn it belongs to.
    expect(tool.y).toBeLessThan(turn.y)

    // And the turn sits over the middle of its own work.
    const members = model.nodes
      .filter((node) => node.turnID === turnNodeID("msg_user_1"))
      .map((node) => point(layout, node.id)!.x)

    expect(turn.x).toBeCloseTo((Math.min(...members) + Math.max(...members)) / 2, 5)
  })

  test("the tree keeps every placed node where it was when the session grows", () => {
    const base = [user("u1"), text("a1", "hi"), idle("i1")] satisfies SessionMessageInfo[]
    const extended = [...base, user("u2"), text("a2", "more"), idle("i2")] satisfies SessionMessageInfo[]
    const before = layoutGraph(buildGraph(base, { type: "idle" }), { strategy: "tree" })

    const after = layoutGraph(buildGraph(extended, { type: "idle" }), {
      strategy: "tree",
      previous: before.positions,
    })

    for (const id of before.positions.keys())
      expect(after.positions.get(id)).toEqual(before.positions.get(id))
  })

  test("the force layout keeps every placed node where it was when the session grows", () => {
    const base = [user("u1"), text("a1", "hi"), idle("i1")] satisfies SessionMessageInfo[]
    const extended = [...base, user("u2"), text("a2", "more"), idle("i2")] satisfies SessionMessageInfo[]
    const before = layoutGraph(buildGraph(base, { type: "idle" }), { strategy: "force" })

    const after = layoutGraph(buildGraph(extended, { type: "idle" }), {
      strategy: "force",
      previous: before.positions,
    })

    for (const id of before.positions.keys())
      expect(after.positions.get(id)).toEqual(before.positions.get(id))
  })

  test("the force layout keeps two cards from sitting on top of each other", () => {
    const model = buildFixtureGraph()
    const layout = layoutGraph(model, { strategy: "force" })
    const placed = model.nodes.map((node) => ({ node, position: point(layout, node.id)! }))

    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i]!
        const b = placed[j]!
        const distance = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y)

        expect(distance).toBeGreaterThanOrEqual(
          (nodeSize(a.node)[0] + nodeSize(b.node)[0]) / 2 - 1,
        )
      }
  })
})
