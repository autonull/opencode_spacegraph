import { expect, story } from "../../storybook/playwright/story"

// T15.4: the equalizer's engine has been in the map since T15, and the panel is the way in. The
// presets are the product: a reader should not have to write rules to get value.

story("the equalizer's panel applies a preset and lists the rule", async ({ mount }) => {
  const root = await mount("session-graph-view--equalizer")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  // The panel is a window: the reader opens it from the map's View menu.
  await root.locator('[data-slot="graph-toolbar-view"] > summary').click()
  await root.locator('[data-slot="graph-equalizer-option"]').click()

  const panel = root.locator('[data-slot="graph-window"]')
  await expect(panel).toBeVisible()
  await expect(panel.locator('[data-slot="graph-equalizer-preset"]')).toHaveCount(5)

  await panel.locator('[data-preset="errors-larger"]').click()
  await expect(panel.locator('[data-slot="graph-equalizer-rule"]')).toHaveCount(1)
  await expect(panel.locator('[data-rule-id="errors-larger"]')).toBeVisible()

  // The reader can drop the rule again.
  await panel.locator('[data-slot="graph-equalizer-reset"]').click()
  await expect(panel.locator('[data-slot="graph-equalizer-rule"]')).toHaveCount(0)
})
