import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { expect, sourceURL, story } from "../../stories/playwright/story"

// Proves the external SpaceGraph setup mounts in the real plugin host and renders its map surface. Screenshots are
// written only when GRAPH_CAPTURE_DIR is set, the same convention as the app's graph capture matrix.

const fixture = sourceURL(new URL("./plugin-spacegraph.fixture.tsx", import.meta.url))

const captureDir = process.env.GRAPH_CAPTURE_DIR

story.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: "dark", locale: "en-US" })

story.beforeEach(async ({ mount }) => {
  // Any story loads the app styles; the fixture mounts the real host beside it.
  await mount("ui-line-comment--editor")
})

async function capture(page: import("@playwright/test").Page, name: string) {
  if (!captureDir) return

  mkdirSync(captureDir, { recursive: true })
  await page.screenshot({ path: resolve(captureDir, name) })
}

story("the external plugin renders the map surface with the graph fixture", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  await page.evaluate(async (fixture) => {
    const { mountSpacegraphExternal } = await import(fixture)
    mountSpacegraphExternal()
  }, fixture)

  const surface = page.locator('[data-slot="spacegraph-surface-map"]')
  await expect(surface).toBeVisible({ timeout: 30_000 })

  const canvas = page.locator('[data-slot="graph-canvas-host"]')
  await expect(canvas).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await capture(page, "spacegraph-external-map.png")

  expect(errors).toEqual([])
})
