import { expect, story } from "../../storybook/playwright/story"

// T14: the toolbar is organised by axis. Four things are inline — what is shown, where the camera
// is — and everything else is one click away.

story("the toolbar keeps its row on one line at the widths the app uses", async ({ mount, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  const root = await mount("session-graph-view--fullscreen")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  const toolbar = root.locator('[data-slot="graph-toolbar"]')

  const measure = async () => {
    const box = (await toolbar.boundingBox())!
    const items = await toolbar.evaluate((element) => {
      const children = Array.from(element.children) as HTMLElement[]
      return {
        items: children.length,
        content: children.reduce((total, child) => total + child.getBoundingClientRect().width, 0),
      }
    })
    return { width: box.width, height: box.height, ...items }
  }

  const wide = await measure()
  await page.setViewportSize({ width: 1100, height: 700 })
  const mid = await measure()

  // One row: the controls share a line, so the toolbar is as tall as one row of controls. A wrapped
  // row would push the back control onto a second line, under the app's floating header.
  expect(wide.height).toBeLessThan(56)
  expect(mid.height).toBeLessThan(56)
})

story("the toolbar keeps four things inline and the rest behind two menus", async ({ mount, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  const root = await mount("session-graph-view")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  const toolbar = root.locator('[data-slot="graph-toolbar"]')

  // What is shown: the representation and the level.
  await expect(toolbar.getByRole("group", { name: "Representation" })).toBeVisible()
  await expect(toolbar.getByRole("group", { name: "Zoom level" })).toBeVisible()
  // Where the camera is: the zoom and the fit.
  await expect(toolbar.getByRole("button", { name: "Zoom in" })).toBeVisible()
  await expect(toolbar.getByRole("button", { name: "Fit to view" })).toBeVisible()
  // How it is drawn and what it says: one click away.
  await expect(toolbar.locator('[data-slot="graph-toolbar-draw"]')).toBeVisible()
  await expect(toolbar.locator('[data-slot="graph-toolbar-show"]')).toBeVisible()
  // The commands sit at the end of the row.
  await expect(toolbar.getByRole("button", { name: "Search the graph" })).toBeVisible()
})
