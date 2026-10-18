import { expect, story } from "../../storybook/playwright/story"

type SpaceGraphGlobal = { SpaceGraph: { instances: Set<unknown> } }

story("mounts the SpaceGraphJS embed spike with eight nodes", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-spike")
  const host = root.locator('[data-component="session-graph-spike"]')
  const canvas = host.locator("canvas")

  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })
  await expect(host).toHaveAttribute("data-graph-nodes", "8")
  await expect(host).toHaveAttribute("data-graph-edges", "7")
  await expect(canvas).toBeVisible()
  await expect(host.locator("[data-node-id]")).toHaveCount(8)
  expect(await page.evaluate(() => (window as unknown as SpaceGraphGlobal).SpaceGraph.instances.size)).toBe(1)

  const heightBeforeResize = await canvas.evaluate((element: HTMLCanvasElement) => element.height)
  await host.evaluate((element) => {
    ;(element as HTMLElement).style.height = "300px"
  })
  await expect
    .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.height))
    .toBeLessThan(heightBeforeResize)

  const box = await host.boundingBox()
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 6 })
    await page.mouse.up()
  }
  await expect(canvas).toBeVisible()

  await page.screenshot({ path: "component-tests/test-results/spike-spacegraph.png" })

  expect(errors).toEqual([])
})
