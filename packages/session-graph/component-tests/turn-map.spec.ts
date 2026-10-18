import { expect, story } from "../../storybook/playwright/story"

// H6.2/H6.4/H6.6: the hybrid surface a host mounts over the transcript. Each story renders the real
// component over the canonical fixture, so the assertions read production DOM, not a copy.

type TurnMapWindow = {
  __turnMap?: {
    open: () => void
    close: () => void
    opened: () => boolean
    openedFull: () => string | undefined
  }
}

const TURN_ID = "turn:msg_user_1"

story("opens the turn map over the transcript and closes on Escape", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-turn-map")
  const dialog = root.getByRole("dialog", { name: "Turn map" })
  const host = dialog.locator('[data-slot="graph-canvas-host"]')

  await expect(dialog).toBeVisible()
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })
  await expect(dialog.locator('[data-slot="graph-turn-map-canvas"]')).toBeVisible()

  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect.poll(() => page.evaluate(() => (window as unknown as TurnMapWindow).__turnMap!.opened())).toBe(false)

  expect(errors).toEqual([])
})

story("opens the full graph from the overlay", async ({ mount, page }) => {
  const root = await mount("session-graph-turn-map")

  await expect(root.getByRole("dialog", { name: "Turn map" })).toBeVisible()
  await root.getByRole("button", { name: "Open full graph" }).click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as TurnMapWindow).__turnMap!.openedFull()))
    .toBe(TURN_ID)
})

story("keeps keyboard focus trapped inside the overlay", async ({ mount, page }) => {
  const root = await mount("session-graph-turn-map")
  const dialog = root.getByRole("dialog", { name: "Turn map" })

  await expect(dialog).toBeVisible()
  await expect(dialog).toBeFocused()

  const inside = () =>
    page.evaluate(() => document.activeElement?.closest('[data-slot="graph-turn-map"]') !== null)

  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab")
    expect(await inside()).toBe(true)
  }

  await page.keyboard.press("Shift+Tab")
  expect(await inside()).toBe(true)
})

story("renders the turn map with the Cytoscape fallback", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-turn-map--cytoscape")
  const host = root.getByRole("dialog", { name: "Turn map" }).locator('[data-slot="graph-canvas-host"]')

  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })
  await expect(host).toHaveAttribute("data-graph-renderer", "cytoscape")

  expect(errors).toEqual([])
})

story("renders the inline subgraph as static SVG within its node cap", async ({ mount }) => {
  const root = await mount("session-graph-turn-inline")
  const inline = root.locator('[data-slot="graph-turn-inline"]')

  await expect(inline.locator("svg")).toBeVisible()
  const labels = await inline.locator("svg text").count()

  expect(labels).toBeGreaterThanOrEqual(2)
  expect(labels).toBeLessThanOrEqual(5)
})
