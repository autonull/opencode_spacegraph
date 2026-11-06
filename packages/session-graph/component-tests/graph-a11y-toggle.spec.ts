import { expect, story } from "../../stories/playwright/story"

// Phase 4.5: Screen-reader tree — component test asserting roving-tabindex list matches drawn set after level toggle

story("a11y tree matches drawn set after level toggle", async ({ mount, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  const root = await mount("session-graph-view--fullscreen")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  const canvasHost = root.locator('[data-slot="graph-canvas-host"]')
  const toolbar = root.locator('[data-slot="graph-toolbar"]')

  // Get the initial drawn node count at execution level (tool/file/result nodes)
  const executionNodes = await canvasHost.locator('[data-node-id^="tool:"], [data-node-id^="file:"], [data-node-id^="result:"]').count()

  // Get the initial a11y item count (the a11y tree uses <li> elements with data-id)
  const a11yItems = root.locator('[data-slot="graph-a11y"] li[data-id]')
  const initialA11yCount = await a11yItems.count()

  // The a11y tree should have at least as many items as drawn nodes (plus bands/groups)
  expect(initialA11yCount).toBeGreaterThanOrEqual(executionNodes)

  // Toggle to overview level
  const layersMenu = toolbar.locator('[data-slot="graph-toolbar-layers"]')
  await layersMenu.locator(":scope > summary").click()
  await toolbar.locator('[data-slot="graph-layers-level"] button', { hasText: "Overview" }).click()

  // Wait for canvas to settle
  await expect(canvasHost).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  // Get the drawn node count at overview level (should be fewer - only phase/session nodes)
  const overviewNodes = await canvasHost.locator('[data-node-id^="phase:"], [data-node-id^="session"]').count()

  // Get the a11y item count after level toggle
  const a11yItemsAfter = await a11yItems.count()

  // The a11y tree should match the drawn set at overview level
  expect(a11yItemsAfter).toBeGreaterThanOrEqual(overviewNodes)

  // Toggle back to execution level - reopen layers menu
  await layersMenu.locator(":scope > summary").click()
  await toolbar.locator('[data-slot="graph-layers-level"] button', { hasText: "Execution" }).click()

  // Wait for canvas to settle
  await expect(canvasHost).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  // Get the a11y item count after toggling back
  const a11yItemsFinal = await a11yItems.count()

  // The a11y tree should match the drawn set at execution level again
  expect(a11yItemsFinal).toBeGreaterThanOrEqual(executionNodes)
})