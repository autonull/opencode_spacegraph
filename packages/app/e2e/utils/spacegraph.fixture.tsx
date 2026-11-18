import { MemoryRouter, createMemoryHistory } from "@solidjs/router"
import { render } from "solid-js/web"
import type { Bridge } from "@opencode/plugin/gui/host"
import { AppBaseProviders, AppInterface } from "../../src/app"
import { PlatformProvider } from "../../src/runtime/platform/platform"
import { createWebPlatform } from "../../src/runtime/platform/web"

/**
 * The web app with a third-party GUI plugin installed. A Bridge carries the real
 * `gui-experimental.cjs` bundle into the app's production plugin loader; the spec serves the
 * bundle body at this URL. Everything else is the web platform, so the surface picker, host and
 * transcript are the ones a browser user gets.
 */
const BUNDLE_URL = "/e2e/spacegraph-gui-experimental.cjs"

export function mount(input: { server: string; path?: string }) {
  const root = document.getElementById("root")

  if (!root) throw new Error("Missing fixture root")
  const history = createMemoryHistory()

  if (input.path) history.set({ value: input.path, replace: true })

  const unused = async () => {
    throw new Error("Unexpected plugin bridge action")
  }

  const bridge: Bridge = {
    packaged: false,
    call: unused,
    subscribe: async () => ({ available: false }),
    on: () => () => undefined,
    embed: () => undefined,
    capture: async () => undefined,
    runMenubarItem: () => undefined,
    configure: () => undefined,
    async pluginGuis() {
      const response = await fetch(BUNDLE_URL)

      if (!response.ok) throw new Error(`Plugin bundle request failed: ${response.status}`)

      return {
        plugins: [{ id: "spacegraph", revision: "e2e", code: await response.text(), options: {} }],
        reserved: [],
      }
    },
    manager: {
      list: async () => [],
      enable: async () => undefined,
      disable: async () => undefined,
      reload: async () => undefined,
    },
  }

  const { platform } = createWebPlatform("e2e")

  platform.plugins = bridge

  render(
    () => (
      <PlatformProvider value={platform}>
        <AppBaseProviders locale="en">
          <AppInterface
            servers={[{ type: "sidecar", variant: "base", displayName: "Local Server", http: { url: input.server } }]}
            router={(props) => <MemoryRouter {...props} history={history} />}
          />
        </AppBaseProviders>
      </PlatformProvider>
    ),
    root,
  )
}
