import { expect, story } from "../../stories/playwright/story"

// M6.1 — a static preview is not an interactive graph: it carries a name and mounts no second a11y
// mirror. The label is the localized surface name; there is no scope-summary description.
story("the static preview carries a name and no a11y mirror @a11y", async ({ mount }) => {
  const root = await mount("session-graph-inline-preview--default")
  const preview = root.locator('[data-slot="graph-turn-inline"]')

  await expect(preview).toHaveAttribute("role", "img")
  await expect(preview).toHaveAttribute("aria-label", "Execution subgraph")
  await expect(root.locator('[data-slot="graph-a11y"]')).toHaveCount(0)
  await expect(root.locator('[data-component="session-graph"]')).toHaveCount(0)
})
