import { describe, expect, test } from "bun:test"
import { zoomModel } from "./adaptive"
import { buildFixtureGraph } from "./fixture"

describe("adaptive zoom", () => {
  test("overview keeps only overview nodes", () => {
    const model = buildFixtureGraph()
    const overview = zoomModel(model, "overview")

    expect(overview.nodes.some((node) => node.id === "session")).toBe(true)
    expect(overview.nodes.some((node) => node.id === "tool:prt_tool_read_1")).toBe(false)
  })

  test("execution reveals tool nodes", () => {
    const model = buildFixtureGraph()
    const execution = zoomModel(model, "execution")

    expect(execution.nodes.some((node) => node.id === "tool:prt_tool_read_1")).toBe(true)
  })

  test("expanded nodes override the level table", () => {
    const model = buildFixtureGraph()
    const expanded = zoomModel(model, "overview", new Set(["tool:prt_tool_read_1"]))

    expect(expanded.nodes.some((node) => node.id === "tool:prt_tool_read_1")).toBe(true)
    expect(
      expanded.edges.some(
        (edge) =>
          edge.source === "tool:prt_tool_read_1" || edge.target === "tool:prt_tool_read_1",
      ),
    ).toBe(true)
  })

  test("accepts a predicate for expansion", () => {
    const model = buildFixtureGraph()
    const expanded = zoomModel(
      model,
      "overview",
      (node) => node.id === "msg_plan_1:text:0",
    )

    expect(expanded.nodes.some((node) => node.id === "msg_plan_1:text:0")).toBe(true)
  })
})
