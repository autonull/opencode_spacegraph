import { describe, expect, test } from "bun:test"
import { buildFixtureGraph, buildFixtureGraphWithSnapshot } from "./fixture"
import {
  NAVIGATION_MNEMONICS,
  navigationHelp,
  navigationResults,
  navigationTargets,
  nextNavigationTarget,
  parseNavigation,
} from "./navigation"

describe("navigation grammar", () => {
  test("exposes nine mnemonics and generated help", () => {
    expect(NAVIGATION_MNEMONICS.length).toBe(9)
    expect(navigationHelp().map((entry) => entry.key)).toEqual([
      "s",
      "t",
      "m",
      "f",
      "d",
      "p",
      "c",
      "b",
      "i",
    ])
  })

  test("parses g-prefixed macros with optional whitespace", () => {
    expect(parseNavigation("g f")?.key).toBe("f")
    expect(parseNavigation("gf")?.key).toBe("f")
    expect(parseNavigation("  G   F  ")?.key).toBe("f")
    expect(parseNavigation("file")).toBeUndefined()
  })

  test("targets the expected kind for each mnemonic", () => {
    const model = buildFixtureGraphWithSnapshot()

    expect(navigationTargets(model, parseNavigation("g s")!).map((node) => node.kind)).toEqual([
      "session",
    ])
    expect(navigationTargets(model, parseNavigation("g f")!).every((node) => node.kind === "file")).toBe(
      true,
    )
    expect(
      navigationTargets(model, parseNavigation("g d")!).every((node) => node.kind === "directory"),
    ).toBe(true)
    expect(navigationTargets(model, parseNavigation("g c")!).every((node) => node.kind === "commit")).toBe(
      true,
    )
  })

  test("navigationResults only handles g-prefixed queries", () => {
    const model = buildFixtureGraph()

    expect(navigationResults(model, "g t")?.every((node) => node.kind === "turn")).toBe(true)
    expect(navigationResults(model, "authentication")).toBeUndefined()
  })

  test("nextNavigationTarget cycles through the targets", () => {
    const model = buildFixtureGraph()
    const turns = navigationTargets(model, parseNavigation("g t")!)

    expect(nextNavigationTarget(model, parseNavigation("g t")!)?.id).toBe(turns[0]?.id)
    expect(nextNavigationTarget(model, parseNavigation("g t")!, turns[0]?.id)?.id).toBe(
      turns[1]?.id,
    )
    expect(nextNavigationTarget(model, parseNavigation("g t")!, turns.at(-1)?.id)?.id).toBe(
      turns[0]?.id,
    )
  })
})
