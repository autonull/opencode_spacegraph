import { describe, expect, it } from "bun:test"
import { actionsFor, filterActionsByCapabilities, capabilitiesFromSnapshot } from "./actions"
import { type GraphModel, type GraphNode } from "./model"

function makeModel(nodes: GraphNode[] = []): GraphModel {
  return {
    root: "session",
    nodes,
    edges: [],
    turns: [],
    turnByMessageID: new Map(),
  }
}

function makeNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: "test",
    kind: "file",
    label: "test.ts",
    status: "neutral",
    data: { path: "src/test.ts" },
    ...overrides,
  }
}

describe("actionsFor", () => {
  it("returns directory actions", () => {
    const node = makeNode({ kind: "directory", id: "dir:src", data: { path: "src" } })
    const model = makeModel([node])
    const actions = actionsFor(node, model)

    const ids = actions.map((a) => a.id)
    expect(ids).toContain("directory.reveal")
    expect(ids).toContain("directory.open")
    expect(ids).toContain("directory.newFile")
  })

  it("returns file actions", () => {
    const node = makeNode({ kind: "file", id: "file:src/test.ts", data: { path: "src/test.ts" } })
    const model = makeModel([node])
    const actions = actionsFor(node, model)

    const ids = actions.map((a) => a.id)
    expect(ids).toContain("file.open")
    expect(ids).toContain("file.history")
    expect(ids).toContain("file.callers")
    expect(ids).toContain("file.blame")
    expect(ids).toContain("file.compareBase")
    expect(ids).toContain("file.runTests")
    expect(ids).toContain("file.copyPath")
  })

  it("returns package actions", () => {
    const node = makeNode({ kind: "package", id: "pkg:packages/ui", data: { path: "packages/ui/package.json" } })
    const model = makeModel([node])
    const actions = actionsFor(node, model)

    const ids = actions.map((a) => a.id)
    expect(ids).toContain("package.open")
    expect(ids).toContain("package.runScript")
    expect(ids).toContain("package.dependencies")
  })

  it("returns commit actions", () => {
    const node = makeNode({ kind: "commit", id: "commit:abc123", label: "abc123" })
    const model = makeModel([node])
    const actions = actionsFor(node, model)

    const ids = actions.map((a) => a.id)
    expect(ids).toContain("commit.viewDiff")
    expect(ids).toContain("commit.copySha")
    expect(ids).toContain("commit.openHost")
    expect(ids).toContain("commit.cherryPick")
  })

  it("returns branch actions", () => {
    const node = makeNode({ kind: "branch", id: "branch:feature/xyz", label: "feature/xyz" })
    const model = makeModel([node])
    const actions = actionsFor(node, model)

    const ids = actions.map((a) => a.id)
    expect(ids).toContain("branch.checkout")
    expect(ids).toContain("branch.copyName")
    expect(ids).toContain("branch.createPR")
  })

  it("returns symbol actions", () => {
    const node = makeNode({
      kind: "symbol",
      id: "symbol:src/test.ts#testFn",
      label: "testFn",
      data: { path: "src/test.ts", range: { start: { line: 1, character: 0 }, end: { line: 10, character: 0 } } },
    })
    const model = makeModel([node])
    const actions = actionsFor(node, model)

    const ids = actions.map((a) => a.id)
    expect(ids).toContain("symbol.open")
    expect(ids).toContain("symbol.findReferences")
    expect(ids).toContain("symbol.showCallers")
    expect(ids).toContain("symbol.rename")
  })

  it("returns test actions", () => {
    const node = makeNode({
      kind: "test",
      id: "test:src/test.ts#suite › test name",
      label: "test name",
      data: { path: "src/test.ts", name: "test name" },
    })
    const model = makeModel([node])
    const actions = actionsFor(node, model)

    const ids = actions.map((a) => a.id)
    expect(ids).toContain("test.rerun")
    expect(ids).toContain("test.debug")
    expect(ids).toContain("test.openFile")
  })

  it("returns test-run actions", () => {
    const node = makeNode({ kind: "test-run", id: "testrun:tool123", label: "Test Run", summary: "5 passed, 1 failed" })
    const model = makeModel([node])
    const actions = actionsFor(node, model)

    const ids = actions.map((a) => a.id)
    expect(ids).toContain("testRun.rerunFailed")
    expect(ids).toContain("testRun.copySummary")
  })

  it("returns process actions", () => {
    const node = makeNode({ kind: "process", id: "proc:tool123", label: "Process", data: {} })
    const model = makeModel([node])
    const actions = actionsFor(node, model)

    const ids = actions.map((a) => a.id)
    expect(ids).toContain("process.viewLogs")
    expect(ids).toContain("process.restart")
    expect(ids).toContain("process.stop")
    expect(ids).toContain("process.attachDebugger")
  })

  it("returns port actions", () => {
    const node = makeNode({ kind: "port", id: "port:3000", label: "Port 3000" })
    const model = makeModel([node])
    const actions = actionsFor(node, model)

    const ids = actions.map((a) => a.id)
    expect(ids).toContain("port.openBrowser")
    expect(ids).toContain("port.copyUrl")
    expect(ids).toContain("port.proxy")
  })

  it("returns issue actions", () => {
    const node = makeNode({
      kind: "issue",
      id: "issue:github:owner/repo#123",
      label: "Issue #123",
      data: { url: "https://github.com/owner/repo/issues/123" },
    })
    const model = makeModel([node])
    const actions = actionsFor(node, model)

    const ids = actions.map((a) => a.id)
    expect(ids).toContain("issue.open")
    expect(ids).toContain("issue.startWork")
    expect(ids).toContain("issue.copyRef")
    expect(ids).toContain("issue.createBranch")
  })

  it("returns no actions for session kinds", () => {
    for (const kind of ["session", "turn", "tool", "diff", "message", "phase"] as const) {
      const node = makeNode({ kind, id: `${kind}:1` })
      const model = makeModel([node])
      const actions = actionsFor(node, model)
      expect(actions).toHaveLength(0)
    }
  })
})

describe("filterActionsByCapabilities", () => {
  it("filters out vcs.checkout when capability missing", () => {
    const actions = [
      { id: "branch.checkout", kind: "run" as const, labelKey: "x", operation: { id: "vcs.checkout", params: {} } },
      { id: "branch.copyName", kind: "copy" as const, labelKey: "x", target: { text: "x" } },
    ]
    const filtered = filterActionsByCapabilities(actions, new Set<string>())
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe("branch.copyName")
  })

  it("keeps vcs.checkout when capability present", () => {
    const actions = [
      { id: "branch.checkout", kind: "run" as const, labelKey: "x", operation: { id: "vcs.checkout", params: {} } },
    ]
    const filtered = filterActionsByCapabilities(actions, new Set(["vcs.checkout"]))
    expect(filtered).toHaveLength(1)
  })

  it("filters out vcs.diff when capability missing", () => {
    const actions = [
      { id: "commit.viewDiff", kind: "run" as const, labelKey: "x", operation: { id: "vcs.diff", params: {} } },
    ]
    const filtered = filterActionsByCapabilities(actions, new Set<string>())
    expect(filtered).toHaveLength(0)
  })

  it("keeps vcs.diff when vcs.status present (fallback)", () => {
    const actions = [
      { id: "commit.viewDiff", kind: "run" as const, labelKey: "x", operation: { id: "vcs.diff", params: {} } },
    ]
    const filtered = filterActionsByCapabilities(actions, new Set(["vcs.status"]))
    expect(filtered).toHaveLength(1)
  })

  it("keeps agent actions when agent capability present", () => {
    const actions = [
      { id: "test.rerun", kind: "run" as const, labelKey: "x", operation: { id: "agent.prompt", params: {} } },
    ]
    const filtered = filterActionsByCapabilities(actions, new Set(["agent"]))
    expect(filtered).toHaveLength(1)
  })

  it("filters out agent actions when agent capability missing", () => {
    const actions = [
      { id: "test.rerun", kind: "run" as const, labelKey: "x", operation: { id: "agent.prompt", params: {} } },
    ]
    const filtered = filterActionsByCapabilities(actions, new Set<string>())
    expect(filtered).toHaveLength(0)
  })

  it("always keeps navigate, reveal, copy actions", () => {
    const actions = [
      { id: "nav", kind: "navigate" as const, labelKey: "x", target: { file: "x" } },
      { id: "rev", kind: "reveal" as const, labelKey: "x", target: { file: "x" } },
      { id: "cpy", kind: "copy" as const, labelKey: "x", target: { text: "x" } },
    ]
    const filtered = filterActionsByCapabilities(actions, new Set<string>())
    expect(filtered).toHaveLength(3)
  })
})

describe("capabilitiesFromSnapshot", () => {
  it("returns empty set for undefined snapshot", () => {
    const caps = capabilitiesFromSnapshot(undefined)
    expect(caps.size).toBe(0)
  })

  it("returns empty set for snapshot without capabilities", () => {
    const caps = capabilitiesFromSnapshot({})
    expect(caps.size).toBe(0)
  })

  it("returns set from snapshot capabilities", () => {
    const caps = capabilitiesFromSnapshot({ capabilities: ["vcs.checkout", "agent"] })
    expect(caps.has("vcs.checkout")).toBe(true)
    expect(caps.has("agent")).toBe(true)
    expect(caps.size).toBe(2)
  })
})