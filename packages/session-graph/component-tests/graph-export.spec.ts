import { expect, story } from "../../stories/playwright/story"
import { readFileSync } from "node:fs"

// Phase 4.3: Export & sharing surface — smoke test that exported SVG contains tool: nodes at execution level

story("export at execution level produces SVG with tool: nodes", async ({ mount, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  const root = await mount("session-graph-view--fullscreen")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  const toolbar = root.locator('[data-slot="graph-toolbar"]')

  // Open View menu to access Export
  const viewMenu = toolbar.locator('[data-slot="graph-toolbar-view"]')
  await viewMenu.locator(":scope > summary").click()

  // Find and click the Export menu
  const exportMenu = toolbar.locator('[data-slot="graph-toolbar-export"]')
  await expect(exportMenu).toBeVisible()
  await exportMenu.locator(":scope > summary").click()

  // Click "Export SVG" and capture the download
  const downloadPromise = page.waitForEvent("download")
  await toolbar.locator('[data-slot="graph-export-option"][data-value="svg"]').click()
  const download = await downloadPromise

  // Verify the download has expected filename pattern
  expect(download.suggestedFilename()).toMatch(/^session-map-.*\.svg$/)

  // Read the downloaded SVG content
  const svgPath = await download.path()
  expect(svgPath).toBeTruthy()
  const svgContent = readFileSync(svgPath!, "utf-8")

  // Verify SVG contains tool nodes (execution level content)
  // The SVG renders tool nodes with their labels in <title> elements
  // Check for at least one tool node label (e.g., "shell", "read", "edit", "write", "grep", "patch", "ok", "failed")
  const toolLabels = ["shell", "read", "edit", "write", "grep", "patch", "ok", "failed"]
  const hasToolNode = toolLabels.some((label) => svgContent.includes(`<title>${label}</title>`))
  expect(hasToolNode).toBe(true)
})