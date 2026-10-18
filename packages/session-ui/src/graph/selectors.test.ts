import { describe, expect, test } from "bun:test"
import { buildFixtureGraph } from "./fixture"
import { fileNodeID, messageNodeID, resultNodeID, subagentNodeID, toolNodeID, turnNodeID } from "./model"
import {
  ancestors,
  breadcrumbs,
  forwardChain,
  openInTranscript,
  outgoing,
  search,
  shortestPath,
  turnSubgraph,
  why,
} from "./selectors"

const model = buildFixtureGraph()

describe("selectors — the five mission questions", () => {
  test("1. why did the agent change this file? — provenance points back to its tools", () => {
    const token = fileNodeID("src/auth/token.ts")
    const writers = why(model, token).incoming.filter((edge) => edge.kind === "writes")

    expect(writers.map((edge) => edge.source)).toContain(toolNodeID("prt_tool_write_1"))
    expect(breadcrumbs(model, toolNodeID("prt_tool_write_1")).map((node) => node.id)).toEqual([
      "session",
      turnNodeID("msg_user_1"),
      toolNodeID("prt_tool_write_1"),
    ])
  })

  test("2. which tool calls led to this failure? — the producing tool reaches the failed result", () => {
    const failed = model.nodes.find((node) => node.kind === "result" && node.status === "failed")
    const producedBy = why(model, failed!.id).incoming.filter((edge) => edge.kind === "produces")

    expect(producedBy.map((edge) => edge.source)).toEqual([toolNodeID("prt_tool_shell_2")])
    expect(shortestPath(model, toolNodeID("prt_tool_shell_2"), failed!.id)).toEqual([
      toolNodeID("prt_tool_shell_2"),
      resultNodeID("prt_tool_shell_2"),
    ])
  })

  test("3. what did the subagent contribute? — its turn and completion are linked", () => {
    const sub = subagentNodeID("ses_child_auth")

    expect(ancestors(model, sub)[0]?.id).toBe(turnNodeID("msg_user_1"))
    expect(model.edges.some((edge) => edge.kind === "delegates" && edge.target === sub)).toBe(true)
  })

  test("4. which changes were made after the failing test? — the forward chain lists them in order", () => {
    const after = forwardChain(model, resultNodeID("prt_tool_shell_2")).map((node) => node.id)

    expect(after).toContain(toolNodeID("prt_tool_edit_2"))
    expect(after).toContain(toolNodeID("prt_tool_shell_3"))
    // The recovery run is the last step of the failing turn; the second turn begins after it.
    expect(after).not.toContain(toolNodeID("prt_tool_edit_3"))
    expect(model.turns.indexOf(turnNodeID("msg_user_1"))).toBeLessThan(model.turns.indexOf(turnNodeID("msg_user_2")))
  })

  test("5. where did the agent retry? — retry nodes are discoverable and evidence-linked", () => {
    const retries = model.nodes.filter((node) => node.kind === "retry")

    expect(retries).toHaveLength(1)
    expect(model.edges.some((edge) => edge.kind === "evidence" && edge.target === retries[0]!.id)).toBe(true)
  })
})

describe("selectors — search and transcript refs", () => {
  test("searching a file path finds every provenance node", () => {
    const hits = search(model, "src/auth/token.ts").map((node) => node.id)

    expect(hits).toContain(fileNodeID("src/auth/token.ts"))
    expect(hits).toContain(toolNodeID("prt_tool_write_1"))
  })

  test("openInTranscript returns the message a node came from", () => {
    expect(openInTranscript(model, toolNodeID("prt_tool_shell_2"))).toEqual({
      messageID: "msg_verify_1",
      partID: "prt_tool_shell_2",
    })
    expect(openInTranscript(model, messageNodeID("msg_user_1"))).toEqual({ messageID: "msg_user_1", partID: undefined })
  })

  test("a turn's outgoing edges are its statement of children", () => {
    const turn = turnNodeID("msg_user_1")

    expect(outgoing(model, turn).every((edge) => edge.source === turn)).toBe(true)
  })
})

describe("selectors — turn subgraph (hybrid H6.2/H6.4)", () => {
  test("caps the turn plus its highest-signal children at the limit", () => {
    const sub = turnSubgraph(model, turnNodeID("msg_user_1"), 7)

    expect(sub.nodes).toHaveLength(7)
    expect(sub.nodes[0]!.id).toBe(turnNodeID("msg_user_1"))
    expect(sub.nodes.some((node) => node.kind === "phase")).toBe(true)
  })

  test("a lower limit still keeps the turn and prefers phases over raw tools", () => {
    const sub = turnSubgraph(model, turnNodeID("msg_user_1"), 3)
    const kinds = sub.nodes.map((node) => node.kind)

    expect(sub.nodes).toHaveLength(3)
    expect(sub.nodes[0]!.id).toBe(turnNodeID("msg_user_1"))
    expect(kinds.filter((kind) => kind === "phase")).toHaveLength(2)
  })

  test("every edge connects two included nodes and no inference creeps in", () => {
    const sub = turnSubgraph(model, turnNodeID("msg_user_1"), 7)
    const ids = new Set(sub.nodes.map((node) => node.id))

    expect(sub.edges.every((edge) => ids.has(edge.source) && ids.has(edge.target))).toBe(true)
    expect(sub.edges.some((edge) => edge.kind === "inferred-cause")).toBe(false)
  })

  test("an unknown turn is an empty subgraph", () => {
    expect(turnSubgraph(model, "turn:missing", 7)).toEqual({ nodes: [], edges: [] })
  })
})
