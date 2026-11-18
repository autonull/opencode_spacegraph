import { expect, sourceURL, story } from "../../stories/playwright/story"

// P3.6 — the host widget wrapper owns focus and labels; the library layer owns only lifecycle.
const fixtureURL = sourceURL(new URL("./node-widget-layer.fixture.tsx", import.meta.url))

story("widget wrappers carry labels and a roving tabindex", async ({ mount, page }) => {
  await mount("session-graph-composer-widget")
  await page.evaluate(async (url) => {
    const fixture = await import(url)
    const host = document.createElement("div")
    host.setAttribute("data-testid", "widget-layer")
    document.body.appendChild(host)
    fixture.mountWidgetLayer(host)
  }, fixtureURL)

  const wrappers = page.getByTestId("widget-layer").locator('[data-slot="session-node-widget-wrapper"]')
  await expect(wrappers).toHaveCount(3)
  await expect(wrappers.nth(0)).toHaveAttribute("aria-label", "composer widget")
  await expect(wrappers.nth(0)).toHaveAttribute("tabindex", "0")
  await expect(wrappers.nth(1)).toHaveAttribute("tabindex", "-1")
  await expect(wrappers.nth(2)).toHaveAttribute("tabindex", "-1")

  await wrappers.nth(0).focus()
  await wrappers.nth(0).press("ArrowRight")
  await expect(wrappers.nth(1)).toHaveAttribute("tabindex", "0")
  await expect(wrappers.nth(0)).toHaveAttribute("tabindex", "-1")

  await wrappers.nth(1).press("ArrowLeft")
  await expect(wrappers.nth(0)).toHaveAttribute("tabindex", "0")
})
