import { expect, story } from "../../storybook/playwright/story"

// U3.15: the 2D/3D toggle changes the camera, not the graph. Identity, selection, and readable detail
// survive a round trip, and returning to 2D leaves the surface usable with no console errors.
story("toggles 3D without changing node identity or inspector content", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  const inspector = root.locator('[data-slot="graph-inspector"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  await expect(host).toHaveAttribute("data-graph-projection", "2d")
  await expect(inspector).toContainText("Tool call")
  await expect(inspector).toContainText("src/auth/session.ts")

  await root.locator('[data-slot="graph-toolbar"] button', { hasText: "3D" }).click()
  await expect(host).toHaveAttribute("data-graph-projection", "3d")
  // Detail is projection-independent: the same node, breadcrumbs, and inspector content remain.
  await expect(inspector).toContainText("Tool call")
  await expect(inspector).toContainText("src/auth/session.ts")
  await expect(root.locator('[data-slot="graph-breadcrumbs"]')).toContainText("Session")

  await root.locator('[data-slot="graph-toolbar"] button', { hasText: "2D" }).click()
  await expect(host).toHaveAttribute("data-graph-projection", "2d")
  await expect(inspector).toContainText("Tool call")

  expect(errors).toEqual([])
})
