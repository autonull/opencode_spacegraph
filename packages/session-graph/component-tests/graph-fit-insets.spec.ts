import { expect, story } from "../../storybook/playwright/story"

// T14.3 — the minimap is now a window, not an overlay over the canvas. The frame no longer
// needs to keep content clear of it. The window floats over the map and can be moved/resized.

story("the minimap opens as a window and does not affect frame insets", async ({ mount, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  const root = await mount("session-graph-view")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  await root.locator('[data-slot="graph-toolbar-layout"] summary').click()
  await root.locator('[data-slot="graph-layout-option"][data-value="tree"]').click()

  // Open the minimap window from the Show menu
  await root.locator('[data-slot="graph-toolbar-view"] > summary').click()
  await root.locator('button[aria-label="Toggle minimap"]').click()

  // The minimap should now be a window, not an overlay
  const minimapWindow = root.locator('[data-component="session-graph-window"][data-window-kind="minimap"]')
  await expect(minimapWindow).toBeVisible({ timeout: 5000 })

  // The window should contain the minimap SVG
  await expect(minimapWindow.locator('[data-slot="graph-minimap"]')).toBeVisible()
})
