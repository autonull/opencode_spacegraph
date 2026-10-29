import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { evaluatePluginBundle } from "@opencode/plugin/gui/host"
import { expect, test } from "bun:test"
import { Schema } from "effect"
import * as effect from "effect"
import * as pluginGui from "@opencode/plugin/gui"
import path from "node:path"
import * as solid from "solid-js"
import * as solidStore from "solid-js/store"
import * as solidWeb from "solid-js/web"

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
