import { expect, story } from "../../stories/playwright/story"

// M6.1 — a static preview is not an interactive graph, but it must still say what it shows and must
// not mount a second a11y mirror.
story("the static preview carries a name and a scope summary @a11y", async ({ mount }) => {
  const root = await mount("session-graph-inline-preview--default")
  const preview = root.locator('[data-slot="graph-turn-inline"]')

  await expect(preview).toHaveAttribute("role", "img")
  await expect(preview).toHaveAttribute("aria-label", "Inline graph")
  await expect(preview).toHaveAttribute("aria-description", /\d+ nodes?, \d+ edges?/)
  await expect(root.locator('[data-slot="graph-a11y"]')).toHaveCount(0)
  await expect(root.locator('[data-component="session-graph"]')).toHaveCount(0)
})
