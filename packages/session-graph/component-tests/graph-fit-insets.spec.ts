import { expect, story } from "../../storybook/playwright/story"

// T6.10 — the minimap is drawn *over* the canvas, so the frame has to keep the content clear of it.
// The contract's fit options carry the insets (the chrome's footprint, in CSS pixels) and the
// renderer frames the content in what is left.
//
// The tree is the view that proves it: its content fills the frame, so without the insets the last
// cards sit under the minimap, and with them the frame moves the content up and to the left.

const overlapWithMinimap = async (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const minimap = document.querySelector<HTMLElement>('[data-slot="graph-minimap"]')

    if (!minimap) return -1

    // The framed content is the union of the cards it draws.
    let left = Infinity
    let top = Infinity
    let right = -Infinity
    let bottom = -Infinity

    for (const card of document.querySelectorAll<HTMLElement>(".html-node-container")) {
      const rect = card.getBoundingClientRect()

      left = Math.min(left, rect.left)
      top = Math.min(top, rect.top)
      right = Math.max(right, rect.right)
      bottom = Math.max(bottom, rect.bottom)
    }

    if (!Number.isFinite(left)) return -1

    const map = minimap.getBoundingClientRect()
    const width = Math.min(right, map.right) - Math.max(left, map.left)
    const height = Math.min(bottom, map.bottom) - Math.max(top, map.top)

    return width > 0 && height > 0 ? width * height : 0
  })

story("the frame keeps the content clear of the chrome drawn over the canvas", async ({ mount, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  const root = await mount("session-graph-view")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  await root.locator('[data-slot="graph-toolbar-draw"] summary').click()
  await root.locator('[data-slot="graph-layout-option"][data-strategy="tree"]').click()

  await root.locator('[data-slot="graph-toolbar-show"] summary').click()
  await root.locator('button[aria-label="Toggle minimap"]').click()
  await expect.poll(() => overlapWithMinimap(page)).toBe(0)
})
