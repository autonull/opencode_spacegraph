import { afterAll, beforeAll, expect, test } from "bun:test"
import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { readFileSync } from "node:fs"
import * as effect from "effect"
import { evaluatePluginBundle } from "../node_modules/@opencode/plugin/src/gui/host.ts"
import { Store } from "../node_modules/@opencode/plugin/src/gui/core.ts"
import { PluginContext } from "../node_modules/@opencode/plugin/src/gui/internal.ts"
import { usePlugin } from "../node_modules/@opencode/plugin/src/gui/solid.ts"
import * as Plugin from "../node_modules/@opencode/plugin/src/gui/plugin.ts"
import { Command, Panel, SessionSurface, SettingsPage, Style } from "../node_modules/@opencode/plugin/src/gui/registries.ts"
import * as solid from "solid-js"
import * as solidStore from "solid-js/store"
import * as solidWeb from "solid-js/web"
import { GraphToolbar } from "../src/host/chrome"
import { GraphFind } from "../src/host/ui/graph-find"
import type { GraphViewData } from "../src/model"

const pluginGui = { Plugin, Store, Command, Panel, SessionSurface, SettingsPage, Style, usePlugin }

const modules: Record<string, object> = {
  effect,
  "@opencode/ui/context/i18n": { useI18n: () => ({ t: (key: string) => key, plural: (key: string, count: number) => `${key}:${count}` }) },
  "@opencode/ui/text-input": { TextInput: () => null },
  "@opencode/ui/button": { Button: () => null },
  "@opencode/plugin/gui": pluginGui,
  "@opencode/plugin/gui/main": pluginGui,
  "solid-js": solid,
  "solid-js/web": solidWeb,
  "solid-js/store": solidStore,
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

type Props = Record<string, any>

function withChildren(node: HTMLElement, children: unknown) {
  const values = Array.isArray(children) ? children : [children]
  for (const value of values) {
    if (value !== undefined && value !== null) node.append(value as Node)
  }
  return node
}

function ui() {
  return {
    SettingsLayout: (props: Props) => {
      const node = document.createElement("section")
      node.setAttribute("data-slot", "settings-layout")
      node.setAttribute("data-title", props.title)
      return withChildren(node, props.children)
    },
    SettingsSection: (props: Props) => {
      const node = document.createElement("div")
      node.setAttribute("data-slot", "settings-section")
      node.setAttribute("data-title", props.title)
      return withChildren(node, props.children)
    },
    SettingsRow: (props: Props) => {
      const node = document.createElement("div")
      node.setAttribute("data-slot", "settings-row")
      node.setAttribute("data-title", props.title)
      return withChildren(node, props.children)
    },
    Button: (props: Props) => {
      const node = document.createElement("button")
      node.type = "button"
      if (props.onClick) node.addEventListener("click", () => props.onClick())
      return withChildren(node, props.children)
    },
    Select: (props: Props) => {
      const node = document.createElement("select")
      node.setAttribute("aria-label", props.label)
      for (const option of props.options) {
        const child = document.createElement("option")
        child.value = option.value
        child.textContent = option.label
        node.append(child)
      }
      node.value = props.value
      node.addEventListener("change", () => props.onChange(node.value))
      return node
    },
    Switch: (props: Props) => {
      const node = document.createElement("input")
      node.type = "checkbox"
      node.setAttribute("aria-label", props.label)
      node.checked = typeof props.checked === "function" ? props.checked() : props.checked
      node.addEventListener("change", () => props.onChange(node.checked))
      return node
    },
    TextInput: (props: Props) => {
      const node = document.createElement("input")
      node.setAttribute("aria-label", props.label)
      node.value = props.value?.() ?? ""
      node.addEventListener("input", () => props.onInput?.(node.value))
      return node
    },
  }
}

function hostContext() {
  return {
    id: "spacegraph",
    t: (key: string) => key,
    plural: (key: string, count: number) => `${key}:${count}`,
    add: () => {},
    sessions: { current: () => undefined },
    surfaces: { select: () => {} },
    stores: { prefs: memory({}), session: () => memory({}) },
    ui: ui(),
  }
}

let bundle: ReturnType<typeof evaluatePluginBundle>

beforeAll(() => {
  GlobalRegistrator.register()
  const code = readFileSync(new URL("../dist/gui-experimental.cjs", import.meta.url), "utf8")
  bundle = evaluatePluginBundle(code, {
    process: "window",
    require: (name: string) => {
      const module = modules[name]
      if (!module) throw new Error(`unexpected bundle require: ${name}`)
      return module
    },
  })
})

afterAll(() => GlobalRegistrator.unregister())

function mount(element: () => unknown, ctx: ReturnType<typeof hostContext>) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const dispose = solidWeb.render(() => solidWeb.createComponent(PluginContext.Provider, {
    value: ctx as never,
    get children() {
      return element()
    },
  }), container)
  return { container, dispose: () => { dispose(); container.remove() } }
}

function fixture(): GraphViewData {
  return {
    root: "session",
    nodes: [
      { id: "session", kind: "session", label: "Session", status: "neutral" },
      { id: "turn-1", kind: "turn", label: "Turn 1", status: "success" },
      { id: "tool-1", kind: "tool", label: "Tool 1", status: "success", turnID: "turn-1" },
    ],
    edges: [{ id: "e1", kind: "part-of", source: "tool-1", target: "turn-1", confidence: "structural" }],
    turns: ["turn-1"],
    turnByMessageID: new Map(),
  }
}

function chromeModel(ctx: ReturnType<typeof hostContext>) {
  const calls: string[] = []
  const session = { id: "session-1" }
  const model = {
    ctx,
    calls,
    lens: () => "navigator",
    level: () => "execution",
    layout: () => "lanes",
    depth: () => "flat",
    arrangement: () => "side",
    side: () => "end",
    parked: () => false,
    checkpointIndex: () => 0,
    neighborhoodMode: () => false,
    followMode: () => "off",
    focused: () => undefined,
    explicitlyCollapsedGroups: () => new Set<string>(),
    savedQueries: () => [],
    setDetailMode: (_session: unknown, value: string) => calls.push(`setDetailMode:${value}`),
    setDepth: (_session: unknown, value: string) => calls.push(`setDepth:${value}`),
    setLayout: (_session: unknown, value: string) => calls.push(`setLayout:${value}`),
  }
  return { model: model as never, session: session as never }
}

test("the shipped settings page mounts its controls inside the host layout", () => {
  const ctx = hostContext()
  const entries: Array<{ registry: unknown; value: any }> = []
  bundle.setup!({ ...ctx, add: (registry: unknown, value: unknown) => entries.push({ registry, value }) } as never)
  const entry = entries.find((item) => item.registry === SettingsPage)!
  const { container, dispose } = mount(() => entry.value.render(), ctx)

  expect(container.querySelector('[data-slot="settings-layout"]')).not.toBeNull()
  expect(container.querySelectorAll('[data-slot="settings-section"]').length).toBeGreaterThan(0)
  expect(container.querySelectorAll('[data-slot="settings-row"]').length).toBeGreaterThan(3)
  expect(container.querySelectorAll("select").length).toBeGreaterThan(0)
  expect(container.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(0)
  dispose()
})

test("the toolbar mounts its controls and routes a depth change through the headless hook", () => {
  const ctx = hostContext()
  const { model, session } = chromeModel(ctx)
  const graph = fixture()
  const { container, dispose } = mount(
    () => GraphToolbar({ model, session, screen: { transcript: { reveal: () => {} } } as never, graph: () => graph, onOpenWindow: () => {} }),
    ctx,
  )

  expect(container.querySelector(".sg-toolbar")).not.toBeNull()
  expect(container.querySelector('[aria-label="chrome.lens"]')).not.toBeNull()
  const depth = container.querySelector('[title="chrome.depth"]') as HTMLButtonElement
  expect(depth).not.toBeNull()
  depth.click()
  expect((model as any).calls).toContain("setDepth:layered")
  dispose()
})

test("the find panel mounts its chips and results", () => {
  const ctx = hostContext()
  const { model, session } = chromeModel(ctx)
  const graph = fixture()
  const { container, dispose } = mount(() => GraphFind({ model, session, graph: () => graph }), ctx)

  expect(container.querySelector(".sg-find-panel")).not.toBeNull()
  expect(container.textContent).toContain("Tool 1")
  dispose()
})
