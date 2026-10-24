import { expect, story } from "../../storybook/playwright/story"

// T7.5 — the layout gallery: the same model in every layout, side by side, so the reader compares
// the options instead of committing to one.

story("shows every layout of the same model side by side", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view")
  const toolbar = root.locator('[data-slot="graph-toolbar"]')

  await root.locator('[data-slot="graph-toolbar-view"] > summary').click()
  await toolbar.getByRole("button", { name: "Compare the layouts" }).click()
  const gallery = root.locator('[data-slot="graph-gallery"]')
  await expect(gallery).toBeVisible()

  // One picture per layout, and every picture is a drawing.
  const items = gallery.locator('[data-slot="graph-gallery-item"]')
  await expect(items).toHaveCount(5)
  await expect(items.locator("svg")).toHaveCount(5)

  for (const name of ["Lanes", "Timeline", "Hierarchy", "Tree", "Force"])
    await expect(gallery).toContainText(name)

  // Picking one opens it in the full surface.
  await gallery.locator('[data-strategy="tree"]').click()
  await expect(gallery).toHaveCount(0)
  await expect(toolbar.locator('[data-slot="graph-layout-name"]')).toHaveText("Tree")

  expect(errors).toEqual([])
})
