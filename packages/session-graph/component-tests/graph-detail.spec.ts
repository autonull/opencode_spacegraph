import { expect, story } from "../../storybook/playwright/story"

// The detail surface is a choice, not a stage: a reader picks where a selected node's detail
// appears, and the map must stay the map in every case. The popover and the card are the two new
// surfaces; the panel is the one the graph has always had.

const TOOL_ID = "tool:prt_tool_read_1"
const OTHER_TOOL_ID = "tool:prt_tool_read_2"

story("the popover shows the detail beside the node and takes no layout width", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view--detail-popover")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  // The detail floats over the canvas, inside the region the map draws in.
  const region = root.locator('[data-slot="graph-canvas-region"]')
  const popover = root.locator('[data-slot="graph-popover"]')
  await expect(popover).toBeVisible()
  await expect(popover).toContainText("read")

  // No side panel: the map keeps the whole width it had.
  await expect(root.locator('[data-slot="graph-inspector-gutter"]')).toHaveCount(0)
  await expect(root.locator('[data-slot="graph-inspector"]')).toHaveCount(0)

  // The popover stays inside the region it floats over.
  const regionBox = await region.boundingBox()
  const popoverBox = await popover.boundingBox()
  expect(regionBox).not.toBeNull()
  expect(popoverBox).not.toBeNull()
  expect(popoverBox!.x).toBeGreaterThanOrEqual(regionBox!.x)
  expect(popoverBox!.x + popoverBox!.width).toBeLessThanOrEqual(regionBox!.x + regionBox!.width + 1)

  expect(errors).toEqual([])
})

story("the card mode puts the detail on the node itself", async ({ mount, page }) => {
  const root = await mount("session-graph-view--detail-card")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  // The selected node's own card carries the detail; nothing else opens.
  const card = root.locator(`[data-node-id="${TOOL_ID}"] [data-tier="near"]`)
  await expect(card).toBeVisible()

  // The card says what its kind has that its label does not: the path the tool read.
  await expect(card).toContainText("src/auth/session.ts")

  // A selected card says so.
  await expect(root.locator(`[data-node-id="${TOOL_ID}"] [data-selected="true"]`)).toBeVisible()

  await expect(root.locator('[data-slot="graph-popover"]')).toHaveCount(0)
  await expect(root.locator('[data-slot="graph-inspector-gutter"]')).toHaveCount(0)
})

story("the detail can be turned off, leaving the map alone", async ({ mount, page }) => {
  const root = await mount("session-graph-view--detail-off")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  await expect(root.locator('[data-slot="graph-popover"]')).toHaveCount(0)
  await expect(root.locator('[data-slot="graph-inspector-gutter"]')).toHaveCount(0)
})

story("the peek answers what a node is without selecting it", async ({ mount, page }) => {
  const root = await mount("session-graph-view--peek")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  const peek = root.locator('[data-slot="graph-peek"]')
  await expect(peek).toHaveCount(0)

  await root.locator(`[data-node-id="${OTHER_TOOL_ID}"]`).hover()

  await expect(peek).toBeVisible()
  await expect(peek).toContainText("read")
})
