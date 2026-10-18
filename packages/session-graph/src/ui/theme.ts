import type { RenderTheme } from "@spacegraphjs/renderer"
import { createSignal, onCleanup, onMount } from "solid-js"

/**
 * The semantic tokens the host exposes as CSS custom properties (U3.7). Mapping by role keeps
 * OpenCode's token names out of the library: the renderer only ever sees a `RenderTheme`.
 */
const TOKENS = {
  background: "--v2-background-bg-base",
  surface: "--v2-background-bg-layer-01",
  surfaceMuted: "--v2-background-bg-layer-02",
  text: "--v2-text-text-base",
  textMuted: "--v2-text-text-muted",
  border: "--v2-border-border-base",
  accent: "--v2-text-text-accent",
  success: "--v2-state-fg-success",
  warning: "--v2-state-fg-warning",
  error: "--v2-state-fg-danger",
  edge: "--v2-text-text-faint",
  edgeMuted: "--v2-border-border-muted",
  selection: "--v2-text-text-accent",
  focus: "--v2-icon-icon-accent",
  fontFamily: "--v2-font-family-sans",
} as const

/** Used only when a token is absent (no stylesheet, a non-browser test); the token value wins. */
const FALLBACK: RenderTheme = {
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

/**
 * Builds a `RenderTheme` from a token reader. Pure so it can be unit-tested without a DOM: an empty
 * token falls back, and the font size matches the app body copy (13px).
 */
export function graphThemeFromTokens(read: (name: string) => string): RenderTheme {
  const pick = (name: string, fallback: string) => read(name).trim() || fallback

  return {
    background: pick(TOKENS.background, FALLBACK.background),
    surface: pick(TOKENS.surface, FALLBACK.surface),
    surfaceMuted: pick(TOKENS.surfaceMuted, FALLBACK.surfaceMuted),
    text: pick(TOKENS.text, FALLBACK.text),
    textMuted: pick(TOKENS.textMuted, FALLBACK.textMuted),
    border: pick(TOKENS.border, FALLBACK.border),
    accent: pick(TOKENS.accent, FALLBACK.accent),
    success: pick(TOKENS.success, FALLBACK.success),
    warning: pick(TOKENS.warning, FALLBACK.warning),
    error: pick(TOKENS.error, FALLBACK.error),
    edge: pick(TOKENS.edge, FALLBACK.edge),
    edgeMuted: pick(TOKENS.edgeMuted, FALLBACK.edgeMuted),
    selection: pick(TOKENS.selection, FALLBACK.selection),
    focus: pick(TOKENS.focus, FALLBACK.focus),
    fontFamily: pick(TOKENS.fontFamily, FALLBACK.fontFamily),
    fontSize: 13,
  }
}

/** Reads the resolved theme from an element's computed style. Browser-only. */
export function resolveGraphTheme(root: HTMLElement = document.documentElement): RenderTheme {
  const style = getComputedStyle(root)
  const theme = graphThemeFromTokens((name) => style.getPropertyValue(name))

  // P8.9: the host's document direction drives bidi; the graph coordinates are never mirrored.
  return { ...theme, direction: root.dir === "rtl" ? "rtl" : "ltr" }
}

/**
 * A reactive theme that re-resolves when the color scheme changes (the `.light`/`.dark` class the
 * host toggles, or the OS preference). The renderer receives a fresh value; the library never learns
 * what a token is.
 */
export function createGraphTheme(root: () => HTMLElement | undefined = () => document.documentElement) {
  const [theme, setTheme] = createSignal<RenderTheme>(FALLBACK)

  onMount(() => {
    const resolve = () => setTheme(resolveGraphTheme(root() ?? document.documentElement))
    resolve()
    const element = root() ?? document.documentElement
    const observer = new MutationObserver(resolve)
    observer.observe(element, { attributes: true, attributeFilter: ["class", "style", "data-color-scheme", "dir"] })
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    media.addEventListener("change", resolve)
    onCleanup(() => {
      observer.disconnect()
      media.removeEventListener("change", resolve)
    })
  })

  return theme
}
