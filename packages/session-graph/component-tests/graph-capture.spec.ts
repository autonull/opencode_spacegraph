import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { expect, story } from "../../storybook/playwright/story"

// The Cytoscape half of the Phase 5 capture (V5.4). The app has no renderer switch, so the second
// backend is captured through its Storybook story over the same canonical fixture. Writes only when
// GRAPH_CAPTURE_DIR is set, exactly like the app-side `capture.spec.ts`.

const captureDir = process.env.GRAPH_CAPTURE_DIR

type Harness = {
  select: (id: string | undefined) => void
  zoomTo: (percent: number) => void
  panTo: (nodeId: string) => void
  getViewport: () => { zoom: number; center: number[] } | undefined
}

story.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })

async function capture(page: import("@playwright/test").Page, name: string) {
  if (!captureDir) return
  mkdirSync(captureDir, { recursive: true })
  await page.screenshot({ path: resolve(captureDir, name) })
}

async function waitForStillCanvas(page: import("@playwright/test").Page) {
  let previous = ""
  let still = 0

  await expect
    .poll(
      async () => {
        const current = await page.evaluate(() => {
          const canvas = document.querySelector<HTMLCanvasElement>('[data-slot="graph-canvas-host"] canvas')
          return canvas ? canvas.toDataURL() : ""
        })
        still = current !== "" && current === previous ? still + 1 : 0
        previous = current
        return still >= 2
      },
      { intervals: [100] },
    )
    .toBe(true)
}

async function zoomTo(page: import("@playwright/test").Page, percent: number) {
  await page.evaluate((p) => {
    const harness = (window as unknown as { __graphView?: Harness }).__graphView
    harness?.zoomTo(p)
  }, percent)
  await waitForStillCanvas(page)
}

async function panTo(page: import("@playwright/test").Page, nodeId: string) {
  await page.evaluate((id) => {
    const harness = (window as unknown as { __graphView?: Harness }).__graphView
    harness?.panTo(id)
  }, nodeId)
  await waitForStillCanvas(page)
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

  // 20 — camera zoom ~1.5× fit (150%)
  await zoomTo(page, 150)
  await capture(page, "20-cytoscape-zoom-150.png")

  // 21 — camera zoom ~2.5× fit (250%)
  await zoomTo(page, 250)
  await capture(page, "21-cytoscape-zoom-250.png")

  // 22 — pan to turn 1
  await panTo(page, "turn:turn_1")
  await capture(page, "22-cytoscape-turn-1.png")

  // 23 — pan to turn 2
  await panTo(page, "turn:turn_2")
  await capture(page, "23-cytoscape-turn-2.png")

  // 24 — detail frame centred on the failure chain (failed tool)
  await panTo(page, "tool:prt_tool_shell_2")
  await capture(page, "24-cytoscape-failure-chain.png")

  expect(errors).toEqual([])
})
