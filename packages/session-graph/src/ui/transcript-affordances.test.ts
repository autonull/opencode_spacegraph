import { describe, expect, test } from "bun:test"
import type { GraphViewData } from "@opencode/session-ui/graph"
import { buildTurnAffordances } from "./transcript-affordances"

function model(nodes: GraphViewData["nodes"]): GraphViewData {
  return { root: "session", nodes, edges: [], turns: [], turnByMessageID: new Map() }
}

// M4 — a collapsed transcript must not scan the graph once per row. The surface builds this map in
// one pass and each row reads its own entry.
describe("turn affordances", () => {
  test("a turn with a failure offers Why and a healthy one offers nothing", () => {
    const affordances = buildTurnAffordances(
      model([
        { id: "turn:bad", kind: "turn", label: "bad", status: "failed", turnID: "turn:bad" },
        { id: "turn:ok", kind: "turn", label: "ok", status: "success", turnID: "turn:ok" },
      ]),
    )

    expect(affordances.get("turn:bad")).toEqual({ why: true })
    expect(affordances.has("turn:ok")).toBe(false)
  })

  test("a failed child marks the whole turn", () => {
    const affordances = buildTurnAffordances(
      model([
        { id: "turn:child", kind: "turn", label: "turn", status: "neutral", turnID: "turn:child" },
        { id: "result:child", kind: "result", label: "3 pass 1 fail", status: "failed", turnID: "turn:child" },
      ]),
    )

    expect(affordances.get("turn:child")).toEqual({ why: true })
  })

  test("a delegation turn offers Expand and its subagent chip", () => {
    const affordances = buildTurnAffordances(
      model([
        { id: "turn:sub", kind: "turn", label: "turn", status: "neutral", turnID: "turn:sub" },
        { id: "subagent:1", kind: "subagent", label: "explore", status: "success", turnID: "turn:sub" },
      ]),
    )

    expect(affordances.get("turn:sub")).toEqual({ expand: true, subagent: true })
  })
})
