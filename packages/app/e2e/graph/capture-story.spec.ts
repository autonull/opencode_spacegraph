import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test as base, type Page } from "@playwright/test"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { trackPageErrors } from "../utils/errors"
import { seedSessionGraph } from "../utils/graph"
import { openSession } from "../utils/workspace"
import { waitForGraphContent } from "../utils/waits"

const KNOWN_FLAKY_ERRORS = ["Maximum call stack size exceeded"]

const test = base.extend({
  page: async ({ page }, use) => {
    await seedSessionGraph(page)
    await use(page)
  },
})

test.skip(!process.env.GRAPH_CAPTURE_DEMO, "Story recording; set GRAPH_CAPTURE_DEMO=1")

const directory = "C:/OpenCode/SessionGraph"
const sessionID = "ses_session_graph"
const toolbar = '[data-slot="graph-toolbar"]'
const inspector = '[data-slot="graph-inspector"]'

const captureDir = process.env.GRAPH_CAPTURE_DIR

function filterKnownErrors(errs: string[]): string[] {
  return errs.filter((e) => !KNOWN_FLAKY_ERRORS.some((k) => e.includes(k)))
}

function graphFixture() {
  return {
    name: "SessionGraph",
    directory,
    sessions: [{ id: sessionID, title: "Session graph" }],
    pageMessages: () => ({ items: buildFixtureMessages() }),
  }
}

async function openGraph(page: Page) {
  await openSession(page, graphFixture())
  await page.evaluate(() => {
    window.location.hash = "#graph:file:src/auth/token.ts"
  })
  await expect(page.locator('[data-slot="spacegraph-surface-map"]')).toBeVisible()
  await waitForGraphContent(page)
}

async function openMenu(page: Page, slot: string) {
  const menu = page.locator(`${toolbar} [data-slot="${slot}"]`)
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!open) await menu.locator(":scope > summary").click()
}

async function closeMenu(page: Page, slot: string) {
  const menu = page.locator(`${toolbar} [data-slot="${slot}"]`)
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
  if (open) await menu.locator(":scope > summary").click()
}

async function pickLayout(page: Page, layout: string) {
  await openMenu(page, "graph-toolbar-layout")
  await page.locator(`${toolbar} [data-slot="graph-layout-option"][data-value="${layout}"]`).click()
  await closeMenu(page, "graph-toolbar-layout")
}

async function fit(page: Page) {
  const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
  const compact = (await overflow.count()) > 0
  if (compact) await overflow.getByLabel("More controls").click()
  await page.locator(toolbar).getByRole("button", { name: "Fit", exact: true }).click()
  if (compact) await overflow.getByLabel("More controls").click()
}

async function focusNode(page: Page, nodeId: string, query: string) {
  // Focus canvas and open search with "/" shortcut
  await page.locator('[data-slot="graph-canvas-region"]').focus()
  await page.keyboard.press("/")
  const search = page.getByRole("dialog", { name: "Search" })
  const input = search.getByRole("combobox")
  await input.fill(query)
  // Wait for search results to populate
  await expect(search.locator(`[data-node-id="${nodeId}"]`)).toBeVisible({ timeout: 10000 })
  // Select with Enter key
  await input.press("Enter")
  // Wait for selection to propagate to inspector
  await page.waitForTimeout(500)
  await still(page)
}

async function still(page: Page) {
  await waitForGraphContent(page)
  await page.waitForTimeout(1000)
}

async function capture(page: Page, name: string) {
  if (!captureDir) return
  await page.evaluate(() => {
    document.querySelectorAll<HTMLDetailsElement>("details[data-slot^='graph-toolbar-']").forEach((menu) => {
      menu.open = false
    })
    window.scrollTo(0, 0)
  })
  mkdirSync(captureDir, { recursive: true })
  await page.screenshot({ path: resolve(captureDir, name), fullPage: false })
}

async function openSearch(page: Page) {
  // Focus canvas and use keyboard shortcut "/" to open search
  await page.locator('[data-slot="graph-canvas-region"]').focus()
  await page.keyboard.press("/")
  const search = page.getByRole("dialog")
  await expect(search).toBeVisible()
  return search
}

async function closeSearch(page: Page, search: ReturnType<typeof page.getByRole>) {
  await page.keyboard.press("Escape")
  await expect(search).toBeHidden()
}


/**
 * STORY: Debugging a failing authentication test
 *
 * A developer opens a session where the agent tried to fix a failing auth test.
 * The transcript is overwhelming. They use SpaceGraph to understand what happened,
 * find the root cause, and share the finding with their team.
 */

test.describe.configure({ retries: 0, mode: "serial" })

test("Story: Debugging a failing auth test", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })

  // ═══════════════════════════════════════════════════════════════════
  // ACT 1: THE PROBLEM — Open graph, immediately see attention badge
  // ═══════════════════════════════════════════════════════════════════

  await openGraph(page)
  await fit(page)
  await still(page)

  // Already at Execution level by default - show attention badge
  await capture(page, "story-01-attention-badge.png")

  // ═══════════════════════════════════════════════════════════════════
  // ACT 2: INVESTIGATE — "Why?" trace from the failure
  // ═══════════════════════════════════════════════════════════════════

  // Find the failed result node (the shell command output) and click "Why" in inspector
  await focusNode(page, "result:prt_tool_shell_2", "failed result")
  await expect(page.locator(inspector).getByRole("heading", { name: "failed" })).toBeVisible({ timeout: 10000 })
  await page.locator(inspector).getByRole("button", { name: "Why" }).click()
  await still(page)
  await capture(page, "story-02-why-trace.png")

  // Close trace
  await page.keyboard.press("Escape")

  // ═══════════════════════════════════════════════════════════════════
  // ACT 3: NAVIGATE — Palette search for failed tools
  // ═══════════════════════════════════════════════════════════════════

  const search = await openSearch(page)

  // Type natural language query
  await search.getByRole("combobox").fill("failed tools")
  await expect(search.locator('[data-node-id="tool:prt_tool_shell_2"]')).toBeVisible()
  await still(page)
  await capture(page, "story-03-palette-failed-tools.png")

  // Click result - jumps to node, opens inspector
  await search.locator('[data-node-id="tool:prt_tool_shell_2"]').click()
  await expect(page.locator(inspector).getByRole("heading", { name: "shell" })).toBeVisible()
  await still(page)
  await capture(page, "story-04-shell-inspector.png")

  await closeSearch(page, search)

  // ═══════════════════════════════════════════════════════════════════
  // ACT 4: INSPECT — File diff widget shows the wrong fix
  // ═══════════════════════════════════════════════════════════════════

  // Navigate to the file that was wrongly edited
  const search2 = await openSearch(page)
  await search2.getByRole("combobox").fill("token.ts")
  await search2.getByRole("option", { name: "src/auth/token.ts", exact: true }).click()
  await expect(page.locator(inspector).getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible()

  // The diff widget shows the bad edit (extended token lifetime)
  await still(page)
  await capture(page, "story-05-wrong-fix-diff.png")

  await closeSearch(page, search2)

  // ═══════════════════════════════════════════════════════════════════
  // ACT 5: DISCOVER — Hierarchy layout reveals subagent found root cause
  // ═══════════════════════════════════════════════════════════════════

  // Switch to hierarchy layout to see delegation structure
  await pickLayout(page, "hierarchy")
  await fit(page)
  await still(page)
  await capture(page, "story-06-hierarchy-subagent.png")

  // Focus on the subagent node
  await focusNode(page, "phase:turn:msg_user_1:explore:1", "explore")
  await still(page)
  await capture(page, "story-07-subagent-finding.png")

  // ═══════════════════════════════════════════════════════════════════
  // ACT 6: SHARE — Permalink to the failure for teammate
  // ═══════════════════════════════════════════════════════════════════

  // Navigate back to the original failure node
  const search4 = await openSearch(page)
  await search4.getByRole("combobox").fill("failed")
  await expect(search4.locator('[data-node-id="tool:prt_tool_shell_2"]')).toBeVisible()
  await search4.locator('[data-node-id="tool:prt_tool_shell_2"]').click()
  await still(page)

  // Close search before capturing the permalink target
  await closeSearch(page, search4)
  await still(page)

  // Capture the graph with the failure node selected (permalink target)
  await capture(page, "story-08-permalink.png")

  // Final verification
  expect(filterKnownErrors(errors)).toEqual([])
})
