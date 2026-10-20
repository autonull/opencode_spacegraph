import { describe, expect, test } from "bun:test"
import type { JsonValue, SessionMessageAssistantTool, SessionMessageInfo } from "@opencode/client/promise"
import {
  buildGraph,
  fileNodeID,
  messageNodeID,
  subagentNodeID,
  toolNodeID,
  turnNodeID,
  type EdgeKind,
  type GraphModel,
  type NodeKind,
} from "./model"
import { buildFixtureGraph, buildFixtureMessages, buildInterruptedFixtureMessages, CHANGED_FILES } from "./fixture"

const nodesOf = (model: GraphModel, kind: NodeKind) => model.nodes.filter((node) => node.kind === kind)

const edgesOf = (model: GraphModel, kind: EdgeKind) => model.edges.filter((edge) => edge.kind === kind)

const ids = (model: GraphModel) => model.nodes.map((node) => node.id)

const idle = (id: string) => ({ id, type: "idle", outcome: "succeeded", time: { created: 1 } }) as const

const user = (id: string, text = id) => ({ id, type: "user", text, time: { created: 1 } }) as const

const text = (messageID: string, body: string): SessionMessageInfo => ({
  id: messageID,
  type: "assistant",
  agent: "build",
  model: { id: "m", providerID: "p" },
  content: [{ type: "text", text: body }],
  time: { created: 1, completed: 2 },
})

describe("graph model — turn ownership", () => {
  test("reuses the timeline turn walk: a steered prompt joins the opening turn", () => {
    const messages = [
      user("u1", "open"),
      text("a1", "first"),
      user("u2", "steer"),
      text("a2", "second"),
      idle("i1"),
    ] satisfies SessionMessageInfo[]

    const model = buildGraph(messages, { type: "idle" })

    expect(model.turns).toEqual([turnNodeID("u1")])
    expect(model.turnByMessageID.get("u2")).toBe("u1")
    expect(model.turnByMessageID.get("a2")).toBe("u1")
    expect(ids(model)).toContain(messageNodeID("u2"))
  })

  test("a shell-only run is its own turn and owns the idle", () => {
    const messages = [
      {
        id: "s1",
        type: "shell",
        shellID: "sh",
        command: "ls",
        status: "exited",
        exit: 0,
        time: { created: 1, completed: 2 },
      },
      idle("i1"),
    ] satisfies SessionMessageInfo[]

    const model = buildGraph(messages, { type: "idle" })

    expect(model.turns).toEqual([turnNodeID("s1")])
    expect(model.turnByMessageID.get("i1")).toBe("s1")
    expect(nodesOf(model, "result")[0]?.status).toBe("success")
  })

  test("an interrupted idle produces an interrupted error node", () => {
    const model = buildGraph(buildInterruptedFixtureMessages(), { type: "idle" })
    const error = nodesOf(model, "error").at(-1)

    expect(error?.status).toBe("interrupted")
  })
})

describe("graph model — stable identity", () => {
  const model = buildFixtureGraph()

  test("the session root carries the goal", () => {
    const session = nodesOf(model, "session")[0]

    expect(session?.id).toBe("session")
    expect(session?.summary).toBe("Fix the authentication test failures.")
    expect(model.goal).toBe("Fix the authentication test failures.")
  })

  test("turns use the opening prompt, not the steered prompt", () => {
    expect(model.turns).toEqual([turnNodeID("msg_user_1"), turnNodeID("msg_user_2")])
  })

  test("file node IDs normalize separators and strip a leading dot-slash", () => {
    expect(fileNodeID("./src\\auth\\session.ts")).toBe("file:src/auth/session.ts")
  })
})

describe("graph model — provenance and delegation", () => {
  const model = buildFixtureGraph()

  test("a file touched by several tools keeps one node and many edges", () => {
    const session = fileNodeID("src/auth/session.ts")

    expect(nodesOf(model, "file").filter((node) => node.id === session)).toHaveLength(1)
    expect(model.edges.filter((edge) => edge.target === session).length).toBeGreaterThan(1)
  })

  test("reads record provenance without counting as changed files", () => {
    const reads = edgesOf(model, "reads").map((edge) => edge.target)

    expect(reads).toContain(fileNodeID("src/auth/store.ts"))
    expect(model.nodes.find((node) => node.id === fileNodeID("src/auth/store.ts"))?.kind).toBe("file")
  })

  test("the subagent node is keyed by child session and the completion links to it", () => {
    expect(ids(model)).toContain(subagentNodeID("ses_child_auth"))
    const delegate = edgesOf(model, "delegates").find((edge) => edge.target === subagentNodeID("ses_child_auth"))

    expect(delegate?.source).toBe(messageNodeID("msg_synthetic_1"))
  })

  test("a tool with an unknown name becomes a generic tool node without throwing", () => {
    const messages = [
      user("u1"),
      {
        id: "a1",
        type: "assistant",
        agent: "build",
        model: { id: "m", providerID: "p" },
        content: [
          {
            type: "tool",
            id: "t_mystery",
            name: "mystery",
            state: { status: "completed", input: {}, content: [{ type: "text", text: "ok" }] },
            time: { created: 1, completed: 2 },
          },
        ],
        time: { created: 1, completed: 2 },
      },
      idle("i1"),
    ] satisfies SessionMessageInfo[]

    expect(ids(buildGraph(messages, { type: "idle" }))).toContain(toolNodeID("t_mystery"))
  })

  test("malformed tool metadata and streaming JSON do not throw", () => {
    const messages = [
      user("u1"),
      {
        id: "a1",
        type: "assistant",
        agent: "build",
        model: { id: "m", providerID: "p" },
        content: [
          {
            type: "tool",
            id: "t_bad",
            name: "edit",
            state: { status: "completed", input: {}, content: [{ type: "text", text: "x" }], metadata: { files: "nope" } },
            time: { created: 1, completed: 2 },
          },
          {
            type: "tool",
            id: "t_stream",
            name: "read",
            state: { status: "streaming", input: "{not json" },
            time: { created: 1 },
          },
        ],
        time: { created: 1, completed: 2 },
      },
      idle("i1"),
    ] satisfies SessionMessageInfo[]

    expect(() => buildGraph(messages, { type: "idle" })).not.toThrow()
  })
})

describe("graph model — failure and retry", () => {
  const model = buildFixtureGraph()

  test("the fixture produces exactly one failed result and one retry", () => {
    expect(nodesOf(model, "result").filter((node) => node.status === "failed")).toHaveLength(1)
    expect(nodesOf(model, "retry")).toHaveLength(1)
  })

  test("the retry is shaped by preceding evidence", () => {
    const retry = nodesOf(model, "retry")[0]

    expect(retry?.label).toBe("Retry #2")
    expect(edgesOf(model, "evidence").some((edge) => edge.target === retry?.id)).toBe(true)
  })

  test("the idle diff lists every changed file of the turn", () => {
    const diff = nodesOf(model, "diff")[0]

    expect(diff?.data?.files).toEqual([...CHANGED_FILES])
  })
})

describe("graph model — terminal output", () => {
  test("a shell result carries the full ANSI-stripped output for the inspector", () => {
    const messages = [
      {
        id: "s1",
        type: "shell",
        shellID: "sh",
        command: "bun test",
        status: "exited",
        exit: 1,
        output: {
          output: "\u001b[31mFAIL\u001b[0m src/auth/session.test.ts\r\n  expected 1 to be 2",
          cursor: 0,
          size: 1,
          truncated: false,
        },
        time: { created: 1, completed: 2 },
      },
      idle("i1"),
    ] satisfies SessionMessageInfo[]

    const result = nodesOf(buildGraph(messages, { type: "idle" }), "result")[0]

    expect(result?.data?.output).toBe("FAIL src/auth/session.test.ts\n  expected 1 to be 2")
  })
})

describe("graph model — invariants", () => {
  test("no inferred-cause edge is created from adjacency", () => {
    const model = buildFixtureGraph()

    expect(edgesOf(model, "inferred-cause")).toHaveLength(0)
  })

  test("construction is pure: two builds are equal and inputs are untouched", () => {
    const messages = buildFixtureMessages()
    const before = structuredClone(messages)
    const a = buildGraph(messages, { type: "idle" })
    const b = buildGraph(messages, { type: "idle" })

    expect(a.nodes.map((node) => node.id)).toEqual(b.nodes.map((node) => node.id))
    expect(a.edges.map((edge) => edge.id)).toEqual(b.edges.map((edge) => edge.id))
    expect(messages).toEqual(before)
  })
})

const toolPart = (id: string, name: string, input: Record<string, JsonValue>): SessionMessageAssistantTool => ({
  type: "tool",
  id,
  name,
  state: { status: "completed", input, content: [{ type: "text", text: "ok" }] },
  time: { created: 1, completed: 2 },
})

const assistantWith = (id: string, content: SessionMessageAssistantTool[]): SessionMessageInfo => ({
  id,
  type: "assistant",
  agent: "build",
  model: { id: "m", providerID: "p" },
  content,
  time: { created: 1, completed: 2 },
})

describe("graph model — semantic phases", () => {
  const model = buildFixtureGraph()

  test("consecutive tools of one kind collapse into a phase with ordered membership", () => {
    const phases = nodesOf(model, "phase")

    expect(phases.map((phase) => phase.id)).toEqual([
      "phase:turn:msg_user_1:explore:1",
      "phase:turn:msg_user_1:delegate:2",
      "phase:turn:msg_user_1:edit:3",
      "phase:turn:msg_user_1:verify:4",
      "phase:turn:msg_user_1:edit:5",
      "phase:turn:msg_user_1:verify:6",
      "phase:turn:msg_user_2:edit:1",
      "phase:turn:msg_user_2:verify:2",
    ])
    expect(phases[0]?.clusterOf).toEqual([
      toolNodeID("prt_tool_glob_1"),
      toolNodeID("prt_tool_grep_1"),
      toolNodeID("prt_tool_read_1"),
      toolNodeID("prt_tool_read_2"),
      toolNodeID("prt_tool_read_3"),
    ])
  })

  test("a phase node is derived, carries its category, and belongs to its turn", () => {
    const phase = model.nodes.find((node) => node.id === "phase:turn:msg_user_1:edit:3")

    expect(phase?.derived).toBe(true)
    expect(phase?.data?.category).toBe("edit")
    expect(phase?.turnID).toBe(turnNodeID("msg_user_1"))
    expect(
      model.edges.some(
        (edge) => edge.kind === "part-of" && edge.source === phase?.id && edge.target === turnNodeID("msg_user_1"),
      ),
    ).toBe(true)
  })

  test("a category change starts a new cluster", () => {
    const messages = [
      user("u1"),
      assistantWith("a1", [
        toolPart("t_read_1", "read", { path: "a.ts" }),
        toolPart("t_edit_1", "edit", { path: "b.ts" }),
        toolPart("t_read_2", "read", { path: "c.ts" }),
      ]),
      idle("i1"),
    ] satisfies SessionMessageInfo[]

    const phases = nodesOf(buildGraph(messages, { type: "idle" }), "phase")

    expect(phases.map((phase) => phase.data?.category)).toEqual(["explore", "edit", "explore"])
  })
})

describe("model — session identity (T3.6)", () => {
  test("the root node carries the session id while its literal id stays", () => {
    const model = buildGraph(buildFixtureMessages(), { type: "idle" }, "ses_abc")

    expect(model.root).toBe("session")
    expect(model.nodes.find((node) => node.id === model.root)?.data?.sessionID).toBe("ses_abc")
  })

  test("a model built without a session id carries none", () => {
    const model = buildGraph(buildFixtureMessages(), { type: "idle" })

    expect(model.nodes.find((node) => node.id === model.root)?.data?.sessionID).toBeUndefined()
  })
})
