import { expect, story } from "../../storybook/playwright/story"

const toolbar = '[data-slot="graph-toolbar"]'

// U3.15/LE.14: the depth spectrum changes the camera, not the graph. Identity, selection, and readable
// detail survive a round trip, and returning to flat leaves the surface usable with no console errors.
story("changes depth without changing node identity or inspector content", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  const inspector = root.locator('[data-slot="graph-inspector"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  await expect(host).toHaveAttribute("data-graph-depth", "flat")
  await expect(inspector).toContainText("Tool call")
  await expect(inspector).toContainText("src/auth/session.ts")

  await root.locator(toolbar).locator("button", { hasText: "Orbit" }).click()
  await expect(host).toHaveAttribute("data-graph-depth", "orbit")
  await expect(host).toHaveAttribute("data-graph-projection", "3d")
  // Detail is depth-independent: the same node, breadcrumbs, and inspector content remain.
  await expect(inspector).toContainText("Tool call")
  await expect(inspector).toContainText("src/auth/session.ts")
  await expect(root.locator('[data-slot="graph-breadcrumbs"]')).toContainText("Session")

  await root.locator(toolbar).locator("button", { hasText: "Flat" }).click()
  await expect(host).toHaveAttribute("data-graph-depth", "flat")
  await expect(host).toHaveAttribute("data-graph-projection", "2d")
  await expect(inspector).toContainText("Tool call")

  expect(errors).toEqual([])
})

// LE.14: depth is a spectrum, not a toggle. The chooser applies a treatment and keeps the coarse
// projection in step.
story("switches the depth treatment through the spectrum", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  const control = root.locator(toolbar)
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  await expect(host).toHaveAttribute("data-graph-depth", "flat")
  await control.locator("button", { hasText: "Layer" }).click()
  await expect(host).toHaveAttribute("data-graph-depth", "layered")
  await expect(host).toHaveAttribute("data-graph-projection", "3d")

  await control.locator("button", { hasText: "Stack" }).click()
  await expect(host).toHaveAttribute("data-graph-depth", "depth-stack")

  await control.locator("button", { hasText: "Flat" }).click()
  await expect(host).toHaveAttribute("data-graph-depth", "flat")
  await expect(host).toHaveAttribute("data-graph-projection", "2d")
  await expect(root.locator('[data-slot="graph-inspector"]')).toContainText("Tool call")

  expect(errors).toEqual([])
})
