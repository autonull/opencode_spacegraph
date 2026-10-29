import { describe, expect, test } from "bun:test"
import { KernelCodec } from "@spacegraphjs/kernel"
import { exportGraphFilename, exportGraphJSON } from "./export"
import { buildFixtureGraph } from "./fixture"

describe("graph export", () => {
  test("exports a decodable kernel", () => {
    const model = buildFixtureGraph()
    const decoded = KernelCodec.decode(exportGraphJSON(model))

    expect(decoded.nodes.map((node) => node.id)).toEqual(model.nodes.map((node) => node.id))
    expect(decoded.diagnostics()).toEqual({
      danglingEdges: [],
      duplicateNodes: [],
      duplicateEdges: [],
      hyperedgeMissingNodes: [],
    })
  })

  test("derives a filename from the goal", () => {
    expect(exportGraphFilename("Fix the Auth tests")).toBe("spacegraph-fix-the-auth-tests.json")
    expect(exportGraphFilename()).toBe("spacegraph.json")
  })
})
