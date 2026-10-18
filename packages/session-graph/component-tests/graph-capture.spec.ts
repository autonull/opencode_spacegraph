import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { expect, story } from "../../storybook/playwright/story"

// The Cytoscape half of the Phase 5 capture (V5.4). The app has no renderer switch, so the second
// backend is captured through its Storybook story over the same canonical fixture. Writes only when
// GRAPH_CAPTURE_DIR is set, exactly like the app-side `capture.spec.ts`.

const captureDir = process.env.GRAPH_CAPTURE_DIR

type Harness = { select: (id: string | undefined) => void }

story.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })

async function capture(page: import("@playwright/test").Page, name: string) {
  if (!captureDir) return
  mkdirSync(captureDir, { recursive: true })
  await page.screenshot({ path: resolve(captureDir, name) })
}

story("captures the Cytoscape adapter over the canonical fixture", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view--cytoscape")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })
  await expect(host).toHaveAttribute("data-graph-renderer", "cytoscape")
  await expect(root.locator('[data-slot="cytoscape-card"]').first()).toBeVisible()
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await root.getByRole("button", { name: "Fit to view", exact: true }).click()
  await capture(page, "07-cytoscape-overview.png")

  await page.evaluate(() => (window as unknown as { __graphView: Harness }).__graphView.select("file:src/auth/token.ts"))
  await expect(root.locator('[data-slot="graph-inspector"]').getByText("src/auth/token.ts").first()).toBeVisible()
  await root.getByRole("button", { name: "Fit to view", exact: true }).click()
  await capture(page, "08-cytoscape-selected.png")

  expect(errors).toEqual([])
})
