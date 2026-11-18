import { expect, test } from "@playwright/test"
import { openPluginSession, selectSurface } from "../utils/spacegraph"

test("the installed plugin renders the map surface with a graph", async ({ page }) => {
  await openPluginSession(page)
  await selectSurface(page, "Session Map")

  const surface = page.locator('[data-slot="spacegraph-surface-map"]')
  await expect(surface).toBeVisible()
  await expect(surface.locator('[data-slot="spacegraph-graph-canvas"] canvas')).toBeVisible()
  await expect(page.getByText("Something went wrong")).toHaveCount(0)
})

test("the installed plugin renders the hybrid surface and keeps the transcript", async ({ page }) => {
  await openPluginSession(page)
  const held = page.locator('[data-slot="session-transcript"]')
  await expect(held).toBeAttached()
  await held.evaluate((element) => element.setAttribute("data-e2e-marker", "kept"))

  await selectSurface(page, "Map + Transcript")

  const surface = page.locator('[data-slot="spacegraph-surface-hybrid"]')
  await expect(surface).toBeVisible()
  await expect(surface.locator('[data-slot="spacegraph-graph-canvas"] canvas')).toBeVisible()

  await selectSurface(page, "Transcript")
  await expect(page.locator('[data-slot="session-transcript"][data-e2e-marker="kept"]')).toBeAttached()
})

test("host widgets render when the plugin's widgets preference is on", async ({ page }) => {
  await openPluginSession(page, { widgets: true })
  await selectSurface(page, "Session Map")

  const layer = page.locator('[data-slot="graph-node-widget-layer"]')
  await expect(layer).toBeVisible()
  await expect(layer.locator('[data-slot="session-node-widget-wrapper"]').first()).toBeVisible()
})

test("host widgets do not render when the preference is off", async ({ page }) => {
  await openPluginSession(page)
  await selectSurface(page, "Session Map")

  await expect(page.locator('[data-slot="spacegraph-surface-map"]')).toBeVisible()
  await expect(page.locator('[data-slot="session-node-widget-wrapper"]')).toHaveCount(0)
})
