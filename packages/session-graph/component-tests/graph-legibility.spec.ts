import { expect, story } from "../../storybook/playwright/story"

// T1.18 — the hierarchy outline and the file lens cannot show the whole session at a readable size,
// so the fit keeps a legible minimum scale and the reader pans the rest.
//
// The card's rendered height is the measure: a card is 72 world units tall, so half its natural size
// is 36px on screen, and the 13px label inside it stays at 6.5px — the size the lane views are read
// at. Without the floor the same views shrink the card to 22px, which is a smudge.

const MIN_CARD_HEIGHT_PX = 36

const cardHeight = async (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('.html-node-container:has([data-kind="tool"])')

    return card?.getBoundingClientRect().height ?? 0
  })

/** Picks a layout from the toolbar's layout menu. */
const pickLayout = async (root: import("@playwright/test").Locator, layout: string) => {
  await root.locator('[data-slot="graph-toolbar-layout"] summary').click()
  await root.locator(`[data-slot="graph-layout-option"][data-strategy="${layout}"]`).click()
}

story("a view too large for the frame keeps a legible scale", async ({ mount, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  const root = await mount("session-graph-view")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  // The hierarchy outline spreads over several columns; the fit must not shrink it into a smudge.
  await pickLayout(root, "hierarchy")
  await expect.poll(() => cardHeight(page)).toBeGreaterThanOrEqual(MIN_CARD_HEIGHT_PX)

  // T7: the tree and the force layout are different geometries, and each one carries its own frame.
  for (const layout of ["tree", "force"]) {
    await pickLayout(root, layout)
    await expect.poll(() => cardHeight(page)).toBeGreaterThanOrEqual(MIN_CARD_HEIGHT_PX)
  }

  // The file lens squeezes the canvas between the changed-files rail and the inspector.
  await pickLayout(root, "lanes")
  await root.locator('button[aria-label="Toggle changed files"]').click()
  await expect.poll(() => cardHeight(page)).toBeGreaterThanOrEqual(MIN_CARD_HEIGHT_PX)
})
