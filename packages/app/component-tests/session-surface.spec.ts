import { readFile } from "node:fs/promises"
import { expect, sourceURL, story } from "../../stories/playwright/story"

const fixture = sourceURL(new URL("./plugin-host.fixture.tsx", import.meta.url))

story.beforeEach(async ({ mount }) => {
  // Any story loads the app; the fixture mounts the real plugin host beside it.
  await mount("ui-line-comment--editor")
})

story("a contributed session surface renders and the transcript survives the switch", async ({ page }) => {
  const result = await page.evaluate(async (fixture) => {
    const { mountSessionSurface, until } = await import(fixture)
    const host = mountSessionSurface()
    const root = () => document.querySelector('[data-slot="surface-fixture"]')
    const transcript = () => root()?.querySelector('[data-slot="transcript"]')
    const map = () => root()?.querySelector('[data-slot="spike-map"]')

    await until(() => !!transcript() && !map())
    const original = transcript()!
    original.setAttribute("data-marker", "kept")

    host.select("spike.map")
    await until(() => !!map() && !transcript())
    const rendered = map()!.textContent === "Spike Map"

    host.select("transcript")
    await until(() => !!transcript() && !map())
    const sameTranscript = transcript() === original && original.getAttribute("data-marker") === "kept"

    const selected = host.selected()
    host.unmount()

    return { rendered, sameTranscript, selected }
  }, fixture)

  expect(result).toEqual({ rendered: true, sameTranscript: true, selected: "transcript" })
})

story("a real gui-experimental bundle contributes a rendered session surface", async ({ page }) => {
  const bundle = await readFile(new URL("./fixtures/session-surface-plugin.cjs", import.meta.url), "utf8")

  const result = await page.evaluate(
    async ({ fixture, bundle }) => {
      const { mountSessionSurfaceBundle, until } = await import(fixture)
      const host = await mountSessionSurfaceBundle(bundle)
      const root = () => document.querySelector('[data-slot="surface-fixture"]')
      const map = () => root()?.querySelector('[data-slot="spike-map"]')

      await until(() => !!host.entries().includes("session-surface"))
      host.select("spike.map")
      await until(() => !!map())
      const rendered = map()!.textContent?.startsWith("Spike Map") ?? false

      host.unmount()
      return { rendered }
    },
    { fixture, bundle },
  )

  expect(result).toEqual({ rendered: true })
})
