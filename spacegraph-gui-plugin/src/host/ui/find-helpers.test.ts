import { expect, test } from "bun:test"
import { buildFixtureGraph } from "../../model/fixture"
import {
  clampActive,
  emptyFacets,
  facetCountLabel,
  facetCounts,
  findResults,
  toggleFacet,
  withFacets,
} from "./find-helpers"

const model = buildFixtureGraph()

test("toggleFacet adds, removes, and keeps the permanent session domain", () => {
  const initial = new Set(["session"])
  expect([...toggleFacet(initial, "code")]).toEqual(["session", "code"])
  expect([...toggleFacet(new Set(["session", "code"]), "code")]).toEqual(["session"])
  expect([...toggleFacet(new Set(["session"]), "session", "session")]).toEqual(["session"])
})

test("facetCountLabel reports kept/total from the model's own counts", () => {
  const counts = facetCounts(model, emptyFacets())
  const kind = counts.kinds[0].value
  expect(facetCountLabel(counts, "kinds", kind)).toBe(`${counts.kinds[0].kept}/${counts.kinds[0].total}`)
  expect(facetCountLabel(counts, "statuses", "missing")).toBe("0/0")
})

test("findResults composes facets with text, level and turn scope", () => {
  const all = findResults(model, emptyFacets())
  expect(all.length).toBeGreaterThan(0)

  const query = findResults(model, withFacets(emptyFacets(), { query: model.nodes[1].label }))
  expect(query.some((node) => node.id === model.nodes[1].id)).toBe(true)

  const turnID = model.turns[0]
  const scoped = findResults(model, emptyFacets(), { turnID })
  expect(scoped.every((node) => node.turnID === turnID)).toBe(true)

  const detail = findResults(model, emptyFacets(), { level: "detail" })
  expect(detail.length).toBeLessThanOrEqual(all.length)
})

test("clampActive keeps a roving index inside the result list", () => {
  expect(clampActive(5, 3)).toBe(2)
  expect(clampActive(-1, 3)).toBe(0)
  expect(clampActive(2, 0)).toBe(0)
})
