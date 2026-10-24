import { describe, expect, test } from "bun:test"
import { buildFixtureGraph } from "./fixture"
import {
  applyFacets,
  DEFAULT_FACETS,
  facetCounts,
  facetsFromQuery,
  facetsToQuery,
  keepOnly,
} from "./facets"
import { rankedSearch } from "./selectors"
import type { GraphFacets } from "./facets"

const model = buildFixtureGraph()

describe("facets — one question, one scope", () => {
  test("the query grammar round-trips canonical facets", () => {
    const facets: GraphFacets = {
      query: "token auth",
      kinds: new Set(["file", "tool"]),
      statuses: new Set(["failed", "running"]),
      domains: new Set(["session", "code", "verification"]),
    }

    expect(facetsFromQuery(facetsToQuery(facets))).toEqual(facets)
  })

  test("an empty query is the default lens, and the default lens has no other facet", () => {
    expect(facetsFromQuery("")).toEqual(DEFAULT_FACETS)
    expect(facetsToQuery(DEFAULT_FACETS)).toBe("domain:session")
  })

  test("unknown values are ignored while free text survives", () => {
    const facets = facetsFromQuery("kind:galaxy status:failed token")
    expect(facets.kinds.size).toBe(0)
    expect(facets.statuses).toEqual(new Set(["failed"]))
    expect(facets.query).toBe("token")
  })

  test("the kind facet keeps matching nodes and the session root", () => {
    const scoped = applyFacets(model, { ...DEFAULT_FACETS, kinds: new Set(["file"]) })
    expect(scoped.nodes.some((node) => node.id === model.root)).toBe(true)
    expect(scoped.nodes.filter((node) => node.kind !== "file" && node.id !== model.root)).toEqual([])
  })

  test("the status facet keeps only matching statuses (and the root)", () => {
    const scoped = applyFacets(model, { ...DEFAULT_FACETS, statuses: new Set(["failed"]) })
    expect(scoped.nodes.filter((node) => node.id !== model.root).every((node) => node.status === "failed")).toBe(true)
  })

  test("edges survive only when both endpoints do", () => {
    const scoped = applyFacets(model, { ...DEFAULT_FACETS, kinds: new Set(["file"]) })
    const ids = new Set(scoped.nodes.map((node) => node.id))
    expect(scoped.edges.every((edge) => ids.has(edge.source) && ids.has(edge.target))).toBe(true)
  })

  test("counts say what a chip keeps against what the map has", () => {
    const counts = facetCounts(model, { ...DEFAULT_FACETS, kinds: new Set(["file"]) })
    const files = counts.kinds.find((entry) => entry.value === "file")!
    expect(files.kept).toBe(files.total)
    expect(files.total).toBeGreaterThan(0)
    const tools = counts.kinds.find((entry) => entry.value === "tool")!
    expect(tools.total).toBeGreaterThan(0)
    // The kind facet is excluded from its own count, so the chip still says what choosing it adds.
    expect(tools.kept).toBe(tools.total)
  })

  test("ranked search prefers a label hit over a body hit", () => {
    const results = rankedSearch(model, "token")
    expect(results.length).toBeGreaterThan(1)
    expect(results[0]?.label.toLowerCase()).toContain("token")
  })
})

describe("keep only — a scope over the held set, after facets", () => {
  test("keeps the held ids and the session root, dropping everything else", () => {
    const held = model.nodes.find((node) => node.kind === "file")!
    const kept = keepOnly(model, [held.id])
    const ids = new Set(kept.nodes.map((node) => node.id))

    expect(ids.has(held.id)).toBe(true)
    expect(ids.has(model.root)).toBe(true)
    expect(kept.nodes).toHaveLength(2)
    expect(kept.edges.every((edge) => ids.has(edge.source) && ids.has(edge.target))).toBe(true)
  })

  test("it composes after facets: the result is the intersection", () => {
    const file = model.nodes.find((node) => node.kind === "file")!
    const tool = model.nodes.find((node) => node.kind === "tool")!
    const faceted = applyFacets(model, { ...DEFAULT_FACETS, kinds: new Set(["file"]) })
    const kept = keepOnly(faceted, [file.id, tool.id])

    expect(kept.nodes.map((node) => node.id).sort()).toEqual([file.id, model.root].sort())
  })

  test("the active turn leaves with its node", () => {
    const kept = keepOnly({ ...model, activeTurn: model.turns[0] }, [])

    expect(kept.activeTurn).toBeUndefined()
  })
})
