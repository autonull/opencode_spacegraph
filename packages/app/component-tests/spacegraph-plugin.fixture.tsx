import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { pluginDefinition } from "../src/runtime/plugin/module"
import { mountSessionRegionWithSurfaces } from "./plugin-host.fixture"

const id = "spacegraph-external"

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

async function mount(code: string, surface: string) {
  const plugin = await pluginDefinition(id, code)

  const mounted = mountSessionRegionWithSurfaces({
    definitions: [plugin],
    active: `${id}:map`,
    messages: buildFixtureMessages(),
  })

  await mounted.waitForReady()

  const transcript = document.querySelector('[data-slot="session-transcript"]')
  transcript?.setAttribute("data-marker", "kept")
  mounted.selectSurface(surface)

  const selector = `[data-slot="${surface === "spacegraph.map" ? "spacegraph-surface-map" : "spacegraph-surface-hybrid"}"]`
  const deadline = performance.now() + 20_000

  while (performance.now() < deadline && !document.querySelector(selector)) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }

  const result = {
    rendered: !!document.querySelector(selector),
    canvas: !!document.querySelector('[data-slot="spacegraph-graph-canvas"]'),
    transcriptKept: document.querySelector('[data-slot="session-transcript"]')?.getAttribute("data-marker") === "kept",
    error: document.querySelector('[data-slot="surface-error"]')?.textContent ?? null,
    selected: (document.querySelector(selector) ? surface : "transcript"),
  }

  present(mounted.container)
  return result
}

/** Mounts the third-party plugin bundle's map surface through the production loader. */
export async function mountPluginMap(code: string) {
  return mount(code, "spacegraph.map")
}

/** Mounts the third-party plugin bundle's hybrid surface through the production loader. */
export async function mountPluginHybrid(code: string) {
  return mount(code, "spacegraph.hybrid")
}
