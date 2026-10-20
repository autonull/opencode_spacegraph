import { expect, story } from "../../storybook/playwright/story"

// T6.5 — the graph names the other sessions a node points at, and the reader can open them.

story("a delegated child session can be opened from the inspector", async ({ mount }) => {
  const root = await mount("session-graph-view--child-session")
  const inspector = root.locator('[data-slot="graph-inspector"]')

  await expect(inspector).toContainText("Child session")
  await expect(inspector).toContainText("ses_child_auth")

  await inspector.getByRole("button", { name: "Open child session" }).click()
  await expect(root.locator("[data-opened-session]")).toHaveAttribute("data-opened-session", "ses_child_auth")
})

story("a forked session names where it came from and can open it", async ({ mount }) => {
  const root = await mount("session-graph-view--forked-session")
  const inspector = root.locator('[data-slot="graph-inspector"]')

  await expect(inspector).toContainText("Forked from")
  await expect(inspector).toContainText("ses_origin")
  await expect(inspector).toContainText("Forked through")
  await expect(inspector).toContainText("msg_user_1")

  await inspector.getByRole("button", { name: "Open the session this was forked from" }).click()
  await expect(root.locator("[data-opened-session]")).toHaveAttribute("data-opened-session", "ses_origin")
})

story("a compaction says whether it replayed a window or left a summary", async ({ mount }) => {
  const root = await mount("session-graph-view--compacted")
  const inspector = root.locator('[data-slot="graph-inspector"]')

  await expect(inspector).toContainText("Replayed from the provider's replacement window")
})
