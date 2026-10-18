import { expect, story } from "../../storybook/playwright/story"

type ViewWindow = {
  __graphView?: {
    select: (id: string | undefined) => void
    setRenderer: (id: "spacegraph" | "cytoscape") => void
    selected: () => string | undefined
  }
}

const TOKEN_ID = "file:src/auth/token.ts"

story("assembles the graph view and answers node questions without the canvas", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  const inspector = root.locator('[data-slot="graph-inspector"]')

  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })
  await expect(host).toHaveAttribute("data-graph-renderer", "spacegraph")
  await expect(root.locator('[data-slot="graph-toolbar"]')).toBeVisible()

  // Execution (the default) renders phase clusters as expanded panels, not DOM cards.
  await expect(host.locator(".html-node-container", { hasText: "Explore" })).toHaveCount(0)

  // The selected tool node renders as readable DOM detail, with its place in the session above it.
  await expect(inspector).toContainText("Tool call")
  await expect(inspector).toContainText("read")
  await expect(inspector).toContainText("src/auth/session.ts")
  await expect(root.locator('[data-slot="graph-breadcrumbs"]')).toContainText("Session")

  // Level is a component prop: changing it must reach the toolbar's derived disabled state.
  const zoomOut = root.locator('button[aria-label="Zoom out"]')
  await expect(zoomOut).toBeEnabled()
  await root.locator('[data-slot="graph-toolbar"] button', { hasText: "Overview" }).click()
  await expect(zoomOut).toBeDisabled()

  // The level change is a representation change: the cluster must be re-created as a counted DOM card,
  // not left as the execution panel whose node type no longer matches (the adapter remodels on type).
  const exploreChip = host.locator(".html-node-container", { hasText: "Explore" })
  await expect(exploreChip).toHaveCount(1)
  await expect(exploreChip).toContainText("Explore 5")

  // Search reuses the model selector and jumps to a result.
  await root.locator('button[aria-label="Search the graph"]').click()
  const search = root.locator('[data-slot="graph-search"]')
  await expect(search).toBeVisible()
  await search.locator("input").fill("token")
  await expect(search).toContainText(/result/)
  await search.locator("button").filter({ hasText: "src/auth/token.ts" }).first().click()
  await expect(search).toBeHidden()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as ViewWindow).__graphView!.selected()))
    .toBe(TOKEN_ID)

  // 3D is available on SpaceGraphJS and projects through the contract.
  await root.locator('[data-slot="graph-toolbar"] button', { hasText: "3D" }).click()
  await expect(host).toHaveAttribute("data-graph-projection", "3d")

  // Switching backend rebuilds once on the same model; 3D becomes unavailable, not broken.
  await page.evaluate(() => (window as unknown as ViewWindow).__graphView!.setRenderer("cytoscape"))
  await expect(host).toHaveAttribute("data-graph-renderer", "cytoscape", { timeout: 30_000 })
  await expect(host).toHaveAttribute("data-graph-projection", "2d")
  await expect(root.locator('[data-slot="graph-toolbar"] button', { hasText: "3D" })).toBeDisabled()

  expect(errors).toEqual([])
})
