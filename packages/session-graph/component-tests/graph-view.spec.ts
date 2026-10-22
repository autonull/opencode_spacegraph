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

  // LE.2: phase clusters are legible DOM panels at every level. Execution shows the expanded header
  // (label only); the collapsed overview chip carries the member count instead.
  const phases = host.locator('.html-node-container:has([data-kind="phase"])')
  await expect(phases.filter({ hasText: "Explore" }).first()).toBeVisible()
  await expect(phases.filter({ hasText: "Explore" }).first()).not.toContainText(/Explore\s+\d/)

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

  // T6.20: the zoom control stops at the renderer's own limit. The SpaceGraph's zoom is normalized
  // over the fitted band and cannot pass 1, so the control disables itself there instead of
  // accepting clicks that do nothing.
  const zoomIn = root.locator('button[aria-label="Zoom in"]')
  const readout = root.locator('[data-slot="graph-zoom-level"]')
  for (let step = 0; step < 30; step += 1) {
    if (await zoomIn.isDisabled()) break
    const before = await readout.textContent()
    await zoomIn.click()
    await expect.poll(() => readout.textContent()).not.toBe(before)
  }
  await expect(zoomIn).toBeDisabled()

  // The collapsed overview cluster is a counted DOM card ("Explore 5"), unlike the expanded header.
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

  // 3D (the orbit depth) is available on SpaceGraphJS and projects through the contract.
  await root.locator('[data-slot="graph-toolbar-draw"] summary').click()
  await root.locator('[data-slot="graph-toolbar"] button', { hasText: "Orbit" }).click()
  await expect(host).toHaveAttribute("data-graph-projection", "3d")

  // Switching backend rebuilds once on the same model; the perspective depths become unavailable, not broken.
  await page.evaluate(() => (window as unknown as ViewWindow).__graphView!.setRenderer("cytoscape"))
  await expect(host).toHaveAttribute("data-graph-renderer", "cytoscape", { timeout: 30_000 })
  await expect(host).toHaveAttribute("data-graph-projection", "2d")
  await expect(root.locator('[data-slot="graph-toolbar"] button', { hasText: "Orbit" })).toBeDisabled()

  expect(errors).toEqual([])
})
