import { describe, expect, test } from "bun:test"
import { graphThemeFromTokens } from "./theme"

const tokens: Record<string, string> = {
  "--v2-background-bg-base": "#000",
  "--v2-background-bg-layer-01": "#111",
  "--v2-background-bg-layer-02": "#222",
  "--v2-text-text-base": "#eee",
  "--v2-text-text-muted": "#aaa",
  "--v2-border-border-base": "#333",
  "--v2-text-text-accent": " #3b82f6 ",
  "--v2-state-fg-success": "#0f0",
  "--v2-state-fg-warning": "#ff0",
  "--v2-state-fg-danger": "#f00",
  "--v2-text-text-faint": "#777",
  "--v2-border-border-muted": "#444",
  "--v2-icon-icon-accent": "#93c5fd",
  "--v2-font-family-sans": "Inter, sans-serif",
}

describe("graph theme bridge", () => {
  test("maps semantic tokens to the render theme and trims whitespace", () => {
    const theme = graphThemeFromTokens((name) => tokens[name] ?? "")

    expect(theme.background).toBe("#000")
    expect(theme.surface).toBe("#111")
    expect(theme.surfaceMuted).toBe("#222")
    expect(theme.text).toBe("#eee")
    expect(theme.textMuted).toBe("#aaa")
    expect(theme.border).toBe("#333")
    expect(theme.accent).toBe("#3b82f6")
    expect(theme.success).toBe("#0f0")
    expect(theme.warning).toBe("#ff0")
    expect(theme.error).toBe("#f00")
    expect(theme.edge).toBe("#777")
    expect(theme.edgeMuted).toBe("#444")
    expect(theme.selection).toBe("#3b82f6")
    expect(theme.focus).toBe("#93c5fd")
    expect(theme.fontFamily).toBe("Inter, sans-serif")
    expect(theme.fontSize).toBe(13)
  })

  test("falls back when a token is absent so a missing stylesheet never yields an empty theme", () => {
    const theme = graphThemeFromTokens(() => "")

    for (const value of Object.values(theme)) expect(value).not.toBe("")
    expect(theme.fontSize).toBe(13)
  })
})
