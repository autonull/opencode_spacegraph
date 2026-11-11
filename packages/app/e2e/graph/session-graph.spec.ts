import { expect, test as base, type Page } from "@playwright/test"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { trackPageErrors } from "../utils/errors"
import { seedSessionGraph } from "../utils/graph"
import { openSession } from "../utils/workspace"
import { graphCanvasHost, graphToolbar, waitForGraphContent } from "../utils/waits"

// The graph is a contributed session surface. This keeper proves the surface, the toolbar controls,
// the hybrid layout, the turn-map layer, and a node permalink against the canonical fixture.
const test = base.extend({
  page: async ({ page }, use) => {
    await seedSessionGraph(page)
    await use(page)
  },
})

const directory = "C:/OpenCode/SessionGraph"

const sessionID = "ses_session_graph"



function graphFixture() {
  return {
    name: "SessionGraph",
    directory,
    sessions: [{ id: sessionID, title: "Session graph" }],
    // The canonical session fixture is the single source for the graph model.
    pageMessages: () => ({ items: buildFixtureMessages() }),
  }
}

async function openGraph(page: Page) {
  await openSession(page, graphFixture())
  // A node permalink opens the map surface once the session screen mounts, without depending on
  // command-palette readiness.
  await page.evaluate(() => {
    window.location.hash = "#graph:file:src/auth/token.ts"
  })
  await expect(page.locator('[data-slot="spacegraph-surface-map"]')).toBeVisible()
  await waitForGraphContent(page)
}

async function openMenu(page: Page, slot: string) {
  const menu = graphToolbar(page).locator(`[data-slot="${slot}"]`)

  // SAFETY: every toolbar menu slot is a <details>; the read only inspects its open state.
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await menu.locator(":scope > summary").click()
  }
}

test("the graph surface cycles its reading controls, splits with the transcript, and keeps a node permalink", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page)

  await expect(graphCanvasHost(page)).toHaveAttribute("data-graph-renderer", "spacegraph")
  await expect(graphToolbar(page)).toBeVisible()

  // The level is a reading control on the Layers menu, not a layout side effect.
  await openMenu(page, "graph-toolbar-layers")
  await page.locator('[data-slot="graph-layers-level"]').getByRole("button", { name: "Execution", exact: true }).click()
  await expect(page.locator('[data-slot="graph-toolbar-layers"] summary')).toContainText("Execution")

  // The layout is a choice on the Layout menu, and the toolbar names the current one.
  await openMenu(page, "graph-toolbar-layout")
  await page.locator('[data-slot="graph-layout-option"][data-value="timeline"]').click()
  await expect(page.locator('[data-slot="graph-layout-name"]')).toHaveText("Timeline")

  // The map and the transcript share the screen, and the reader chooses how they meet.
  await graphToolbar(page).locator('[data-slot="graph-toolbar-split"]').click()
  const hybrid = page.locator('[data-slot="spacegraph-surface-hybrid"]')
  await expect(hybrid).toBeVisible()
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable()

  await openMenu(page, "graph-toolbar-view")
  await page.locator('[data-slot="graph-arrangement-option"][data-value="side"]').click()
  await expect(hybrid).toHaveAttribute("data-arrangement", "side")
  await waitForGraphContent(page)

  // The turn-map layer opens over the map and closes without disturbing it.
  await page.keyboard.press("Control+Shift+P")
  const palette = page.getByRole("dialog")
  await palette.getByRole("combobox").fill("Toggle turn map")
  await palette.getByRole("option", { name: /Toggle turn map/ }).click()
  const turnMap = page.locator('[data-slot="spacegraph-turn-map"]')
  await expect(turnMap).toBeVisible()
  await turnMap.getByRole("button", { name: "Close turn map" }).click()
  await expect(turnMap).toBeHidden()
  await expect(graphToolbar(page)).toBeVisible()

  // A shared link names a node and frames it after a cold load.
  const location = page.getByRole("navigation", { name: "Graph location" })
  await page.evaluate(() => {
    window.location.hash = "#graph:file:src/auth/token.ts"
  })
  await expect(location.getByRole("button", { name: "src/auth/token.ts" })).toBeVisible()
  await page.reload()
  await waitForGraphContent(page)
  await expect(location.getByRole("button", { name: "src/auth/token.ts" })).toBeVisible()

  expect(errors).toEqual([])
})
