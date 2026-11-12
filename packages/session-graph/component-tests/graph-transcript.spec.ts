import { expect, story } from "../../stories/playwright/story"

const surface = '[data-slot="graph-transcript-surface"]'

// M4 — the transcript mounts only the rows near its viewport, and a failed turn can open its inline
// map. Both are behavior contracts, not duplicated rendering.
story("the graph transcript mounts only the visible rows", async ({ mount }) => {
  const root = await mount("session-graph-graph-transcript--long")
  const transcript = root.locator(surface)

  await expect(transcript).toBeVisible()
  await expect.poll(() => transcript.locator("[data-turn-id]").count()).toBeGreaterThan(0)

  expect(await transcript.locator("[data-turn-id]").count()).toBeLessThan(20)
})

story("a failed turn expands its inline map", async ({ mount }) => {
  const root = await mount("session-graph-graph-transcript--default")
  const transcript = root.locator(surface)

  await expect(transcript).toBeVisible()

  const toggle = transcript.locator(".graph-affordance-toggle")
  await expect(toggle).toHaveCount(1)
  await expect(toggle).toBeVisible()
  await toggle.click()

  await expect(transcript.locator('.graph-inline-container [data-slot="graph-canvas-host"]')).toBeVisible({
    timeout: 30_000,
  })
})
