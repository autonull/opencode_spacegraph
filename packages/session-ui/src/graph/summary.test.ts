import { describe, expect, test } from "bun:test"
import { buildFixtureGraph } from "./fixture"
import { matrixColumn, matrixLayout, ribbonLayout, summaryUnits, turnRows } from "./summary"
import { nodesAtLevel } from "./levels"
import { nodeSize } from "./layout"
import { turnNodeID } from "./model"

describe("summary layouts — the ribbon and the matrix (LE.7–LE.9)", () => {
  test("both are deterministic and place every overview-visible node", () => {
    const model = buildFixtureGraph()
    const ribbon = ribbonLayout(model)
    const matrix = matrixLayout(model)
    const visible = nodesAtLevel(model, "overview")

    expect([...ribbon.positions.entries()]).toEqual([...ribbonLayout(buildFixtureGraph()).positions.entries()])
    expect([...matrix.positions.entries()]).toEqual([...matrixLayout(buildFixtureGraph()).positions.entries()])
    expect(ribbon.positions.size).toBe(visible.length)
    expect(matrix.positions.size).toBe(visible.length)
  })

  test("a ribbon puts each turn's header and phase segments on one row", () => {
    const model = buildFixtureGraph()
    const positions = ribbonLayout(model).positions
    const turn = turnNodeID("msg_user_1")
    const turnY = positions.get(turn)!.y
    const members = nodesAtLevel(model, "overview").filter((node) => node.turnID === turn || node.id === turn)

    // A long turn wraps onto further lines, so members sit on the header's line or below it.
    for (const node of members) expect(positions.get(node.id)!.y).toBeGreaterThanOrEqual(turnY)

    // The header leads its first line, so the first phase segment sits to its right on that line.
    const phase = model.nodes.find((node) => node.kind === "phase" && node.turnID === turn)!
    expect(positions.get(phase.id)!.y).toBe(turnY)
    expect(positions.get(phase.id)!.x).toBeGreaterThan(positions.get(turn)!.x)
  })

  test("a matrix aligns a turn's phases by category across the row", () => {
    const model = buildFixtureGraph()
    const positions = matrixLayout(model).positions
    const turnNode = turnNodeID("msg_user_1")
    const turnRow = positions.get(turnNode)!.y
    const turnX = positions.get(turnNode)!.x
    const phases = model.nodes.filter((node) => node.kind === "phase" && node.turnID === turnNode)

    expect(phases.length).toBeGreaterThan(0)

    for (const phase of phases) {
      const point = positions.get(phase.id)!
      expect(point.y).toBe(turnRow)
      expect(point.x).toBeGreaterThan(turnX)
    }
  })

  test("ribbon and matrix never overlap two segments or cells (T1.11)", () => {
    const model = buildFixtureGraph()
    const visible = nodesAtLevel(model, "overview")

    for (const layout of [ribbonLayout(model), matrixLayout(model)]) {
      const placed = visible.map((node) => ({ node, point: layout.positions.get(node.id)! }))

      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const [a, b] = [placed[i]!, placed[j]!]

          if (Math.abs(a.point.y - b.point.y) >= 1) continue

          const gap = Math.abs(a.point.x - b.point.x) - (nodeSize(a.node)[0] + nodeSize(b.node)[0]) / 2
          expect(gap).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })
})

describe("the level is the grain, in the summaries too (T17.2)", () => {
  test("a phase stands for its work at the overview", () => {
    const model = buildFixtureGraph()
    const phase = model.nodes.find((node) => node.kind === "phase" && node.clusterOf!.length > 0)!
    const member = model.nodes.find((node) => node.id === phase.clusterOf![0])!
    const positions = ribbonLayout(model, { level: "overview" }).positions

    expect(positions.get(phase.id)).toBeDefined()
    expect(positions.get(member.id)).toBeUndefined()
  })

  test("below the overview the work stands for itself", () => {
    const model = buildFixtureGraph()
    const phase = model.nodes.find((node) => node.kind === "phase" && node.clusterOf!.length > 0)!
    const member = model.nodes.find((node) => node.id === phase.clusterOf![0])!
    const positions = ribbonLayout(model, { level: "execution" }).positions

    expect(positions.get(phase.id)).toBeUndefined()
    expect(positions.get(member.id)).toBeDefined()
  })

  test("a row never counts the same work twice", () => {
    const model = buildFixtureGraph()
    const units = summaryUnits(model, "execution")

    for (const phase of model.nodes.filter((node) => node.kind === "phase")) {
      const members = phase.clusterOf ?? []
      if (!members.some((id) => units.has(id))) continue
      expect(units.has(phase.id)).toBe(false)
    }
  })

  test("a member takes the column of the cluster that stands for it", () => {
    const model = buildFixtureGraph()
    const phase = model.nodes.find((node) => node.kind === "phase" && node.clusterOf!.length > 0)!
    const member = model.nodes.find((node) => node.id === phase.clusterOf![0])!

    expect(matrixColumn(model, member)).toBe(matrixColumn(model, phase))
    expect(matrixColumn(model, member)).not.toBe(0)
  })

  test("the matrix holds a phase's work in the phase's cell", () => {
    const model = buildFixtureGraph()
    const phase = model.nodes.find((node) => node.kind === "phase" && node.clusterOf!.length > 0)!
    const member = model.nodes.find((node) => node.id === phase.clusterOf![0])!
    const positions = matrixLayout(model, { level: "execution" }).positions

    expect(positions.get(member.id)!.y).toBe(positions.get(phase.turnID!)!.y)
  })

  test("the rows of a summary are the same at every level", () => {
    const model = buildFixtureGraph()

    expect(turnRows(model, "overview").length).toBe(turnRows(model, "execution").length)
    expect(turnRows(model, "overview").length).toBe(model.turns.length + 1)
  })
})
