import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { evaluatePluginBundle } from "@opencode/plugin/gui/host"
import { expect, test } from "bun:test"
import { Schema } from "effect"
import * as effect from "effect"
import * as pluginGui from "@opencode/plugin/gui"
import path from "node:path"
import * as solid from "solid-js"
import * as solidStore from "solid-js/store"

// Mock solid-js/web to avoid "Client-only API called on the server side" errors.
// The bundle requires solid-js/web for JSX runtime functions (template, effect, memo, etc.)
// but the test runs in Node.js without a real browser environment.
const solidWeb = {
  // JSX runtime - template returns a no-op function since we don't actually create DOM
  template: () => () => {},
  effect: (fn: () => void) => fn(),
  memo: (fn: () => any) => fn(),
  createComponent: (Component: any, props: any) => ({ Component, props }),
  mergeProps: (props: any) => props,
  splitProps: (props: any, _keys: string[]) => [props, {}],
  insert: () => {},
  spread: (props: any, ...sources: any[]) => Object.assign(props, ...sources),
  // Component helpers - return children or empty
  For: (props: any) => props.each?.map((item: any, i: number) => props.children?.(item, i)) ?? [],
  Index: (props: any) => props.each?.map((item: any, i: number) => props.children?.(item, i)) ?? [],
  Show: (props: any) => props.when ? props.children : props.fallback ?? null,
  Switch: (props: any) => props.children,
  Match: (props: any) => props.children,
  ErrorBoundary: (props: any) => props.children,
  Suspense: (props: any) => props.children,
  SuspenseList: (props: any) => props.children,
  Portal: (props: any) => props.children,
  Dynamic: (props: any) => props.component,
  lazy: (fn: () => Promise<any>) => fn(),
  // Reactivity (re-exported from solid-js)
  createSignal: (value?: any) => {
    let v = value;
    return [() => v, (next: any) => { v = typeof next === "function" ? next(v) : next; }] as const;
  },
  createEffect: (fn: () => void) => fn(),
  createMemo: (fn: () => any) => fn(),
  createResource: () => [{}, () => {}],
  createContext: (defaultValue?: any) => ({ Provider: (props: any) => props.children, defaultValue }),
  useContext: (context: any) => context.defaultValue ?? {},
  root: (fn: () => any) => fn(),
  untrack: (fn: () => any) => fn(),
  batch: (fn: () => any) => fn(),
  startTransition: (fn: () => any) => fn(),
  onCleanup: () => {},
  onMount: () => {},
  onError: () => {},
  getOwner: () => null,
  setOwner: () => {},
  runWithOwner: (_owner: any, fn: () => any) => fn(),
  enableScheduling: () => {},
  children: () => null,
  toArray: (children: any) => Array.isArray(children) ? children : children ? [children] : [],
  // DOM
  render: () => () => {},
  // Properties
  Properties: new Set(),
  ChildProperties: new Set(),
  Aliases: {},
  PropAliases: {},
  DelegatedEvents: new Set(),
  SVGElements: new Set(),
  SVGNamespace: { xlink: "", xml: "" },
  DOMElements: new Set(),
  reconcileArrays: () => {},
  getPropAlias: () => undefined,
  // Event delegation
  delegateEvents: (events: string[]) => {},
  setAttribute: () => {},
  removeAttribute: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  createEvent: () => ({}),
  // SSR
  isServer: false,
  hydrate: () => {},
  // Streaming
  stream: () => {},
  } as any

GlobalRegistrator.register()

const here = import.meta.dir
const bundlePath = path.join(here, "dist/gui-experimental.cjs")

const modules: Record<string, object> = {
  effect,
  "@opencode/plugin/gui": pluginGui,
  "solid-js": solid,
  "solid-js/store": solidStore,
  "solid-js/web": solidWeb,
}

function build() {
  const result = Bun.spawnSync({
    cmd: ["bun", path.join(here, "build.ts")],
    stdout: "inherit",
    stderr: "inherit",
  })

  if (result.exitCode !== 0) throw new Error("The plugin bundle failed to build")
}

build()

const allowlist = new Set([
  "effect",
  "@opencode/plugin/gui",
  "solid-js",
  "solid-js/store",
  "solid-js/web",
])

test("the bundle requires only modules the host provides", async () => {
  const code = await Bun.file(bundlePath).text()
  const required = new Set([...code.matchAll(/require\("([^"]+)"\)/g)].map((match) => match[1]!))
  const unexpected = [...required].filter((name) => !allowlist.has(name))

  expect(unexpected).toEqual([])
})

test("the built bundle evaluates as a window plugin with the expected declarations", async () => {
  const bundle = evaluatePluginBundle(await Bun.file(bundlePath).text(), {
    process: "window",
    require(name) {
      const module = modules[name]

      if (!module) throw new Error(`The bundle required a module the host does not provide: ${name}`)

      return module
    },
  })

  expect(bundle.setup).toBeInstanceOf(Function)
  expect(Schema.isSchema(bundle.definition.stores?.prefs?.schema)).toBe(true)
  expect(bundle.definition.stores?.prefs?.scope).toBe("global")
  expect(bundle.definition.stores?.session?.scope).toBe("session")
  expect(bundle.definition.i18n?.en?.["panel.title"]).toBe("Session map")
})
