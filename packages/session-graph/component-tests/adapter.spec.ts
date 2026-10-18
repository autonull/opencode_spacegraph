import { expect, story } from "../../storybook/playwright/story"

type AdapterGlobal = {
  __sessionGraphAdapter?: {
    setProjection: (projection: string) => void
    setSelection: (ids: string[]) => void
    dispose: () => void
  }
}

story("mounts the SpaceGraph adapter behind the renderer contract", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-adapter")
  const host = root.locator('[data-component="session-graph-adapter"]')

  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })
  await expect(host).toHaveAttribute("data-graph-nodes", "5")
  await expect(host).toHaveAttribute("data-graph-edges", "2")
  await expect(host.locator("canvas")).toBeVisible()
  expect(await host.locator("canvas").count()).toBe(1)

  // 2D orthographic -> 3D perspective -> 2D, plus selection, must not throw.
  await page.evaluate(() => (window as unknown as AdapterGlobal).__sessionGraphAdapter!.setProjection("3d"))
  await page.evaluate(() => (window as unknown as AdapterGlobal).__sessionGraphAdapter!.setSelection(["card-1", "dot-2"]))
  await page.evaluate(() => (window as unknown as AdapterGlobal).__sessionGraphAdapter!.setProjection("2d"))
  await expect(host.locator("canvas")).toBeVisible()

  await host.evaluate((element) => {
    ;(element as HTMLElement).style.height = "300px"
  })

  await page.evaluate(() => (window as unknown as AdapterGlobal).__sessionGraphAdapter!.dispose())
  await expect.poll(() => host.locator("canvas").count()).toBe(0)

  expect(errors).toEqual([])
})
