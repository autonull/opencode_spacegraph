import type { Entry } from "@opencode/plugin/gui/host"
import definition from "@opencode/gui-plugins/spacegraph"
import setup from "@opencode/gui-plugins/spacegraph/external"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { mountBuiltInSurface } from "./plugin-host.fixture"

const id = "spacegraph-external"

/** Mounts the external SpaceGraph setup (the code the shipped bundle contains) with the canonical graph fixture. */
export function mountSpacegraphExternal() {
  const plugin: Entry = {
    ...definition,
    id,
    windowEntry: async () => ({ default: (ctx: never) => setup(ctx) }),
  }

  const mounted = mountBuiltInSurface({ definitions: [plugin], surface: `${id}.map`, messages: buildFixtureMessages() })

  // Cover the light story the test mounts first, so screenshots record the plugin rather than the story behind it.
  Object.assign(mounted.container.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    width: "100vw",
    height: "100vh",
    padding: "24px",
    background: "var(--v2-background-bg-base, #111)",
  })

  return mounted
}
