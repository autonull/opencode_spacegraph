import { describe, expect, test } from "bun:test"
import { buildFixtureGraph } from "./fixture"
import { fileNodeID, toolNodeID, turnNodeID } from "./model"
import {
  clusterCount,
  domBudget,
  edgesAtLevel,
  isClusterExpanded,
  isVisibleAt,
  labelMode,
  nodesAtLevel,
} from "./levels"

const model = buildFixtureGraph()

const idsAt = (level: Parameters<typeof nodesAtLevel>[1]) =>
  new Set(nodesAtLevel(model, level).map((node) => node.id))

describe("semantic levels — node visibility", () => {
  test("overview keeps the session, turns, goal and phase clusters but hides individual work", () => {
    const ids = idsAt("overview")

    expect(ids.has("session")).toBe(true)
    expect(ids.has(turnNodeID("msg_user_1"))).toBe(true)
    expect(ids.has("msg:msg_user_1")).toBe(true)
    expect(ids.has(toolNodeID("prt_tool_read_1"))).toBe(false)
    expect(ids.has(fileNodeID("src/auth/session.ts"))).toBe(false)
    expect(model.nodes.filter((node) => node.kind === "phase" && ids.has(node.id))).toHaveLength(8)
  })

  test("execution reveals tools and provenance files but not reasoning or notices", () => {
    const ids = idsAt("execution")

    expect(ids.has(toolNodeID("prt_tool_read_1"))).toBe(true)
    expect(ids.has(fileNodeID("src/auth/session.ts"))).toBe(true)
    expect(ids.has("msg:msg_synthetic_1")).toBe(false)
  })

  test("detail is a superset of execution and adds the notice", () => {
    const execution = idsAt("execution")
    const detail = idsAt("detail")

    expect(detail.has("msg:msg_synthetic_1")).toBe(true)
    for (const id of execution) expect(detail.has(id)).toBe(true)
  })

  test("hidden nodes are not visible for interaction", () => {
    const tool = model.nodes.find((node) => node.kind === "tool")!

    expect(isVisibleAt(tool, "overview")).toBe(false)
    expect(isVisibleAt(tool, "execution")).toBe(true)
  })
})

describe("semantic levels — edges", () => {
  test("overview keeps only the hierarchy", () => {
    const kinds = new Set(edgesAtLevel(model, "overview").map((edge) => edge.kind))

    expect([...kinds]).toEqual(["part-of"])
  })

  test("execution adds provenance and sequence", () => {
    const kinds = new Set(edgesAtLevel(model, "execution").map((edge) => edge.kind))

    expect(kinds.has("writes")).toBe(true)
    expect(kinds.has("produces")).toBe(true)
    expect(kinds.has("sequence")).toBe(true)
  })

  test("every edge has both endpoints visible at the level", () => {
    for (const level of ["overview", "execution", "detail"] as const) {
      const ids = idsAt(level)

      for (const edge of edgesAtLevel(model, level)) {
        expect(ids.has(edge.source)).toBe(true)
        expect(ids.has(edge.target)).toBe(true)
      }
    }
  })

  test("execution with a focus drops edges outside the neighborhood", () => {
    const focus = toolNodeID("prt_tool_write_1")
    const edges = edgesAtLevel(model, "execution", focus)

    expect(edges.some((edge) => edge.kind === "writes" && edge.source === focus)).toBe(true)
    expect(edges.some((edge) => edge.kind === "reads" && edge.source === toolNodeID("prt_tool_read_1"))).toBe(false)
  })
})

describe("semantic levels — clusters and budgets", () => {
  test("a cluster count matches its members", () => {
    const explore = model.nodes.find((node) => node.id === "phase:turn:msg_user_1:explore:1")!

    expect(clusterCount(explore)).toBe(5)
  })

  test("clusters expand after overview and budgets are per level", () => {
    expect(isClusterExpanded("overview")).toBe(false)
    expect(isClusterExpanded("execution")).toBe(true)
    expect(domBudget("overview")).toBe(12)
    expect(domBudget("execution")).toBe(40)
    expect(labelMode("detail")).toBe("constant")
  })
})
