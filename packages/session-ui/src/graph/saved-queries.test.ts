import { describe, expect, test } from "bun:test"
import { DEFAULT_FACETS, facetsToQuery, type GraphFacets } from "./facets"
import {
  isSavedQuery,
  MAX_SAVED_QUERIES,
  normalizeSavedQueries,
  removeQuery,
  saveQuery,
  savedQueryFacets,
} from "./saved-queries"

const facets = (input: Partial<GraphFacets>): GraphFacets => ({ ...DEFAULT_FACETS, ...input })

describe("saved queries are facets", () => {
  test("a saved row round-trips through the facet grammar", () => {
    const question = facets({ query: "token auth", kinds: new Set(["file"]), statuses: new Set(["failed"]) })
    const [saved] = saveQuery([], question)

    expect(saved?.query).toBe(facetsToQuery(question))
    expect(savedQueryFacets(saved!)).toEqual(question)
  })

  test("saving the same question twice updates the label instead of duplicating it", () => {
    const question = facets({ kinds: new Set(["tool"]) })
    const once = saveQuery([], question, "Tools")
    const twice = saveQuery(once, question, "My tools")

    expect(twice).toHaveLength(1)
    expect(twice[0]?.label).toBe("My tools")
  })

  test("the newest question comes first and the list is bounded", () => {
    let queries = saveQuery([], facets({ kinds: new Set(["tool"]) }), "Tools")
    queries = saveQuery(queries, facets({ kinds: new Set(["file"]) }), "Files")
    expect(queries.map((entry) => entry.label)).toEqual(["Files", "Tools"])

    for (let index = 0; index < MAX_SAVED_QUERIES + 5; index++) {
      queries = saveQuery(queries, facets({ query: `question ${index}` }), `Question ${index}`)
    }
    expect(queries).toHaveLength(MAX_SAVED_QUERIES)
  })

  test("a blank label falls back to the query grammar", () => {
    const question = facets({ statuses: new Set(["failed"]) })
    const [saved] = saveQuery([], question, "   ")
    expect(saved?.label).toBe(facetsToQuery(question))
  })

  test("removing a query keeps the others and the saved check follows the grammar", () => {
    const tools = facets({ kinds: new Set(["tool"]) })
    const files = facets({ kinds: new Set(["file"]) })
    const queries = saveQuery(saveQuery([], tools, "Tools"), files, "Files")

    expect(isSavedQuery(queries, tools)).toBe(true)
    expect(removeQuery(queries, facetsToQuery(tools)).map((entry) => entry.label)).toEqual(["Files"])
    expect(isSavedQuery(removeQuery(queries, facetsToQuery(tools)), tools)).toBe(false)
  })

  test("malformed persisted rows are dropped and duplicates collapse", () => {
    const normalized = normalizeSavedQueries([
      { label: "Tools", query: "kind:tool" },
      { label: "", query: "kind:tool" },
      { label: "Files" },
      { query: 42 },
      null,
      { label: "Errors", query: "status:failed" },
    ])

    expect(normalized).toEqual([
      { label: "Tools", query: "kind:tool" },
      { label: "Errors", query: "status:failed" },
    ])
    expect(normalizeSavedQueries("kind:tool")).toEqual([])
  })
})
