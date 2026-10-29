import { describe, expect, test } from "bun:test"
import type {
  JsonValue,
  SessionMessageAssistant,
  SessionMessageAssistantTool,
  SessionMessageInfo,
} from "@opencode/client/promise"
import { buildGraph } from "./build"
import { EQUALIZER_PRESETS } from "./equalizer"
import {
  buildFixtureGraph,
  buildFixtureMessages,
  buildInterruptedFixtureMessages,
} from "./fixture"
import { nodesAtLevel } from "./levels"
import { fileNodeID, turnNodeID, type GraphViewData } from "./model"
import { scopeModel } from "./view"
import { search } from "./selectors"
import { DOMAINS, nodeDomain } from "./vocabulary"

const node = (model: GraphViewData, id: string) => model.nodes.find((item) => item.id === id)
const nodesOfKind = (model: GraphViewData, kind: string) =>
  model.nodes.filter((item) => item.kind === kind)
const hasEdge = (
  model: GraphViewData,
  kind: string,
  source: string,
  target: string,
) => model.edges.some((edge) => edge.kind === kind && edge.source === source && edge.target === target)

const user = (id: string, text = id): SessionMessageInfo => ({
  id,
  type: "user",
  text,
  time: { created: 1 },
})

const idle = (id: string): SessionMessageInfo => ({
  id,
  type: "idle",
  outcome: "succeeded",
  time: { created: 1 },
})

const text = (id: string, body: string): SessionMessageInfo => ({
  id,
  type: "assistant",
  agent: "build",
  model: { id: "m", providerID: "p" },
  content: [{ type: "text", text: body }],
  time: { created: 1, completed: 2 },
})

const completed = (input: Record<string, JsonValue>, content: string): SessionMessageAssistantTool["state"] => ({
  status: "completed",
  input,
  content: [{ type: "text", text: content }],
  metadata: {},
})

const tool = (id: string, name: string): SessionMessageAssistantTool => ({
  type: "tool",
  id,
  name,
  state: completed({ path: "src/auth" }, "ok"),
  time: { created: 1, completed: 2 },
})

const assistant = (id: string, content: SessionMessageAssistant["content"]): SessionMessageInfo => ({
  id,
  type: "assistant",
  agent: "build",
  model: { id: "m", providerID: "p" },
  content,
  time: { created: 1, completed: 2 },
})

describe("acceptance — session behaviors", () => {
  test("1. each opener creates one turn and a steered prompt shares it", () => {
    const model = buildGraph({
      messages: [user("u1", "open"), text("a1", "first"), user("u2", "steer"), idle("i1")],
      status: { type: "idle" },
    })

    expect(model.turns).toEqual([turnNodeID("u1")])
    expect(model.turnByMessageID.get("a1")).toBe("u1")
    expect(model.turnByMessageID.get("u2")).toBe("u1")
  })

  test("2. consecutive children of a turn get sequence edges in order", () => {
    const model = buildFixtureGraph()

    expect(hasEdge(model, "sequence", "msg:msg_user_1", "msg_plan_1:text:0")).toBe(true)
    expect(hasEdge(model, "sequence", "msg_plan_1:text:0", "tool:prt_tool_glob_1")).toBe(true)
    expect(hasEdge(model, "sequence", "tool:prt_tool_glob_1", "tool:prt_tool_grep_1")).toBe(true)
  })

  test("3. a run of one category clusters into one phase and a category change starts a new one", () => {
    const model = buildFixtureGraph()
    const explore = node(model, "phase:turn:msg_user_1:explore:1")
    const delegate = node(model, "phase:turn:msg_user_1:delegate:2")

    expect(explore?.data?.category).toBe("explore")
    expect(explore?.clusterOf).toEqual([
      "tool:prt_tool_glob_1",
      "tool:prt_tool_grep_1",
      "tool:prt_tool_read_1",
      "tool:prt_tool_read_2",
      "tool:prt_tool_read_3",
    ])
    expect(delegate?.data?.category).toBe("delegate")
    expect(delegate?.clusterOf).toEqual(["sub:ses_child_auth"])
  })

  test("4. subagent tools produce subagent nodes and a synthetic completion links delegates", () => {
    const model = buildFixtureGraph()

    expect(node(model, "sub:ses_child_auth")?.kind).toBe("subagent")
    expect(hasEdge(model, "delegates", "msg:msg_synthetic_1", "sub:ses_child_auth")).toBe(true)
  })

  test("5. shell results are produces edges, failures are failed, and retries link evidence", () => {
    const model = buildFixtureGraph()

    expect(node(model, "result:prt_tool_shell_1")?.status).toBe("success")
    expect(node(model, "result:prt_tool_shell_2")?.status).toBe("failed")
    expect(hasEdge(model, "produces", "tool:prt_tool_shell_2", "result:prt_tool_shell_2")).toBe(true)
    expect(hasEdge(model, "evidence", "err:msg_retry_1:assistant", "retry:msg_retry_1:2")).toBe(true)
  })

  test("6. assistant errors become error nodes and an abort reads interrupted", () => {
    const model = buildGraph({ messages: buildFixtureMessages(), status: { type: "idle" } })
    const interrupted = buildGraph({
      messages: buildInterruptedFixtureMessages(),
      status: { type: "idle" },
    })

    expect(node(model, "err:msg_retry_1:assistant")?.kind).toBe("error")
    expect(node(interrupted, "err:msg_idle_2:idle")?.status).toBe("interrupted")
  })

  test("7. compaction compacts the previous turn and reports replayed windows", () => {
    const messages = [
      user("u1"),
      idle("i1"),
      user("u2"),
      {
        id: "c1",
        type: "compaction",
        status: "completed",
        reason: "auto",
        summary: "",
        native: { messages: [{ role: "user", content: "earlier work" }] },
        time: { created: 3 },
      },
      idle("i2"),
    ] satisfies SessionMessageInfo[]
    const model = buildGraph({ messages, status: { type: "idle" } })
    const compaction = node(model, "msg:c1")

    expect(compaction?.kind).toBe("compaction")
    expect(compaction?.data?.replayed).toBe(true)
    expect(hasEdge(model, "compacts", "msg:c1", turnNodeID("u1"))).toBe(true)
  })

  test("8. an idle with changed files produces one diff node listing them", () => {
    const model = buildFixtureGraph()
    const diffs = nodesOfKind(model, "diff")
    const diff = node(model, "diff:msg_idle_1")

    expect(diffs.length).toBe(2)
    expect(diff?.data?.files).toEqual([
      "src/auth/guards.ts",
      "src/auth/session.test.ts",
      "src/auth/session.ts",
      "src/auth/token.ts",
    ])
    for (const file of diff?.data?.files as string[])
      expect(hasEdge(model, "produces", "diff:msg_idle_1", fileNodeID(file))).toBe(true)
  })

  test("9. reads, writes and searches link to files", () => {
    const model = buildFixtureGraph()
    const searched = buildGraph({
      messages: [
        user("u1"),
        assistant("a1", [tool("t_search", "grep")]),
        idle("i1"),
      ],
      status: { type: "idle" },
    })

    expect(hasEdge(model, "reads", "tool:prt_tool_read_1", "file:src/auth/session.ts")).toBe(true)
    expect(hasEdge(model, "writes", "tool:prt_tool_edit_1", "file:src/auth/session.ts")).toBe(true)
    expect(hasEdge(model, "writes", "tool:prt_tool_patch_1", "file:src/auth/guards.ts")).toBe(true)
    expect(hasEdge(searched, "searches", "tool:t_search", "file:src/auth")).toBe(true)
  })

  test("10. the active turn is flagged while busy and the goal is the first user text", () => {
    const model = buildGraph({ messages: buildFixtureMessages(), status: { type: "busy" } })

    expect(model.goal).toBe("Fix the authentication test failures.")
    expect(model.activeTurn).toBe(turnNodeID("msg_user_2"))
    expect(node(model, model.activeTurn!)?.data?.active).toBe(true)
  })
})
describe("acceptance — host behaviors", () => {
  test("18. the domain lens drops non-session domains and never drops session", () => {
    const model = buildFixtureGraph()
    const sessionOnly = scopeModel(model, new Set(["session"]))
    const code = scopeModel(model, new Set(["code"]))

    expect(node(sessionOnly, "session")).toBeDefined()
    expect(sessionOnly.nodes.every((item) => nodeDomain(item) === "session")).toBe(true)
    expect(code.nodes.some((item) => item.kind === "symbol")).toBe(false)
    expect(code.nodes.every((item) => nodeDomain(item) === "session")).toBe(true)
  })

  test("19. the graph is session-only and derived domains are absent", () => {
    const model = buildFixtureGraph()
    const derived = new Set([
      "directory",
      "package",
      "commit",
      "branch",
      "symbol",
      "process",
      "port",
      "issue",
    ])

    expect(model.nodes.some((item) => derived.has(item.kind))).toBe(false)
  })

  test("20. level filtering keeps the existing overview/execution/detail shape", () => {
    const model = buildFixtureGraph()
    const overview = new Set(nodesAtLevel(model, "overview").map((item) => item.id))
    const execution = new Set(nodesAtLevel(model, "execution").map((item) => item.id))
    const detail = new Set(nodesAtLevel(model, "detail").map((item) => item.id))

    expect(overview.has("session")).toBe(true)
    expect(overview.has("turn:msg_user_1")).toBe(true)
    expect(overview.has("tool:prt_tool_read_1")).toBe(false)
    expect(execution.has("tool:prt_tool_read_1")).toBe(true)
    expect(execution.has("msg:msg_synthetic_1")).toBe(false)
    expect(detail.has("msg:msg_synthetic_1")).toBe(true)
  })

  test("21. toolbar, inspector, filesystem, equalizer and search surfaces keep working", () => {
    const model = buildFixtureGraph()

    expect(DOMAINS).toContain("session")
    expect(EQUALIZER_PRESETS.length).toBeGreaterThan(0)
    expect(search(model, "auth").length).toBeGreaterThan(0)
  })
})
