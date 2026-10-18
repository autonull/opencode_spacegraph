import { expect, story } from "../../storybook/playwright/story"

type CytoscapeGlobal = {
  __sessionGraphCytoscape?: {
    setSelection: (ids: string[]) => void
    setProjection: (projection: string) => void
    fit: (ids?: string[]) => void
    dispose: () => void
  }
}

story("mounts the Cytoscape adapter behind the renderer contract", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-cytoscape")
  const host = root.locator('[data-component="session-graph-cytoscape"]')

  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })
  await expect(host).toHaveAttribute("data-graph-renderer", "cytoscape")
  await expect(host).toHaveAttribute("data-graph-nodes", "5")
  await expect(host).toHaveAttribute("data-graph-edges", "2")
  await expect(host.locator("canvas").first()).toBeVisible()

  // HTML activity cards render in the adopted DOM overlay, not on the canvas.
  const cards = host.locator('[data-slot="cytoscape-card"]')
  await expect(cards).toHaveCount(2)
  await expect(cards.first()).toContainText("session.ts")

  // 3D is declared unsupported, so setProjection is a no-op that must not throw; selection, fit, and resize stay live.
  await page.evaluate(() => (window as unknown as CytoscapeGlobal).__sessionGraphCytoscape!.setProjection("3d"))
  await page.evaluate(() => (window as unknown as CytoscapeGlobal).__sessionGraphCytoscape!.setSelection(["card-1", "dot-2"]))
  await page.evaluate(() => (window as unknown as CytoscapeGlobal).__sessionGraphCytoscape!.fit(["card-1", "dot-1"]))

  await host.evaluate((element) => {
    ;(element as HTMLElement).style.height = "320px"
  })

  await page.evaluate(() => (window as unknown as CytoscapeGlobal).__sessionGraphCytoscape!.dispose())
  await expect(cards).toHaveCount(0)
  await expect(host.locator("canvas")).toHaveCount(0)

  expect(errors).toEqual([])
})
