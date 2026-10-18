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
  // RF.7: a wide row keeps the secondary controls inline, with no overflow menu.
  await expect(root.locator('[data-slot="graph-toolbar-overflow"]')).toHaveCount(0)

  // Execution expands phase clusters into swimlane bands, not counted DOM cards.
  await expect(host.locator('.html-node-container:has([data-kind="phase"])')).toHaveCount(0)

  // The selected tool node renders as readable DOM detail, with its place in the session above it.
  await expect(inspector).toContainText("Tool call")
  await expect(inspector).toContainText("read")
  await expect(inspector).toContainText("src/auth/session.ts")
  await expect(root.locator('[data-slot="graph-breadcrumbs"]')).toContainText("Session")

  // Detail is read back from the model, not the canvas: a shell result shows its full terminal output.
  await page.evaluate(() => (window as unknown as ViewWindow).__graphView!.select("result:prt_tool_shell_3"))
  const output = inspector.locator('[data-slot="graph-inspector-output"]')
  await expect(output).toBeVisible()
  await expect(output).toContainText("3 pass 0 fail")

  // A turn's diff node loads its changed files on demand and renders the patch as selectable DOM text.
  await page.evaluate(() => (window as unknown as ViewWindow).__graphView!.select("diff:msg_idle_1"))
  const diff = inspector.locator('[data-slot="graph-inspector-diff"]')
  await expect(diff).toBeVisible()
  await expect(diff).toContainText("src/auth/session.ts")
  await expect(diff).toContainText("src/auth/token.ts")

  // An assistant message renders its summary through the host renderer (Markdown in the app, RF.8).
  await page.evaluate(() => (window as unknown as ViewWindow).__graphView!.select("msg_plan_1:text:0"))
  await expect(inspector.locator('[data-slot="test-summary"]')).toContainText("inspect the failing authentication tests")

  // Level is a component prop: changing it must reach the toolbar's derived disabled state.
  const zoomOut = root.locator('button[aria-label="Zoom out"]')
  await expect(zoomOut).toBeEnabled()
  await root.locator('[data-slot="graph-toolbar"] button', { hasText: "Overview" }).click()
  await expect(zoomOut).toBeDisabled()

  // The level change is a representation change: the cluster must be re-created as a counted DOM card,
  // not left as the execution panel whose node type no longer matches (the adapter remodels on type).
  const exploreChip = host.locator('.html-node-container:has([data-kind="phase"])', { hasText: "Explore" })
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
