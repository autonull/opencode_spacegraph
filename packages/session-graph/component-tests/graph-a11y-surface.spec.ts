import { expect, story } from "../../stories/playwright/story"

// M6.1/M6.2 — the interactive graph exposes one instance-scoped mirror; its name and every
// announcement carry the surface, so two graphs on one page are distinguishable.
story("names the surface and keeps the active item instance-scoped @a11y", async ({ mount, page }) => {
  const root = await mount("session-graph-view--fullscreen")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  const mirror = root.locator('[data-slot="graph-a11y"]')
  await expect(mirror).toHaveAttribute("aria-label", "Graph contents: Session map")

  const list = mirror.locator("ul").first()
  await expect(list).toHaveAttribute("aria-activedescendant", /.+/)

  const ids = await mirror.locator("li[data-id]").evaluateAll((entries) => entries.map((entry) => entry.id))
  expect(ids.length).toBeGreaterThan(2)
  expect(new Set(ids).size).toBe(ids.length)

  // A view change is announced with the surface it happened on.
  const toolbar = root.locator('[data-slot="graph-toolbar"]')
  const layers = toolbar.locator('[data-slot="graph-toolbar-layers"]')
  await layers.locator(":scope > summary").click()
  await toolbar.locator('[data-slot="graph-layers-level"] button', { hasText: "Overview" }).click()

  await expect(mirror.locator('[aria-live="polite"]')).toContainText("on Session map")
})
