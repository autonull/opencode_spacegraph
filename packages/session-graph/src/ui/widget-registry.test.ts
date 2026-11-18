import { describe, expect, it } from "bun:test"
import type { GraphNode } from "@opencode/session-ui/graph"
import {
  createSessionWidgetRegistry,
  legacyWidgetRegistry,
  sessionWidgetRequests,
  widgetRequestNode,
  type SessionWidgetComponents,
} from "./widget-registry"

const components = Object.fromEntries(
  ["composer", "subagent", "todo", "diff", "terminal"].map((id) => [id, () => null]),
) as unknown as SessionWidgetComponents

const node = (id: string, kind: GraphNode["kind"], data?: Record<string, unknown>): GraphNode => ({
  id,
  kind,
  label: id,
  status: "success",
  data: data as GraphNode["data"],
})

const resolveIDs = (registry: ReturnType<typeof createSessionWidgetRegistry>, graphNode: GraphNode) =>
  registry.resolve(widgetRequestNode(graphNode), "card", ["body"]).map((descriptor) => descriptor.id)

describe("sessionWidgetRequests", () => {
  it("maps session vocabulary to widget ids", () => {
    expect(sessionWidgetRequests(node("session", "session"))).toEqual(["composer"])
    expect(sessionWidgetRequests(node("turn:1", "session"))).toEqual([])
    expect(sessionWidgetRequests(node("subagent:s1", "subagent"))).toEqual(["subagent"])
    expect(sessionWidgetRequests(node("tool:edit", "tool", { name: "edit" }))).toEqual(["diff"])
    expect(sessionWidgetRequests(node("tool:write", "tool", { name: "write" }))).toEqual(["diff"])
    expect(sessionWidgetRequests(node("tool:todo", "tool", { name: "todowrite" }))).toEqual(["todo"])
    expect(sessionWidgetRequests(node("tool:bash", "tool", { name: "bash" }))).toEqual([])
    expect(sessionWidgetRequests(node("result:shell", "result", { output: "ok" }))).toEqual([
      "terminal",
    ])
    expect(sessionWidgetRequests(node("result:shell", "result"))).toEqual([])
  })
})

describe("createSessionWidgetRegistry", () => {
  it("registers every host widget and gates each by host policy", () => {
    const registry = createSessionWidgetRegistry({}, components)
    expect(registry.list().map((descriptor) => descriptor.id)).toEqual([
      "composer",
      "subagent",
      "todo",
      "diff",
      "terminal",
    ])

    const gated = createSessionWidgetRegistry({ enabled: (id) => id !== "todo" }, components)
    expect(gated.list().map((descriptor) => descriptor.id)).not.toContain("todo")
    expect(resolveIDs(gated, node("tool:todo", "tool", { name: "todowrite" }))).toEqual([])
  })

  it("resolves the same descriptors as the widget requests", () => {
    const registry = createSessionWidgetRegistry({}, components)
    const nodes = [
      node("session", "session"),
      node("subagent:s1", "subagent"),
      node("tool:todo", "tool", { name: "todowrite" }),
      node("tool:edit", "tool", { name: "edit" }),
      node("result:shell", "result", { output: "ok" }),
    ]
    for (const graphNode of nodes) {
      expect(resolveIDs(registry, graphNode)).toEqual([...sessionWidgetRequests(graphNode)])
    }
  })
})

describe("P3.6 frame parity", () => {
  // Frames 45–47 (diff / terminal / write) and 54 (todo) are the captured widget frames. The port
  // must resolve exactly the widgets the legacy `renderNodeWidget` callback selected on those nodes.
  const frames = [
    node("tool:prt_tool_edit_2", "tool", { name: "edit" }),
    node("result:prt_tool_shell_2", "result", { output: "FAIL auth refresh token" }),
    node("tool:prt_tool_edit_3", "tool", { name: "write" }),
    node("tool:prt_tool_todo_1", "tool", { name: "todowrite" }),
  ]

  it("matches the legacy callback on every widget frame", () => {
    const registry = createSessionWidgetRegistry({}, components)
    const legacy = legacyWidgetRegistry(() => undefined, (id) => frames.find((n) => n.id === id))
    for (const frame of frames) {
      expect(resolveIDs(registry, frame)).toEqual(resolveIDs(legacy, frame))
    }
  })
})
