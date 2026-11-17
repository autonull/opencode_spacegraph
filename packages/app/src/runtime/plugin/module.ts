import {
  evaluatePluginBundle,
  inertModule,
  mainOnlyModule,
  type PluginModule,
  type Entry,
} from "@opencode/plugin/gui/host"

// Plugin bundles share the host's module instances, so tokens, contexts and schemas they import are the same objects
// the host checks against. In a window, the main SDK's name resolves to the window SDK.
const modules = {
  effect: () => import("effect"),
  "@opencode/plugin/gui": () => import("@opencode/plugin/gui"),
  "@opencode/plugin/gui/main": () => import("@opencode/plugin/gui"),
  "@opencode/plugin/gui/file": () => import("@opencode/plugin/gui/file"),
  "@opencode/plugin/gui/review": () => import("@opencode/plugin/gui/review"),
  "@opencode/plugin/gui/browser": () => import("@opencode/plugin/gui/browser"),
  "@opencode/plugin/rpc": () => import("@opencode/plugin/rpc"),
  "@opencode/schema/rpc": () => import("@opencode/schema/rpc"),
  "@opencode/client": () => import("@opencode/client"),
  "@opencode/client/effect": () => import("@opencode/client/effect"),
  "@opencode/client/solid": () => import("@opencode/client/solid"),
  "@opencode/ui/button": () => import("@opencode/ui/button"),
  "@opencode/ui/icon": () => import("@opencode/ui/icon"),
  "@opencode/ui/icon-button": () => import("@opencode/ui/icon-button"),
  "@opencode/ui/segmented-control": () => import("@opencode/ui/segmented-control"),
  "@opencode/ui/text-input": () => import("@opencode/ui/text-input"),
  "@opencode/ui/context/i18n": () => import("@opencode/ui/context/i18n"),
  "@opencode/session-ui/timeline/projection": () => import("@opencode/session-ui/timeline/projection"),
  "@opencode/session-ui/timeline/row": () => import("@opencode/session-ui/timeline/row"),
  "solid-js": () => import("solid-js"),
  "solid-js/web": () => import("solid-js/web"),
  "solid-js/store": () => import("solid-js/store"),
} satisfies Record<PluginModule, () => Promise<object>>

/**
 * Builds a host `Entry` for a plugin's `./gui-experimental` bundle, read from the desktop app's own server. The
 * bundle is evaluated here so the host reads its `Plugin.define` declarations (`os`, `stores`, `i18n`) before it
 * activates the plugin. A plugin with only a `main` setup gets an empty window setup, so it still lists as active. It
 * takes the server plugin's id. A bundle that fails to evaluate becomes an entry that fails, so Extensions › Plugins
 * reports it.
 */
export async function pluginDefinition(id: string, code: string): Promise<Entry> {
  const loaded = new Map<string, object>(
    await Promise.all(Object.entries(modules).map(async ([name, load]) => [name, await load()] as const)),
  )

  const bundle = await Promise.try(() =>
    evaluatePluginBundle(code, {
      process: "window",
      require: (name) => {
        const module = loaded.get(name)

        if (module) return module

        if (mainOnlyModule(name)) return inertModule(name)

        throw new Error(`Plugin GUI bundle requires a module the app does not share: ${name}`)
      },
    }),
  ).then(
    (value) => ({ ok: true as const, value }),
    (cause: unknown) => ({ ok: false as const, cause }),
  )

  if (!bundle.ok) return { id, windowEntry: () => Promise.reject(bundle.cause) }

  const setup = bundle.value.setup

  // A setup's returned cleanup reaches the host, which runs it when the plugin goes away.
  return { ...bundle.value.definition, id, windowEntry: async () => ({ default: (ctx: never) => setup?.(ctx) }) }
}
