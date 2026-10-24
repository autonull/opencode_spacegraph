import { expect, story } from "../../storybook/playwright/story"

story("U3.13 minimap: overview renders from positions and pans through the shared viewport", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  // RF.7: the minimap defaults off and is a toggle.
  await expect(root.locator('[data-slot="graph-minimap"]')).toHaveCount(0)
  await root.locator('[data-slot="graph-toolbar-view"] > summary').click()
  await root.locator('[data-slot="graph-toolbar"] button[aria-label="Toggle minimap"]').click()

  const minimap = root.locator('[data-slot="graph-minimap"]')
  await expect(minimap).toBeVisible()
  await expect(minimap.locator("circle").first()).toBeVisible()
  expect(await minimap.locator("circle").count()).toBeGreaterThan(2)

  // The view rectangle tracks the adapter's reported viewport, so it appears once a frame has run.
  await expect.poll(async () => minimap.locator("rect").count(), { timeout: 10_000 }).toBeGreaterThan(0)

  // Clicking the overview pans the main camera through setViewport, without a console error.
  await minimap.click({ position: { x: 40, y: 40 } })
  await page.waitForTimeout(150)
  expect(errors).toEqual([])
})
