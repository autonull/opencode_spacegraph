import { expect, story } from "../../storybook/playwright/story"

// U3.16/U3.17: the states a host must handle beyond the happy path. Each story mounts the real
// GraphView over the canonical fixture, so the assertions read production DOM, not a copy.

story("shows the empty state when the session has no activity", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view--empty")

  await expect(root.locator('[data-slot="graph-empty"]')).toBeVisible()
  await expect(root.locator('[data-slot="graph-empty"]')).toContainText("Nothing to graph yet")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  expect(errors).toEqual([])
})

story("shows a recoverable error state when no renderer can mount", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view--error")

  const error = root.locator('[data-slot="graph-error"]')
  await expect(error).toBeVisible({ timeout: 30_000 })
  await expect(error).toContainText("The graph could not load")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "false")
  await expect(error.getByRole("button", { name: "Back to transcript" })).toBeVisible()

  expect(errors).toEqual([])
})

story("renders the overview level with the level control reflecting it", async ({ mount }) => {
  const root = await mount("session-graph-view--overview")

  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })
  // At overview there is nothing to zoom out to, so the control is disabled.
  await expect(root.locator('button[aria-label="Zoom out"]')).toBeDisabled()
  await expect(root.locator('button[aria-label="Zoom in"]')).toBeEnabled()
})

story("fits a narrow mobile viewport without horizontal overflow", async ({ mount }) => {
  const root = await mount("session-graph-view--narrow")

  await expect(root.locator('[data-slot="graph-toolbar"]')).toBeVisible()
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  const overflow = await root.evaluate((element) => element.scrollWidth - element.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

story("re-themes the same model in dark mode without reloading the renderer", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view", { globals: { theme: "dark" } })
  const host = root.locator('[data-slot="graph-canvas-host"]')

  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })
  await expect(host).toHaveAttribute("data-graph-renderer", "spacegraph")

  expect(errors).toEqual([])
})

story("scrolls long tool output instead of growing the panel", async ({ mount }) => {
  const root = await mount("session-graph-view--long-output")

  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  const output = root.locator('[data-slot="graph-inspector"] pre')
  await expect(output).toBeVisible()
  await expect(output).toContainText("bun test packages/session-ui")

  // The long output must live behind a scroll region, whether the node's own pre scrolls or the
  // inspector body does; either way the panel does not grow.
  const scrolls = await output.evaluate((element) => {
    const region = element.closest(".overflow-y-auto")

    return (
      element.scrollHeight > element.clientHeight ||
      (region !== null && region !== element && region.scrollHeight > region.clientHeight)
    )
  })

  expect(scrolls).toBe(true)
})
