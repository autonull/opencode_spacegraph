import { describe, expect, test } from "bun:test"
import { buildGraph } from "./build"
import { buildFixtureGraph, buildFixtureMessages, buildFixtureSnapshot, buildFixtureGraphWithSnapshot } from "./fixture"
import { directoryNodeID, fileNodeID, type GraphModel } from "./model"

const serialize = (model: GraphModel) =>
  JSON.parse(JSON.stringify({ ...model, turnByMessageID: Object.fromEntries(model.turnByMessageID) }))

describe("T29.3 — the model takes the snapshot", () => {
  test("without a snapshot the model is unchanged", async () => {
    const model = buildFixtureGraph()
    const file = new URL("./model.golden.json", import.meta.url)

    if (process.env.UPDATE_GOLDEN) await Bun.write(file, `${JSON.stringify(serialize(model), null, 2)}\n`)

    expect(serialize(model)).toEqual(await Bun.file(file).json())
  })

  test("a snapshot adds derived kinds without changing the session", () => {
    const sessionOnly = buildFixtureGraph()
    const withSnapshot = buildGraph({
      messages: buildFixtureMessages(),
      status: { type: "idle" },
      snapshot: buildFixtureSnapshot(),
    })

    const directories = withSnapshot.nodes.filter((node) => node.kind === "directory")
    // Comprehensive fixture has directories for all files in snapshot
    expect(directories.length).toBeGreaterThanOrEqual(2)
    expect(directories.map((node) => node.id)).toContain(directoryNodeID("src"))
    expect(directories.map((node) => node.id)).toContain(directoryNodeID("src/auth"))

    // All derived kinds (not in session model)
    const derivedKinds = new Set(["directory", "package", "commit", "branch", "symbol", "process", "port", "issue"])
    const derived = new Set(
      withSnapshot.nodes.filter((node) => derivedKinds.has(node.kind)).map((node) => node.id),
    )
    const unchangedNodes = withSnapshot.nodes.filter((node) => !derived.has(node.id))
    expect(unchangedNodes).toEqual(sessionOnly.nodes)

    const unchangedEdges = withSnapshot.edges.filter(
      (edge) => !derived.has(edge.source) && !derived.has(edge.target),
    )
    expect(unchangedEdges).toEqual(sessionOnly.edges)
  })

  test("every session file is part-of its directory", () => {
    const model = buildGraph({
      messages: buildFixtureMessages(),
      status: { type: "idle" },
      snapshot: buildFixtureSnapshot(),
    })

    for (const path of ["src/auth/session.ts", "src/auth/session.test.ts"]) {
      expect(model.edges).toContainEqual(
        expect.objectContaining({
          kind: "part-of",
          source: fileNodeID(path),
          target: directoryNodeID("src/auth"),
          confidence: "structural",
        }),
      )
    }
    expect(model.edges).toContainEqual(
      expect.objectContaining({
        kind: "part-of",
        source: directoryNodeID("src/auth"),
        target: directoryNodeID("src"),
      }),
    )
  })

  test("the model carries the snapshot's provenance and workspace root", () => {
    const snapshot = buildFixtureSnapshot()
    const model = buildGraph({ messages: buildFixtureMessages(), status: { type: "idle" }, snapshot })

    expect(model.root).toBe("session")
    expect(model.workspaceRoot).toBe("/workspace/project")
    expect(model.snapshot).toEqual({ revision: snapshot.revision, asOf: snapshot.asOf, missing: snapshot.missing })
  })
})

describe("T32.1 — golden snapshot fixture", () => {
  test("comprehensive snapshot produces expected graph", async () => {
    const model = buildFixtureGraphWithSnapshot()
    const file = new URL("./model.golden.with-snapshot.json", import.meta.url)

    if (process.env.UPDATE_GOLDEN) await Bun.write(file, `${JSON.stringify(serialize(model), null, 2)}\n`)

    expect(serialize(model)).toEqual(await Bun.file(file).json())
  })

  test("derived kinds appear in the model", () => {
    const model = buildFixtureGraphWithSnapshot()

    const kinds = new Set(model.nodes.map((node) => node.kind))
    // Session kinds
    expect(kinds.has("session")).toBe(true)
    expect(kinds.has("turn")).toBe(true)
    expect(kinds.has("tool")).toBe(true)
    expect(kinds.has("file")).toBe(true)
    // Derived kinds from snapshot
    expect(kinds.has("directory")).toBe(true)
    expect(kinds.has("package")).toBe(true)
    expect(kinds.has("commit")).toBe(true)
    expect(kinds.has("branch")).toBe(true)
    expect(kinds.has("symbol")).toBe(true)
    expect(kinds.has("process")).toBe(true)
    expect(kinds.has("port")).toBe(true)
    expect(kinds.has("issue")).toBe(true)
  })

  test("directory nodes have provenance from filesystem", () => {
    const model = buildFixtureGraphWithSnapshot()

    const dirSrc = model.nodes.find((node) => node.id === directoryNodeID("src"))
    expect(dirSrc?.provenance?.source).toBe("tree")
    expect(dirSrc?.provenance?.confidence).toBe("inferred")
    expect(dirSrc?.domain).toBe("directories")
  })

  test("package nodes have provenance from packages", () => {
    const model = buildFixtureGraphWithSnapshot()

    const pkg = model.nodes.find((node) => node.kind === "package")
    expect(pkg?.provenance?.source).toBe("packages")
    expect(pkg?.domain).toBe("directories")
  })

  test("commit nodes have provenance from vcs", () => {
    const model = buildFixtureGraphWithSnapshot()

    const commit = model.nodes.find((node) => node.kind === "commit")
    expect(commit?.provenance?.source).toBe("vcs")
    expect(commit?.domain).toBe("history")
  })

  test("symbol nodes have provenance from symbols", () => {
    const model = buildFixtureGraphWithSnapshot()

    const symbol = model.nodes.find((node) => node.kind === "symbol")
    expect(symbol?.provenance?.source).toBe("symbols")
    expect(symbol?.domain).toBe("code")
  })

  test("process nodes have provenance from processes", () => {
    const model = buildFixtureGraphWithSnapshot()

    const process = model.nodes.find((node) => node.kind === "process")
    expect(process?.provenance?.source).toBe("processes")
    expect(process?.domain).toBe("runtime")
  })

  test("issue nodes have provenance from issues", () => {
    const model = buildFixtureGraphWithSnapshot()

    const issue = model.nodes.find((node) => node.kind === "issue")
    expect(issue?.provenance?.source).toBe("issues")
    expect(issue?.domain).toBe("work")
  })
})
