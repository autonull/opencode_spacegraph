import { describe, expect, test } from "bun:test"
import { buildFixtureGraph, CHANGED_FILES } from "./fixture"
import { fileNodeID, messageNodeID, resultNodeID, subagentNodeID, toolNodeID, turnNodeID } from "./model"
import {
  ancestors,
  breadcrumbs,
  changedFiles,
  forwardChain,
  openInTranscript,
  outgoing,
  search,
  shortestPath,
  subtree,
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

  test("a provenance file derives a path through the tool that wrote it (T1.9)", () => {
    const path = breadcrumbs(model, fileNodeID("src/auth/token.ts")).map((node) => node.id)

    expect(path[0]).toBe("session")
    expect(path.at(-1)).toBe(fileNodeID("src/auth/token.ts"))
    expect(path).toContain(toolNodeID("prt_tool_write_1"))
    expect(path.length).toBeGreaterThan(2)
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

describe("selectors — changed files (LE.12 file-first rail)", () => {
  test("lists exactly the files the session wrote, with their writers", () => {
    const files = changedFiles(model)

    expect(files.map((file) => file.path).sort()).toEqual([...CHANGED_FILES].sort())

    for (const file of files) expect(file.writers.length).toBeGreaterThan(0)
  })

  test("a written file names the tool that produced it and the reads into it", () => {
    const token = changedFiles(model).find((file) => file.path === "src/auth/token.ts")!

    expect(token.writers).toContain(toolNodeID("prt_tool_write_1"))
    expect(token.id).toBe(fileNodeID("src/auth/token.ts"))
  })

  test("a file that was only read never appears", () => {
    const readOnly = model.nodes.find((node) => node.kind === "file" && node.label === "src/auth/store.ts")

    expect(readOnly).toBeDefined()
    expect(changedFiles(model).some((file) => file.path === "src/auth/store.ts")).toBe(false)
  })
})

describe("selectors — subtree (U3.11 breadcrumb fit)", () => {
  test("the session subtree is every node, including provenance files", () => {
    expect(subtree(model, "session")).toHaveLength(model.nodes.length)
    expect(subtree(model, "session").some((node) => node.kind === "file")).toBe(true)
  })

  test("a turn subtree spans its own activity and files, not the session root", () => {
    const ids = subtree(model, turnNodeID("msg_user_1")).map((node) => node.id)

    expect(ids).toContain(toolNodeID("prt_tool_write_1"))
    expect(ids.some((id) => id.startsWith("file:"))).toBe(true)
    expect(ids).not.toContain("session")
  })

  test("a leaf file is just itself", () => {
    expect(subtree(model, fileNodeID("src/auth/token.ts")).map((node) => node.id)).toEqual([
      fileNodeID("src/auth/token.ts"),
    ])
  })

  test("a derived phase frames its whole cluster", () => {
    const phase = model.nodes.find((node) => node.kind === "phase")!
    const ids = subtree(model, phase.id).map((node) => node.id)

    for (const member of phase.clusterOf!) expect(ids).toContain(member)
  })

  test("an unknown node has no subtree", () => {
    expect(subtree(model, "missing")).toEqual([])
  })
})
