import { expect, story } from "../../storybook/playwright/story"

story("renders the session-graph scaffold story", async ({ mount }) => {
  const root = await mount("session-graph-scaffold")

  await expect(root.getByText("@opencode/session-graph", { exact: true })).toBeVisible()
})
