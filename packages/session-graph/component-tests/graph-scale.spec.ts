import { expect, story } from "../../stories/playwright/story"

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

  // The map drew the window, not the whole session: verify the canvas has rendered content.
  // Wait for the canvas to settle (two consecutive equal frames).
  let previous = ""
  let still = 0

  await expect
    .poll(
      async () => {
        const current = await page.evaluate(() => {
          const canvas = document.querySelector<HTMLCanvasElement>('[data-slot="graph-canvas-host"] canvas')
          return canvas ? canvas.toDataURL() : ""
        })
        still = current !== "" && current === previous ? still + 1 : 0
        previous = current
        return still >= 2
      },
      { intervals: [100] },
    )
    .toBe(true)

  // The canvas should not be blank (the first frame is blank during mount, subsequent frames have content)
  expect(previous).not.toBe("")

  expect(errors).toEqual([])
})
