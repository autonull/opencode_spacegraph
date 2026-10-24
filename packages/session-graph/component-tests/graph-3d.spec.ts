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

  await root.locator('[data-slot="graph-toolbar-layers"] > summary').click()
  await root.locator('[data-slot="graph-layers-depth"]').selectOption("orbit")
  await expect(host).toHaveAttribute("data-graph-depth", "orbit")
  await expect(host).toHaveAttribute("data-graph-projection", "3d")
  // Detail is depth-independent: the same node, breadcrumbs, and inspector content remain.
  await expect(inspector).toContainText("Tool call")
  await expect(inspector).toContainText("src/auth/session.ts")
  await expect(root.locator('[data-slot="graph-breadcrumbs"]')).toContainText("Session")

  await root.locator('[data-slot="graph-layers-depth"]').selectOption("flat")
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
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  await expect(host).toHaveAttribute("data-graph-depth", "flat")
  await root.locator('[data-slot="graph-toolbar-layers"] > summary').click()
  await root.locator('[data-slot="graph-layers-depth"]').selectOption("layered")
  await expect(host).toHaveAttribute("data-graph-depth", "layered")
  await expect(host).toHaveAttribute("data-graph-projection", "3d")

  await root.locator('[data-slot="graph-layers-depth"]').selectOption("depth-stack")
  await expect(host).toHaveAttribute("data-graph-depth", "depth-stack")

  await root.locator('[data-slot="graph-layers-depth"]').selectOption("flat")
  await expect(host).toHaveAttribute("data-graph-depth", "flat")
  await expect(host).toHaveAttribute("data-graph-projection", "2d")
  await expect(root.locator('[data-slot="graph-inspector"]')).toContainText("Tool call")

  expect(errors).toEqual([])
})

// T1.19: a tilted camera must not tilt the cards — unless the reader asked for the honest
// perspective. The billboard is off by default, so a card lies in the content plane and the camera
// foreshortens it; the toolbar's switch turns the cards to face the reader, and then a card keeps
// its shape on screen.
story("shears the cards in a tilted depth treatment until the billboard is turned on", async ({ mount, page }) => {
  const root = await mount("session-graph-view--depth-stack")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })
  await expect(host).toHaveAttribute("data-graph-depth", "depth-stack")
  await expect(host).toHaveAttribute("data-graph-card-facing", "plane")

  const measure = () =>
    page.evaluate(() => {
      const element = document.querySelector<HTMLElement>('[data-node-id^="tool:"]')
      if (!element) return null
      const rect = element.getBoundingClientRect()

      return { ratio: rect.width / rect.height }
    })

  const sheared = await measure()
  expect(sheared).not.toBeNull()
  // The card is 220 × 72 world units. Lying in the content plane, the camera's tilt foreshortens
  // it, so it no longer keeps that ratio on screen.
  expect(sheared!.ratio).not.toBeCloseTo(220 / 72, 1)

  await root.locator('[data-slot="graph-toolbar-view"] > summary').click()
  await root.locator(toolbar).getByRole("button", { name: "Billboard cards" }).click()
  await expect(host).toHaveAttribute("data-graph-card-facing", "camera")

  const squared = await measure()
  expect(squared).not.toBeNull()
  // A card that faces the camera keeps the card's ratio on screen.
  expect(squared!.ratio).toBeCloseTo(220 / 72, 1)
})
