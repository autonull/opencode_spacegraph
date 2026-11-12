import { describe, expect, test } from "bun:test"
import { buildFixtureGraph } from "./fixture"
import { paletteEntries, paletteGroup, PALETTE_GROUP_ORDER } from "./palette"

const model = buildFixtureGraph()
const sources = {
  actions: [
    { id: "why", label: "Why did this fail?", keywords: ["trace", "failure"] },
    { id: "export", label: "Export map", keywords: ["save", "svg"] },
  ],
  lenses: [{ id: "reader", label: "Reader", description: "Transcript first" }],
  surfaces: [{ id: "transcript", label: "Transcript" }],
  savedQueries: [{ label: "Failed tools", query: "kind:tool status:failed" }],
}

describe("palette — one list over the map and its commands", () => {
  test("an empty query lists commands, lenses, surfaces, and saved questions but no nodes", () => {
    const entries = paletteEntries(model, "", sources)

    expect(paletteGroup(entries, "node")).toHaveLength(0)
    expect(paletteGroup(entries, "action")).toHaveLength(2)
    expect(paletteGroup(entries, "lens")).toHaveLength(1)
    expect(paletteGroup(entries, "surface")).toHaveLength(1)
    expect(paletteGroup(entries, "saved-query")).toHaveLength(1)
  })

  test("groups stay in the published order", () => {
    const entries = paletteEntries(model, "token", sources)
    const kinds = [...new Set(entries.map((entry) => entry.kind))]

    expect(kinds).toEqual(PALETTE_GROUP_ORDER.filter((kind) => kinds.includes(kind)))
  })

  test("a typed query ranks nodes and filters commands by label or keyword", () => {
    const entries = paletteEntries(model, "token", sources)
    const nodes = paletteGroup(entries, "node")
    const actions = paletteGroup(entries, "action")

    expect(nodes.length).toBeGreaterThan(0)
    expect(actions.map((entry) => entry.action?.id)).toEqual([])
    expect(paletteEntries(model, "export", sources).some((entry) => entry.action?.id === "export")).toBe(true)
    expect(paletteEntries(model, "failure", sources).some((entry) => entry.action?.id === "why")).toBe(true)
  })

  test("node hits stop at the palette limit", () => {
    const entries = paletteEntries(model, "a", sources, 3)
    expect(paletteGroup(entries, "node").length).toBeLessThanOrEqual(3)
  })

  test("entries carry the value the host must run", () => {
    const saved = paletteGroup(paletteEntries(model, "failed tools", sources), "saved-query")[0]
    const node = paletteGroup(paletteEntries(model, "token", sources), "node")[0]

    expect(saved?.savedQuery).toEqual({ label: "Failed tools", query: "kind:tool status:failed" })
    expect(node?.node?.id).toBeString()
  })
})
