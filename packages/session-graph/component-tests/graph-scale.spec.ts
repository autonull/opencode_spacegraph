import { expect, story } from "../../storybook/playwright/story"

// T6.6: a long session is drawn as its recent tail, and the view says how much of the session it
// left out. A capped view must never be a silent one, and it must still be a readable map.
story("a long session is drawn as a capped window and says so", async ({ mount, page }) => {
  const errors: string[] = []

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view--scale")
  const host = root.locator('[data-slot="graph-canvas-host"]')

  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  const notice = root.locator('[data-slot="graph-scale-notice"]')

  await expect(notice).toBeVisible()
  await expect(notice).toContainText("60")
  await expect(notice).toContainText("80")

  // The map drew the window, not the whole session: the turns before the window are not on the canvas.
  const turns = host.locator('.html-node-container:has([data-kind="turn"])')

  expect(await turns.count()).toBeGreaterThan(0)
  expect(await turns.count()).toBeLessThanOrEqual(60)

  // The camera framed the window, so the window's turns are on the canvas and the lane gutter came
  // with them: a map that opened on empty space would be useless.
  await expect(host.locator('.html-node-container:has([data-kind="turn"])').first()).toBeVisible()
  await expect(host.locator('[data-lane="prompt"]')).toBeVisible()

  expect(errors).toEqual([])
})
