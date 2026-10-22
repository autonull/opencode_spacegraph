import { expect, story } from "../../storybook/playwright/story"

story("names every encoding the canvas draws", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view")
  const toolbar = root.locator('[data-slot="graph-toolbar"]')

  await root.locator('[data-slot="graph-toolbar-show"] summary').click()
  await toolbar.getByRole("button", { name: "Show the legend" }).click()
  const legend = root.locator('[data-slot="graph-legend"]')
  await expect(legend).toBeVisible()

  // Every section of the encoding is named.
  await expect(legend).toContainText("Lanes")
  await expect(legend).toContainText("Card colors")
  await expect(legend).toContainText("Phases")
  await expect(legend).toContainText("Lines")
  await expect(legend).toContainText("Status")

  // The kinds the canvas draws are named with the inspector's words.
  await expect(legend).toContainText("Tool call")
  await expect(legend).toContainText("Subagent")
  await expect(legend).toContainText("Tool call")
  await expect(legend).toContainText("explicit")
  await expect(legend).toContainText("inferred")

  // The lanes are the layout's own rows.
  await expect(legend).toContainText("Explore")
  await expect(legend).toContainText("Artifacts")

  // Escape closes it and the focus is back on the graph.
  await page.keyboard.press("Escape")
  await expect(legend).toBeHidden()

  expect(errors).toEqual([])
})
