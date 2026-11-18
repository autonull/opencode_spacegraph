import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { expect, sourceURL, story } from "../../stories/playwright/story"

// Proves the third-party plugin bundle loads through the production plugin
// definition loader and that each contributed surface renders in the real app
// host while the transcript element stays mounted.

const fixture = sourceURL(new URL("./spacegraph-plugin.fixture.tsx", import.meta.url))
const code = readFileSync(
  new URL("../../../spacegraph-gui-plugin/dist/gui-experimental.cjs", import.meta.url),
  "utf8",
)
const messages = JSON.parse(
  readFileSync(new URL("./fixtures/spacegraph-messages.json", import.meta.url), "utf8"),
)
// Canonical gallery frames live in docs, not in Playwright's gitignored test-results.
const screenshots = fileURLToPath(new URL("../../../docs/spacegraph/screenshots/", import.meta.url))

story.use({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "en-US" })

story.beforeEach(async ({ mount }) => {
  await mount("ui-line-comment--editor")
})

async function load(page: import("@playwright/test").Page, name: "mountPluginMap" | "mountPluginHybrid") {
  return page.evaluate(
    async ({ fixture, code, name, messages }) => {
      const module = await import(fixture)
      return module[name](code, messages)
    },
    { fixture, code, name, messages },
  )
}

story("the plugin bundle renders the map surface and keeps the transcript mounted", async ({ page }) => {
  const result = await load(page, "mountPluginMap")

  expect(result).toEqual({
    rendered: true,
    canvas: true,
    transcriptKept: true,
    error: null,
    selected: "spacegraph.map",
  })

  await page.locator('[data-slot="surface-fixture"]').screenshot({ path: `${screenshots}55-plugin-surface-map.png` })
})

story("the plugin bundle renders the hybrid surface and keeps the transcript mounted", async ({ page }) => {
  const result = await load(page, "mountPluginHybrid")

  expect(result).toEqual({
    rendered: true,
    canvas: true,
    transcriptKept: true,
    error: null,
    selected: "spacegraph.hybrid",
  })

  await page.locator('[data-slot="surface-fixture"]').screenshot({ path: `${screenshots}56-plugin-surface-hybrid.png` })
})
