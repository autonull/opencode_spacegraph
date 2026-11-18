import { describe, expect, test } from "bun:test"
import { KernelCodec } from "@spacegraphjs/kernel"
import { buildFixtureGraph, buildFixtureGraphWithSnapshot } from "./fixture"
import { graphModelToKernel } from "./view"

type FixtureContract = {
  minimumNodes: number
  minimumEdges: number
  nodeKinds: string[]
  edgeKinds: string[]
  forbiddenNodeKinds?: string[]
}

type Contract = {
  version: number
  fixtures: Record<"session" | "workspace", FixtureContract>
  invariants: string[]
}

const contract = (await Bun.file(
  new URL("./graph.contract.json", import.meta.url),
).json()) as Contract

const kinds = (values: string[]) => [...new Set(values)].sort()

const assertFixture = (
  name: "session" | "workspace",
  model: ReturnType<typeof buildFixtureGraph>,
) => {
  const fixture = contract.fixtures[name]
  expect(model.nodes.length).toBeGreaterThanOrEqual(fixture.minimumNodes)
  expect(model.edges.length).toBeGreaterThanOrEqual(fixture.minimumEdges)
  expect(kinds(model.nodes.map((node) => node.kind))).toEqual(kinds(fixture.nodeKinds))
  expect(kinds(model.edges.map((edge) => edge.kind))).toEqual(kinds(fixture.edgeKinds))
  for (const forbidden of fixture.forbiddenNodeKinds ?? [])
    expect(model.nodes.some((node) => node.kind === forbidden)).toBe(false)

  const kernel = graphModelToKernel(model)
  expect(kernel.diagnostics()).toEqual({
    danglingEdges: [],
    duplicateNodes: [],
    duplicateEdges: [],
    hyperedgeMissingNodes: [],
  })
}

describe("graph contract", () => {
  test("the session fixture matches the contract", () => {
    assertFixture("session", buildFixtureGraph())
  })

  test("the workspace fixture matches the contract", () => {
    assertFixture("workspace", buildFixtureGraphWithSnapshot())
  })

  test("the committed sample decodes as a valid kernel", async () => {
    const json = await Bun.file(new URL("./graph.sample.json", import.meta.url)).text()
    const kernel = KernelCodec.decode(json)

    expect(kernel.nodes.map((node) => node.id)).toEqual([
      "org:acme",
      "project:website",
      "task:design",
      "task:auth",
    ])
    expect(kernel.diagnostics()).toEqual({
      danglingEdges: [],
      duplicateNodes: [],
      duplicateEdges: [],
      hyperedgeMissingNodes: [],
    })
  })
})
