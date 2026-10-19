import { describe, expect, test } from "bun:test"
import { buildFixtureGraph } from "./fixture"
import { matrixLayout, representationLevel, ribbonLayout } from "./representation"
import { nodesAtLevel } from "./levels"
import { turnNodeID } from "./model"

describe("representation — ribbon and matrix layouts (LE.7–LE.9)", () => {
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

  test("only the graph representation keeps the level control", () => {
    expect(representationLevel("graph")).toBeUndefined()
    expect(representationLevel("ribbon")).toBe("overview")
    expect(representationLevel("matrix")).toBe("overview")
  })
})
