import type { Page } from "@playwright/test"
import { expect, story } from "../../stories/playwright/story"

const rootDirection = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).direction)

// M6.8 — the chrome, breadcrumbs, popovers, and composer widget follow the document direction.
story("chrome, breadcrumbs, and popovers stay inside the viewport in RTL", async ({ mount, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const root = await mount("session-graph-view--detail-popover", { globals: { direction: "rtl" } })
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  expect(await rootDirection(page)).toBe("rtl")
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true)

  const breadcrumbs = root.locator('[data-slot="graph-breadcrumbs"]')
  await expect(breadcrumbs).toBeVisible()
  expect((await breadcrumbs.boundingBox())!.x).toBeGreaterThanOrEqual(0)

  const popover = root.locator('[data-slot="graph-popover"]')
  await expect(popover).toBeVisible()
  const box = (await popover.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(1440)

  // The `/` search is a modal overlay; it must not overflow on the leading edge.
  await root.locator('[data-slot="graph-canvas-region"]').focus()
  await page.keyboard.press("/")
  const search = root.locator('[data-slot="graph-search"]')
  await expect(search).toBeVisible()
  const searchBox = (await search.boundingBox())!
  expect(searchBox.x).toBeGreaterThanOrEqual(0)
  expect(searchBox.x + searchBox.width).toBeLessThanOrEqual(1440)
})

story("the composer widget uses the writing direction's inline edges in RTL", async ({ mount, page }) => {
  const root = await mount("session-graph-composer-widget--default", { globals: { direction: "rtl" } })
  const widget = root.locator(".composer-node-widget")
  await expect(widget).toBeVisible()

  expect(await widget.evaluate((element) => getComputedStyle(element).direction)).toBe("rtl")
  const icon = root.locator('.composer-node-widget-input-wrapper [data-slot="text-input-v2-leading-icon"]')
  await expect(icon).toHaveCount(1)
  expect(await icon.evaluate((element) => getComputedStyle(element).marginInlineEnd)).toBe("6px")
})
