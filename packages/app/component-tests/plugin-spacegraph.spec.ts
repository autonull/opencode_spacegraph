import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, sourceURL, story } from "../../stories/playwright/story"

// Proves the shipped SpaceGraph bundle mounts through the production loader and renders the surface, the stock Panel
// and the no-surface dialog. Screenshots are written only when GRAPH_CAPTURE_DIR is set.

const fixture = sourceURL(new URL("./plugin-spacegraph.fixture.tsx", import.meta.url))

const pluginDir = fileURLToPath(new URL("../../../packages/plugins/spacegraph", import.meta.url))

const bundlePath = resolve(pluginDir, "dist/gui-experimental.cjs")

const captureDir = process.env.GRAPH_CAPTURE_DIR

if (process.env.GRAPH_CAPTURE_SKIP_BUILD !== "1") {
  execFileSync("bun", ["run", "build"], { cwd: pluginDir, stdio: "inherit" })
}

const code = readFileSync(bundlePath, "utf8")

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

async function mount(
  page: import("@playwright/test").Page,
  name: "mountSpacegraphExternal" | "mountSpacegraphPanel" | "mountSpacegraphDialog",
) {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  await page.evaluate(
    async ({ fixture, name, code }) => {
      const module = await import(fixture)
      await module[name](code)
    },
    { fixture, name, code },
  )

  return errors
}

async function ready(
  page: import("@playwright/test").Page,
  selector: string,
  canvas = '[data-slot="graph-canvas-host"]',
) {
  await expect(page.locator(selector)).toBeVisible({ timeout: 30_000 })
  await expect(page.locator(canvas)).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}

story("the bundle renders the map surface with the graph fixture", async ({ page }) => {
  const errors = await mount(page, "mountSpacegraphExternal")

  await ready(page, '[data-slot="spacegraph-surface-map"]')
  await capture(page, "spacegraph-bundle-map.png")

  expect(errors).toEqual([])
})

story("the bundle renders the stock side panel", async ({ page }) => {
  const errors = await mount(page, "mountSpacegraphPanel")

  await ready(page, '[data-slot="spacegraph-panel"]')
  await capture(page, "spacegraph-bundle-panel.png")

  expect(errors).toEqual([])
})

story("the bundle opens the no-surface dialog fallback", async ({ page }) => {
  const errors = await mount(page, "mountSpacegraphDialog")

  await ready(
    page,
    '[data-slot="dialog-content"]',
    '[data-slot="dialog-content"] [data-slot="graph-canvas-host"]',
  )
  await capture(page, "spacegraph-bundle-dialog.png")

  expect(errors).toEqual([])
})
