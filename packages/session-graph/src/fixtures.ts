import type { RenderTheme } from "@spacegraphjs/renderer"

/**
 * The dark theme the graph's stories, captures and tests share. It matches the app's dark mode
 * tokens, so a captured frame looks like the product rather than like a test harness.
 */
export const DARK_THEME: RenderTheme = {
  background: "#101014",
  surface: "#1b1b22",
  surfaceMuted: "#2a2a33",
  text: "#f5f5f7",
  textMuted: "#a0a0aa",
  border: "#3a3a44",
  accent: "#3b82f6",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  edge: "#6b7280",
  edgeMuted: "#4b5563",
  selection: "#60a5fa",
  focus: "#93c5fd",
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
}
