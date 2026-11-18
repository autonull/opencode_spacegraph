import { DEFAULT_THEME, resolveTheme, type RenderTheme } from "@spacegraphjs/renderer"
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
  // T1.10: inferred edges need sufficient contrast in light mode; text-faint (grey-600) works in both.
  edgeMuted: "--v2-text-text-faint",
  selection: "--v2-text-text-accent",
  focus: "--v2-icon-icon-accent",
  fontFamily: "--v2-font-family-sans",
} as const

/**
 * Builds a `RenderTheme` from a token reader. Pure so it can be unit-tested without a DOM: an empty
 * token falls back to the renderer's palette, and the font size matches the app body copy (13px).
 */
export function graphThemeFromTokens(read: (name: string) => string): RenderTheme {
  return resolveTheme(TOKENS, read, DEFAULT_THEME)
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
  const [theme, setTheme] = createSignal<RenderTheme>(DEFAULT_THEME)

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
