import type { Context } from "@opencode/plugin/gui"
import { pluginDefinition } from "../src/runtime/plugin/module"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { mountSessionRegion, mountSessionRegionWithSurfaces } from "./plugin-host.fixture"

const id = "spacegraph-external"

/** The plugin every frame mounts: the shipped bundle evaluated through the production loader. */
const load = (code: string) => pluginDefinition(id, code)

/** Covers the light story the test mounts first, so screenshots record the plugin rather than the story behind it. */
function present(container: HTMLElement) {
  Object.assign(container.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    width: "100vw",
    height: "100vh",
    padding: "24px",
    background: "var(--v2-background-bg-base, #111)",
  })
}

/** Mounts the bundle's map surface, the fork/reference path that has `ctx.surfaces`. */
export async function mountSpacegraphExternal(code: string) {
  const plugin = await load(code)

  const mounted = mountSessionRegionWithSurfaces({
    definitions: [plugin],
    active: `${id}:map`,
    messages: buildFixtureMessages(),
  })

  await mounted.waitForReady()
  present(mounted.container)

  return mounted
}

/** Mounts the bundle's side panel, the stock path a host without `ctx.surfaces` uses. */
export async function mountSpacegraphPanel(code: string) {
  const plugin = await load(code)

  const mounted = mountSessionRegion({
    definitions: [plugin],
    active: `${id}:map`,
    messages: buildFixtureMessages(),
  })

  await mounted.waitForReady()
  present(mounted.container)

  return mounted
}

/**
 * Mounts the bundle on a stock host (no `ctx.surfaces`) and opens the map dialog through the hybrid command, the
 * no-surface fallback.
 */
export async function mountSpacegraphDialog(code: string) {
  const plugin = await load(code)
  const entry = await plugin.windowEntry?.()

  if (!entry) throw new Error("The bundle has no window entry")

  const mounted = mountSessionRegion({
    definitions: [
      {
        ...plugin,
        windowEntry: async () => ({
          default: (ctx) => {
            // SAFETY: `Entry` types the setup context as `never` so every plugin's narrower context fits; at runtime
            // the host's object is here.
            const host = ctx as Context

            // SAFETY: a stock host omits `surfaces`; a proxy hides the getter-only property without assigning to it.
            const stock = new Proxy(host, {
              get(target, key) {
                if (key === "surfaces") return undefined

                // SAFETY: the trap forwards every other read to the host context, whose keys are `keyof Context`.
                return target[key as keyof Context]
              },
            })

            // SAFETY: `entry.default` is the bundle's setup; `stock` is the same context with `surfaces` removed.
            return entry.default(stock as never)
          },
        }),
      },
    ],
    active: `${id}:map`,
    messages: buildFixtureMessages(),
  })

  await mounted.waitForReady()
  present(mounted.container)

  const deadline = performance.now() + 5000

  while (!mounted.route("hybrid")) {
    if (performance.now() > deadline) throw new Error("The hybrid command never registered")
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }

  return mounted
}