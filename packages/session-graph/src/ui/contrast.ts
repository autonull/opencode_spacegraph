import type { RenderTheme } from "@spacegraphjs/renderer"

/**
 * T1.10 contrast audit. Contrast is computed from the resolved render theme, so the same check covers
 * the host's light and dark token sets without the graph knowing their names.
 */
export type Role = "text" | "textMuted" | "edge" | "edgeMuted" | "selection"

const TARGET: Record<Role, number> = {
  text: 4.5,
  textMuted: 4.5,
  edge: 3,
  edgeMuted: 3,
  selection: 3,
}

function channel(hex: string): [number, number, number] | undefined {
  const match = hex.trim().match(/^#([0-9a-f]{6})$/i)

  if (!match) return undefined
  const value = match[1]

  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16)) as [number, number, number]
}

function luminance(hex: string): number | undefined {
  const rgb = channel(hex)

  if (!rgb) return undefined
  const [r, g, b] = rgb.map((value) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(foreground: string, background: string): number | undefined {
  const a = luminance(foreground)
  const b = luminance(background)

  if (a === undefined || b === undefined) return undefined

  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** Contrast of every role against the canvas it is drawn on. */
export function themeContrast(theme: RenderTheme): Record<Role, number | undefined> {
  return {
    text: contrastRatio(theme.text, theme.background),
    textMuted: contrastRatio(theme.textMuted, theme.background),
    edge: contrastRatio(theme.edge, theme.background),
    edgeMuted: contrastRatio(theme.edgeMuted, theme.background),
    selection: contrastRatio(theme.selection, theme.background),
  }
}

export function failingRoles(theme: RenderTheme): Role[] {
  const ratios = themeContrast(theme)

  return (Object.keys(TARGET) as Role[]).filter((role) => (ratios[role] ?? 0) < TARGET[role])
}
