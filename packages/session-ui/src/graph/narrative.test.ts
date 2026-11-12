import { describe, expect, test } from "bun:test"
import { buildFixtureGraph, buildNarrativeFixtureGraph } from "./fixture"
import { STUDY_TASKS } from "./study"
import type { GraphViewData } from "./model"

const node = (model: GraphViewData, id: string) => model.nodes.find((item) => item.id === id)
const order = (model: GraphViewData, id: string) => model.nodes.findIndex((item) => item.id === id)
const writes = (model: GraphViewData, source: string, target: string) =>
  model.edges.some((edge) => edge.kind === "writes" && edge.source === source && edge.target === target)

describe("M7 study tasks on the canonical fixture", () => {
  const model = buildFixtureGraph()

  test("the five pre-registered questions have concrete fixture answers", () => {
    expect(STUDY_TASKS.map((task) => task.id)).toEqual([
      "why-session",
      "led-to-failure",
      "subagent",
      "after-failure",
      "direction-change",
    ])
    expect(STUDY_TASKS.every((task) => task.question.length > 0 && task.expected.length > 0)).toBe(true)
  })

  test("why did the agent change src/auth/session.ts", () => {
    const failure = node(model, "result:prt_tool_shell_2")
    const error = node(model, "err:msg_retry_1:assistant")

    expect(failure?.status).toBe("failed")
    expect(failure?.summary).toContain("FAIL auth refresh token")
    expect(error?.summary).toBe("Expected refresh token to be stored")
    expect(writes(model, "tool:prt_tool_edit_1", "file:src/auth/session.ts")).toBe(true)
  })

  test("the verify shell calls led to the failing test", () => {
    expect(node(model, "tool:prt_tool_shell_1")?.data?.input).toMatchObject({ command: "bun test src/auth/session.test.ts" })
    expect(node(model, "tool:prt_tool_shell_2")?.data?.input).toMatchObject({ command: "bun test" })
    expect(model.edges).toContainEqual(expect.objectContaining({ kind: "produces", source: "tool:prt_tool_shell_2", target: "result:prt_tool_shell_2" }))
    expect(model.edges).toContainEqual(expect.objectContaining({ kind: "sequence", source: "result:prt_tool_shell_2", target: "tool:prt_tool_edit_2" }))
  })

  test("the subagent contributed the refresh path", () => {
    const subagent = node(model, "sub:ses_child_auth")

    expect(subagent?.label).toBe("Authentication design")
    expect(subagent?.data).toMatchObject({ childSessionID: "ses_child_auth" })
    expect(node(model, "msg:msg_synthetic_1")?.data).toMatchObject({ childSessionID: "ses_child_auth" })
  })

  test("changes after the failure are the refresh-path edits", () => {
    const failed = order(model, "result:prt_tool_shell_2")

    expect(order(model, "tool:prt_tool_edit_2")).toBeGreaterThan(failed)
    expect(order(model, "result:prt_tool_shell_3")).toBeGreaterThan(failed)
    expect(order(model, "tool:prt_tool_edit_3")).toBeGreaterThan(failed)
    expect(node(model, "result:prt_tool_shell_3")?.summary).toBe("3 pass 0 fail")
    expect(node(model, "result:prt_tool_shell_4")?.summary).toBe("4 pass 0 fail")
  })

  test("the retry marks where the agent changed direction", () => {
    const retry = node(model, "retry:msg_retry_1:2")

    expect(retry?.data).toMatchObject({ attempt: 2 })
    expect(order(model, "tool:prt_tool_edit_2")).toBeLessThan(order(model, "err:msg_retry_1:assistant"))
    expect(order(model, "err:msg_retry_1:assistant")).toBeLessThan(order(model, "retry:msg_retry_1:2"))
    expect(order(model, "retry:msg_retry_1:2")).toBeLessThan(order(model, "result:prt_tool_shell_3"))
  })
})

describe("M7 canonical narrative fixture", () => {
  const model = buildNarrativeFixtureGraph()

  test("one turn tells the whole story in order", () => {
    expect(model.turns).toHaveLength(1)

    const steps = [
      "result:prt_narr_shell_1",
      "tool:prt_narr_edit_1",
      "msg_narr_cause_1:text:0",
      "tool:prt_narr_edit_2",
      "result:prt_narr_shell_3",
      "sub:ses_child_verify",
      "msg_narr_share_1:text:0",
    ]
    const positions = steps.map((id) => order(model, id))

    expect(positions.every((position) => position >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  test("the failing test comes first and the wrong fix keeps failing", () => {
    expect(node(model, "result:prt_narr_shell_1")?.summary).toContain("FAIL")
    expect(node(model, "result:prt_narr_shell_2")?.summary).toContain("FAIL")
    expect(writes(model, "tool:prt_narr_edit_1", "file:src/auth/token.ts")).toBe(true)
  })

  test("the root cause names the store, then the correct fix writes the session token", () => {
    expect(node(model, "msg_narr_cause_1:text:0")?.summary).toContain("Root cause")
    expect(node(model, "msg_narr_cause_1:text:0")?.summary).toContain("store")
    expect(writes(model, "tool:prt_narr_edit_2", "file:src/auth/session.ts")).toBe(true)
    expect(node(model, "result:prt_narr_shell_3")?.summary).toBe("3 pass 0 fail")
  })

  test("the subagent verifies the fix and the story ends with a share", () => {
    const subagent = node(model, "sub:ses_child_verify")

    expect(subagent?.label).toContain("Verify refresh rotation")
    expect(subagent?.data).toMatchObject({ childSessionID: "ses_child_verify" })
    expect(node(model, "msg_narr_share_1:text:0")?.summary).toContain("#spacegraph")
  })
})
