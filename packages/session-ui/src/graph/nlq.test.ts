import { describe, test, expect } from "bun:test"
import { compileNLQ, formatNLQResult, parseNLQ } from "./nlq"
import { DEFAULT_FACETS } from "./facets"

describe("NLQ compiler", () => {
  test("empty input returns default facets", () => {
    const result = compileNLQ("")
    expect(result).toEqual(DEFAULT_FACETS)
  })

  test("whitespace only returns default facets", () => {
    const result = compileNLQ("   ")
    expect(result).toEqual(DEFAULT_FACETS)
  })

  test("free text query is preserved", () => {
    const result = compileNLQ("authentication")
    expect(result.query).toBe("authentication")
    expect(result.kinds.size).toBe(0)
    expect(result.statuses.size).toBe(0)
  })

  test("kind:tool extracts tool kind", () => {
    const result = compileNLQ("show me tools")
    expect(result.kinds.has("tool")).toBe(true)
  })

  test("kind:file extracts file kind", () => {
    const result = compileNLQ("show files")
    expect(result.kinds.has("file")).toBe(true)
  })

  test("kind:error extracts error kind", () => {
    const result = compileNLQ("show errors")
    expect(result.kinds.has("error")).toBe(true)
  })

  test("status:failed extracts failed status", () => {
    const result = compileNLQ("failed tools")
    expect(result.statuses.has("failed")).toBe(true)
  })

  test("status:success extracts success status", () => {
    const result = compileNLQ("successful tests")
    expect(result.statuses.has("success")).toBe(true)
  })

  test("status:running extracts running status", () => {
    const result = compileNLQ("running processes")
    expect(result.statuses.has("running")).toBe(true)
  })

  test("domain:code extracts code domain", () => {
    const result = compileNLQ("code symbols")
    expect(result.domains.has("code")).toBe(true)
  })

  test("domain:verification extracts verification domain", () => {
    const result = compileNLQ("tests")
    expect(result.domains.has("verification")).toBe(true)
  })

  test("combined: failed tools", () => {
    const result = compileNLQ("failed tools")
    expect(result.kinds.has("tool")).toBe(true)
    expect(result.statuses.has("failed")).toBe(true)
  })

  test("combined: show me failed tools", () => {
    const result = compileNLQ("show me failed tools")
    expect(result.kinds.has("tool")).toBe(true)
    expect(result.statuses.has("failed")).toBe(true)
  })

  test("combined: display errors in code", () => {
    const result = compileNLQ("display errors in code")
    expect(result.kinds.has("error")).toBe(true)
    expect(result.domains.has("code")).toBe(true)
  })

  test("combined: list running processes", () => {
    const result = compileNLQ("list running processes")
    expect(result.kinds.has("process")).toBe(true)
    expect(result.statuses.has("running")).toBe(true)
    expect(result.domains.has("runtime")).toBe(true)
  })

  test("multiple kinds: tools and files", () => {
    const result = compileNLQ("tools and files")
    expect(result.kinds.has("tool")).toBe(true)
    expect(result.kinds.has("file")).toBe(true)
  })

  test("multiple statuses: failed and interrupted", () => {
    const result = compileNLQ("failed or interrupted")
    expect(result.statuses.has("failed")).toBe(true)
    expect(result.statuses.has("interrupted")).toBe(true)
  })

  test("formatNLQResult produces valid query string", () => {
    const result = compileNLQ("failed tools")
    const queryString = formatNLQResult(result)
    expect(queryString).toContain("kind:tool")
    expect(queryString).toContain("status:failed")
  })

  test("parseNLQ returns both facets and query string", () => {
    const { facets, queryString } = parseNLQ("failed tools")
    expect(facets.kinds.has("tool")).toBe(true)
    expect(facets.statuses.has("failed")).toBe(true)
    expect(queryString).toContain("kind:tool")
    expect(queryString).toContain("status:failed")
  })

  test("synonyms: 'dir' maps to directory", () => {
    const result = compileNLQ("show dir")
    expect(result.kinds.has("directory")).toBe(true)
  })

  test("synonyms: 'git' maps to history domain", () => {
    const result = compileNLQ("git history")
    expect(result.domains.has("history")).toBe(true)
  })

  test("synonyms: 'passed' maps to success status", () => {
    const result = compileNLQ("passed tests")
    expect(result.statuses.has("success")).toBe(true)
  })

  test("synonyms: 'cancelled' maps to interrupted status", () => {
    const result = compileNLQ("cancelled tasks")
    expect(result.statuses.has("interrupted")).toBe(true)
  })

  test("free text preserved with facets: 'auth token errors'", () => {
    const result = compileNLQ("auth token errors")
    expect(result.query).toBe("auth token")
    expect(result.kinds.has("error")).toBe(true)
  })
})