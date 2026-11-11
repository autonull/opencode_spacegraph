import { expect, story } from "../../stories/playwright/story"

story("the status bar names the verbs that act on the held set", async ({ mount }) => {
  const root = await mount("session-graph-status-bar--verbs")
  const bar = root.locator('[data-slot="graph-status-bar"]')
  await expect(bar).toHaveAttribute("data-selection-count", "3")

  for (const slot of [
    "graph-status-frame",
    "graph-status-keep-only",
    "graph-status-copy-paths",
    "graph-status-export",
    "graph-status-add-note",
    "graph-status-compare",
    "graph-status-group-toggle",
    "graph-status-group-others",
  ])
    await expect(bar.locator(`[data-slot="${slot}"]`)).toBeVisible()

  // Toggles are state, not modes: the same button reports the next action.
  await bar.locator('[data-slot="graph-status-compare"]').click()
  await expect(bar.locator('[data-slot="graph-status-compare"]')).toHaveAttribute("data-active", "true")
  await bar.locator('[data-slot="graph-status-group-toggle"]').click()
  await expect(bar.locator('[data-slot="graph-status-group-toggle"]')).toHaveAttribute(
    "data-collapsed",
    "true",
  )

  await bar.locator('[data-component="icon-button-v2"][aria-label="Clear"]').click()
  await expect(bar).toBeHidden()
})

story("the note composer saves text and refuses an empty note", async ({ mount }) => {
  const root = await mount("session-graph-note-composer--compose")
  const composer = root.locator('[data-slot="graph-note-composer"]')
  const input = composer.locator('[data-slot="graph-note-input"]')
  const save = composer.locator('[data-slot="graph-note-save"]')

  await expect(composer).toBeVisible()
  await expect(save).toBeDisabled()

  await input.fill("Investigate the refresh path")
  await expect(save).toBeEnabled()
  await save.click()

  await expect(root.locator('[data-slot="note-result"]')).toHaveText("Investigate the refresh path")
})

story("the comparison window names what changed and stays empty when nothing did", async ({ mount }) => {
  const root = await mount("session-graph-compare--changes")
  const compare = root.locator('[data-slot="graph-compare-window"]')

  await expect(compare.locator('[data-slot="graph-compare-section"][data-diff="added"]')).toContainText("2")
  await expect(compare.locator('[data-slot="graph-compare-section"][data-diff="removed"]')).toContainText(
    "src/auth/session.ts",
  )
  await expect(compare.locator('[data-slot="graph-compare-section"][data-diff="changed"]')).toContainText(
    "src/auth/guards.ts",
  )
})

story("the comparison window says when nothing changed", async ({ mount }) => {
  const root = await mount("session-graph-compare--empty")
  await expect(root.locator('[data-slot="graph-compare-window"]')).toContainText("No comparison")
})

story("an edge peek names its kind, confidence, and label", async ({ mount }) => {
  const root = await mount("session-graph-peek--edge")
  const peek = root.locator('[data-slot="graph-peek"]')

  await expect(peek).toHaveAttribute("data-kind", "edge")
  await expect(peek).toContainText("Writes")
  await expect(peek).toContainText("Explicit")
  await expect(peek).toContainText("src/auth/token.ts")
})

story("a node peek names the node", async ({ mount }) => {
  const root = await mount("session-graph-peek--node")
  const peek = root.locator('[data-slot="graph-peek"]')

  await expect(peek).toHaveAttribute("data-kind", "file")
  await expect(peek).toContainText("File")
  await expect(peek).toContainText("src/auth/token.ts")
})

story("pinning a node marks its card in the same surface", async ({ mount }) => {
  const root = await mount("session-graph-view--pin-toggle")
  const pin = root.locator('[data-slot="graph-status-pin"]')

  await expect(pin).toHaveAttribute("aria-pressed", "false")
  await pin.click()
  await expect(pin).toHaveAttribute("aria-pressed", "true")
  await expect(root.locator('[data-slot="graph-canvas-host"] [data-slot="card-pin"]')).toHaveCount(1)
})
