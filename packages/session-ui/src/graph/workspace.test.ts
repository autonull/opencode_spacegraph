import { describe, expect, test } from "bun:test"
import { buildGraph } from "./build"
import { buildFixtureGraph, buildFixtureMessages, buildFixtureSnapshot } from "./fixture"
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

  test("a snapshot adds directories without changing the session", () => {
    const sessionOnly = buildFixtureGraph()
    const withSnapshot = buildGraph({
      messages: buildFixtureMessages(),
      status: { type: "idle" },
      snapshot: buildFixtureSnapshot(),
    })

    const directories = withSnapshot.nodes.filter((node) => node.kind === "directory")
    expect(directories.map((node) => node.id)).toEqual([directoryNodeID("src"), directoryNodeID("src/auth")])
    expect(directories.map((node) => node.data)).toEqual([
      { path: "src", fileCount: 5, touchedCount: 5 },
      { path: "src/auth", fileCount: 5, touchedCount: 5 },
    ])

    const derived = new Set(directories.map((node) => node.id))
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
