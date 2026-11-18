import { expect, test } from "bun:test"
import * as effect from "effect"
import { evaluatePluginBundle } from "../node_modules/@opencode/plugin/src/gui/host.ts"
import { Store } from "../node_modules/@opencode/plugin/src/gui/core.ts"
import * as Plugin from "../node_modules/@opencode/plugin/src/gui/plugin.ts"
import { Command, Panel, SessionSurface, SettingsPage, Style } from "../node_modules/@opencode/plugin/src/gui/registries.ts"
import * as solid from "solid-js"
import * as solidStore from "solid-js/store"
import * as solidWeb from "solid-js/web"

// Solid's compiled JSX registers delegated events at module scope, which reads `window.document`.
// The bundle under test is the window build; provide the browser global the host would supply.
;(globalThis as unknown as { window: unknown }).window = {
  document: {
    addEventListener() {},
    removeEventListener() {},
    createElement: (tag: string) => ({ tagName: tag, style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }),
    createElementNS: (_ns: string, tag: string) => ({ tagName: tag, style: {}, setAttribute() {}, appendChild() {} }),
  },
}

const code = await Bun.file(new URL("../dist/gui-experimental.cjs", import.meta.url)).text()

const pluginGui = { Plugin, Store, Command, Panel, SessionSurface, SettingsPage, Style }

const modules: Record<string, object> = {
  effect,
  "@opencode/ui/context/i18n": { useI18n: () => ({ t: (key: string) => key, plural: (key: string) => key }) },
  "@opencode/ui/text-input": { TextInput: () => null },
  "@opencode/ui/button": { Button: () => null },
  "@opencode/plugin/gui": pluginGui,
  "@opencode/plugin/gui/main": pluginGui,
  "solid-js": solid,
  "solid-js/web": solidWeb,
  "solid-js/store": solidStore,
}

function load() {
  return evaluatePluginBundle(code, {
    process: "window",
    require: (name) => {
      const module = modules[name]
      if (!module) throw new Error(`unexpected bundle require: ${name}`)
      return module
    },
  })
}

function memory<T extends object>(initial: T) {
  const state = { value: initial }
  return {
    get value() {
      return state.value
    },
    update(update: (draft: T) => void) {
      const draft = structuredClone(state.value)
      update(draft)
      state.value = draft
    },
  }
}

test("gui-experimental bundle loads through the production loader", () => {
  const bundle = load()

  expect(bundle.definition.i18n?.en?.["spacegraph.surface.map"]).toBe("Session Map")
  expect(bundle.definition.i18n?.en?.["chrome.toolbar"]).toBe("Graph toolbar")
  expect(bundle.definition.i18n?.en?.["find.title"]).toBe("Find in graph")
  expect(bundle.definition.i18n?.en?.["ui.sessionGraph.inspector.title"]).toBe("Details")
  expect(bundle.definition.i18n?.en?.["ui.sessionGraph.note.added"]).toBe("Note added")
  expect(bundle.definition.i18n?.en?.["ui.sessionGraph.trace.downstreamAnnouncement"]).toBe("Downstream trace lit: {{label}} and what followed")
  expect(bundle.definition.stores?.prefs?.scope).toBe("global")
  expect(typeof bundle.setup).toBe("function")
})

test("setup contributes both surfaces, a command, a panel and a style", () => {
  const captured: Array<{ registry: unknown; value: unknown }> = []
  const bundle = load()

  bundle.setup!({
    id: "spacegraph",
    t: (key: string) => key,
    add: (registry: unknown, value: unknown) => {
      captured.push({ registry, value })
    },
    sessions: { current: () => undefined },
    surfaces: { select: () => {} },
    stores: { prefs: memory({}), session: () => memory({}) },
  } as never)

  const surfaces = captured
    .filter((entry) => entry.registry === SessionSurface)
    .map((entry) => (entry.value as { id: string }).id)
  expect(surfaces).toEqual(["spacegraph.map", "spacegraph.hybrid"])

  expect(captured.filter((entry) => entry.registry === Command)).toHaveLength(1)
  expect(captured.filter((entry) => entry.registry === Panel)).toHaveLength(1)
  expect(captured.filter((entry) => entry.registry === SettingsPage)).toHaveLength(1)
  expect(captured.filter((entry) => entry.registry === Style)).toHaveLength(1)
})

test("the bundle ships the interactive panel and settings styles", () => {
  const captured: Array<{ registry: unknown; value: unknown }> = []
  const bundle = load()

  bundle.setup!({
    id: "spacegraph",
    t: (key: string) => key,
    add: (registry: unknown, value: unknown) => {
      captured.push({ registry, value })
    },
    sessions: { current: () => undefined },
    surfaces: { select: () => {} },
    stores: { prefs: memory({}), session: () => memory({}) },
  } as never)

  const styles = captured
    .filter((entry) => entry.registry === Style)
    .map((entry) => entry.value as string)
    .join("\n")
  expect(styles).toContain(".sg-panel__results")
  expect(styles).toContain(".sg-settings__lenses")
  expect(styles).toContain(".sg-toolbar")
  expect(styles).toContain(".sg-find")
  expect(styles).toContain(".sg-legend")
  expect(styles).toContain(".sg-find-panel")
  expect(styles).toContain(".sg-status-bar")
  expect(styles).toContain(".sg-minimap")
  expect(styles).toContain(".sr-only")
  expect(styles).toContain(".sg-detail")
  expect(styles).toContain(".sg-files")
  expect(styles).toContain(".sg-gallery")
  expect(styles).toContain(".sg-popover")
})
