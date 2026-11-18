import { mountSessionSurfaceBundle, surfaceStorage, until } from "./plugin-host.fixture"

/**
 * Mounts the third-party plugin bundle's contributed surface through the app's production
 * `pluginDefinition` loader, selects the map or hybrid surface, and checks that the transcript
 * element survives the switch. Visual presentation is applied by the spec before capture.
 */
async function mount(surface: "spacegraph.map" | "spacegraph.hybrid", bundleCode: string, messages: readonly any[]) {
  const host = await mountSessionSurfaceBundle(bundleCode, surfaceStorage, messages)
  const root = () => document.querySelector('[data-slot="surface-fixture"]') as HTMLElement | null

  // Size the host before the renderer mounts: Three.js measures the canvas container once.
  const container = root()
  if (container) {
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

  await until(() => !!host.entries().includes("session-surface"))

  const transcript = () => root()?.querySelector('[data-slot="transcript"]')
  await until(() => !!transcript())
  const original = transcript()!
  original.setAttribute("data-marker", "kept")

  host.select(surface)
  const selector = `[data-slot="${surface === "spacegraph.map" ? "spacegraph-surface-map" : "spacegraph-surface-hybrid"}"]`
  await until(() => !!root()?.querySelector(selector))

  const canvasEl = root()?.querySelector('[data-slot="spacegraph-graph-canvas"]')
  const canvas = !!canvasEl
  const selectedSurface = host.selected()

  // The renderer mounts asynchronously (dynamic imports); wait for it to draw before capture.
  if (canvasEl) {
    const drawn = () => !!(canvasEl.querySelector("canvas,svg,[data-renderer]") || (canvasEl.firstElementChild?.children.length ?? 0) > 0)
    const drawDeadline = performance.now() + 10_000
    while (performance.now() < drawDeadline && !drawn()) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
  }

  // Switch back to the transcript: the seam keeps the same DOM node alive across surfaces, then
  // switch forward again so the caller sees the contributed surface for its screenshot.
  host.select("transcript")
  await until(() => !!transcript())
  const transcriptKept = transcript() === original && original.getAttribute("data-marker") === "kept"
  host.select(surface)
  await until(() => !!root()?.querySelector(selector))

  return {
    rendered: !!root()?.querySelector(selector),
    canvas,
    transcriptKept,
    error: root()?.querySelector('[data-slot="surface-error"]')?.textContent ?? null,
    selected: selectedSurface,
  }
}

export async function mountPluginMap(bundleCode: string, messages: readonly any[]) {
  return mount("spacegraph.map", bundleCode, messages)
}

export async function mountPluginHybrid(bundleCode: string, messages: readonly any[]) {
  return mount("spacegraph.hybrid", bundleCode, messages)
}
