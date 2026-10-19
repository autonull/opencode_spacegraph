import { describe, expect, test } from "bun:test"
import type { RenderTheme } from "@spacegraphjs/renderer"
import { contrastRatio, failingRoles, themeContrast } from "./contrast"
import { graphThemeFromTokens } from "./theme"

// T1.10: both schemes must clear WCAG AA for the roles the canvas draws. The light palette mirrors
// the host's resolved light tokens; dark uses the documented fallback.
const LIGHT: RenderTheme = {
  background: "#f7f7f8",
  surface: "#ffffff",
  surfaceMuted: "#f0f0f2",
  text: "#1a1a1c",
  textMuted: "#5c5c66",
  border: "#c9c9cf",
  accent: "#2563eb",
  success: "#15803d",
  warning: "#b45309",
  error: "#dc2626",
  edge: "#6b7280",
  edgeMuted: "#8a8a94",
  selection: "#2563eb",
  focus: "#1d4ed8",
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
}

const dark = () => graphThemeFromTokens(() => "")

describe("graph theme contrast", () => {
  test("computes WCAG ratios and ignores unparseable colours", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5)
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5)
    expect(contrastRatio("var(--x)", "#ffffff")).toBeUndefined()
  })

  test("dark and light both clear the text and non-text targets", () => {
    for (const theme of [dark(), LIGHT]) {
      expect(failingRoles(theme)).toEqual([])
      expect(themeContrast(theme).textMuted!).toBeGreaterThanOrEqual(4.5)
      expect(themeContrast(theme).edgeMuted!).toBeGreaterThanOrEqual(3)
    }
  })

  test("the audit catches a cue that would vanish on the canvas", () => {
    expect(failingRoles({ ...LIGHT, edgeMuted: "#f2f2f2" })).toEqual(["edgeMuted"])
  })
})
