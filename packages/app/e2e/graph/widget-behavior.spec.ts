import { expect, test as base, type Page } from "@playwright/test"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { trackPageErrors } from "../utils/errors"
import { seedSessionGraph } from "../utils/graph"
import { openSession } from "../utils/workspace"

// P3.6 behavior on the flagship map surface: the persisted `widgets` preference decides whether host
// widgets render, and each node kind resolves only its own widget. This is a functional contract —
// not a pixel comparison, which would go stale on every visual redesign (SPACEGRAPH.md §1.2/§10).
const test = base.extend({
  page: async ({ page }, use) => {
    await seedSessionGraph(page)
    await use(page)
  },
})

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "en-US" })

async function openGraph(page: Page, widgets: boolean) {
  await page.addInitScript((enabled) => {
    localStorage.setItem("opencode.global.dat:plugin.spacegraph.prefs", JSON.stringify({ widgets: { enabled } }))
  }, widgets)
  await openSession(page, {
    name: "SessionGraph",
    directory: "C:/OpenCode/SessionGraph",
    sessions: [{ id: "ses_session_graph", title: "Session graph" }],
    pageMessages: () => ({ items: buildFixtureMessages() }),
    configEntries: [{ type: "document", info: { experimental: { all_flags: true } } }],
  })
  await page.getByRole("button", { name: "Toggle graph view" }).click()
  await expect(page.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true")
}

test("prefs.widgets renders host widgets on the map surface", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, true)

  const labels = page.locator('[data-slot="session-node-widget-wrapper"]')
  await expect(labels.first()).toBeVisible()

  const kinds = await labels.evaluateAll((nodes) =>
    [...new Set(nodes.map((node) => node.getAttribute("aria-label") ?? ""))].sort(),
  )

  expect(kinds).toContain("Diff widget")
  expect(kinds).toContain("Subagent widget")
  expect(errors).toEqual([])
})

test("prefs.widgets off hides host widgets on the map surface", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, false)

  await expect(page.locator('[data-slot="session-node-widget-wrapper"]')).toHaveCount(0)
  expect(errors).toEqual([])
})
