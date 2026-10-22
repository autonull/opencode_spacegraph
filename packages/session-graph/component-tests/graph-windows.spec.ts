import { expect, story } from "../../storybook/playwright/story"

// T12: a window is a durable surface over the map. It opens beside the node's detail, it moves and
// resizes under the reader's hand, and the map does not move when it does.

story("a window opens over the map, moves, resizes, and leaves the map where it was", async ({
  mount,
  page,
}) => {
  const root = await mount("session-graph-view--detail-popover")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  const popover = root.locator('[data-slot="graph-popover"]')
  await expect(popover).toBeVisible()

  const camera = () =>
    page.evaluate(() => {
      const harness = (window as unknown as { __graphView?: { getViewport: () => { center: number[] } } })
        .__graphView
      return harness?.getViewport?.().center
    })

  const before = await camera()

  await popover.getByRole("button", { name: "Open in a window" }).click()

  const surface = root.locator('[data-slot="graph-window"]')
  await expect(surface).toBeVisible()
  await expect(surface).toContainText("read")

  // The title bar moves the window.
  const title = surface.locator('[data-slot="graph-window-title"]')
  const titleBox = (await title.boundingBox())!
  await page.mouse.move(titleBox.x + 40, titleBox.y + 8)
  await page.mouse.down()
  await page.mouse.move(titleBox.x + 140, titleBox.y + 68, { steps: 6 })
  await page.mouse.up()

  const moved = (await surface.boundingBox())!
  expect(moved.x).toBeGreaterThan(titleBox.x)

  // The corner resizes it.
  const handle = surface.locator('[data-slot="graph-window-resize"]')
  const handleBox = (await handle.boundingBox())!
  await page.mouse.move(handleBox.x + 2, handleBox.y + 2)
  await page.mouse.down()
  await page.mouse.move(handleBox.x + 62, handleBox.y + 42, { steps: 5 })
  await page.mouse.up()

  const resized = (await surface.boundingBox())!
  expect(resized.width).toBeGreaterThan(moved.width)

  // The map did not move: a window never re-frames the map.
  expect(await camera()).toEqual(before)
})

story("a window closes on Escape, and the map keeps its selection", async ({ mount, page }) => {
  const root = await mount("session-graph-view--detail-popover")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  const popover = root.locator('[data-slot="graph-popover"]')
  await popover.getByRole("button", { name: "Open in a window" }).click()

  const surface = root.locator('[data-slot="graph-window"]')
  await expect(surface).toBeVisible()

  await surface.focus()
  await page.keyboard.press("Escape")

  await expect(surface).toHaveCount(0)
  await expect(root.locator('[data-slot="graph-popover"]')).toBeVisible()
})

story("a pinned window rides its node across a pan", async ({ mount, page }) => {
  const root = await mount("session-graph-view--pinned-window")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  const surface = root.locator('[data-slot="graph-window"]')
  await expect(surface).toBeVisible()

  const before = (await surface.boundingBox())!

  // Pan the map under the left button: the background is the reader's hand.
  const canvas = root.locator('[data-slot="graph-canvas-host"]')
  const canvasBox = (await canvas.boundingBox())!
  await page.mouse.move(canvasBox.x + canvasBox.width - 40, canvasBox.y + canvasBox.height - 40)
  await page.mouse.down()
  await page.mouse.move(canvasBox.x + canvasBox.width - 160, canvasBox.y + canvasBox.height - 140, { steps: 8 })
  await page.mouse.up()

  await expect
    .poll(async () => (await surface.boundingBox())!.x)
    .not.toBeCloseTo(before.x, 0)
})
