import { expect, test as base, type Page } from "@playwright/test"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { sessionHref } from "../utils/app"
import { trackPageErrors } from "../utils/errors"
import { seedSessionGraph } from "../utils/graph"
import {
  assistantMessage,
  historyMessages,
  partUpdated,
  setupTimeline,
  stepStarted,
  toolPart,
} from "../utils/timeline"
import { openSession } from "../utils/workspace"

// The graph is behind an experimental flag, so every test in this file starts with it on.
const test = base.extend({
  page: async ({ page }, use) => {
    await seedSessionGraph(page)
    await use(page)
  },
})

const directory = "C:/OpenCode/SessionGraph"

const sessionID = "ses_session_graph"

const canvasHost = '[data-slot="graph-canvas-host"]'

const toolbar = '[data-slot="graph-toolbar"]'

/** T14: the toolbar's menus are popovers on a wide row and one overflow menu on a narrow one. */
async function openMenu(page: Page) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-view"]`)
  if ((await menu.count()) > 0) {
    const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
    if (!open) await menu.locator(":scope > summary").click()
    return
  }
  const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
  const open = await overflow.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!open) await overflow.getByLabel("More controls").click()
}

async function openLayers(page: Page) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!open) await menu.locator(":scope > summary").click()
}

async function closeLayers(page: Page) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  if (await menu.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await menu.locator(":scope > summary").click()
  }
}

async function openFacets(page: Page) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-facets"]`)
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!open) await menu.locator(":scope > summary").click()
  return menu
}

async function setLevel(page: Page, level: "Overview" | "Execution" | "Detail") {
  await openLayers(page)
  const levels = page.locator('[data-slot="graph-layers-level"]')
  await levels.locator('button', { hasText: level }).click()
  await expect(levels.locator('button', { hasText: level })).toHaveAttribute("aria-pressed", "true")
  await closeLayers(page)
}


const inspector = '[data-slot="graph-inspector"]'

function graphFixture() {
  return {
    name: "SessionGraph",
    directory,
    sessions: [{ id: sessionID, title: "Session graph" }],
    // The canonical session fixture (SPACEGRAPH.TODO.1 §7) is the single source for the graph model.
    pageMessages: () => ({ items: buildFixtureMessages() }),
  }
}

type GraphInput = Parameters<typeof openSession>[1]

async function openGraph(page: Page, input: GraphInput) {
  await openSession(page, input)
  await openGraphViaMenu(page)
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
}

async function openGraphViaMenu(page: Page) {
  // Open spacegraph map surface via keyboard shortcut (Control+Shift+M)
  await page.keyboard.press("Control+Shift+M")
  // Wait for the lazy-loaded graph module to resolve (Suspense fallback to disappear)
  await expect(page.locator('[data-slot="session-graph-loading"]')).toBeHidden({ timeout: 30_000 })
}

test("switches to the graph, renders the fixture, and persists the mode", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-renderer", "spacegraph")
  await expect(page.locator(toolbar)).toBeVisible()
  // Execution level renders activity cards from the model; a changed file is a stable anchor.
  await setLevel(page, "Execution")
  await expect(page.getByText("src/auth/token.ts").first()).toBeVisible()

  await page.reload()
  await expect(page.locator(toolbar)).toBeVisible()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")

  expect(errors).toEqual([])
})

test("turns the billboard off and on from the toolbar", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  // T1.19: the cards lie in the content plane by default, so a tilted camera shows the honest
  // perspective. The billboard switch turns them to face the reader.
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-card-facing", "plane")

  await openMenu(page)
  const billboard = page.locator(toolbar).getByRole("button", { name: "Billboard cards" })
  await expect(billboard).toHaveAttribute("aria-pressed", "false")
  await billboard.click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-card-facing", "camera")
  await expect(billboard).toHaveAttribute("aria-pressed", "true")

  await billboard.click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-card-facing", "plane")

  expect(errors).toEqual([])
})

test("offers the graph switch on a narrow mobile viewport", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.setViewportSize({ width: 390, height: 900 })
  await openSession(page, graphFixture())

  // The graph is opened via keyboard shortcut (Control+Shift+M) on all viewports.
  await page.keyboard.press("Control+Shift+M")
  await expect(page.locator('[data-slot="session-graph-loading"]')).toBeHidden({ timeout: 30_000 })
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await expect(page.locator(toolbar)).toBeVisible()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )

  expect(overflow).toBeLessThanOrEqual(1)

  expect(errors).toEqual([])
})

test("switches to the ribbon layout, honours the level, and persists it", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  await page.locator(`${toolbar} [data-slot="graph-toolbar-layout"] summary`).click()
  await page.locator(`${toolbar} [data-slot="graph-layout-option"][data-value="ribbon"]`).click()
  await expect(page.locator(`${toolbar} [data-slot="graph-layout-name"]`)).toHaveText("Ribbon")
  // The ribbon is a per-turn bar: real model nodes, still DOM cards.
  await expect.poll(() => page.locator(`${canvasHost} [data-kind="turn"]`).count()).toBeGreaterThan(0)

  // T17.2: the level is the grain in a summary layout too, so the overview shows the phase segments.
  await openLayers(page)
  await page.locator('[data-slot="graph-layers-level"] button', { hasText: "Overview" }).click()
  await expect.poll(() => page.locator(`${canvasHost} [data-kind="phase"]`).count()).toBeGreaterThan(0)

  // Wait for the layout to be persisted before reload
  await page.waitForTimeout(500)

  await page.reload()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  // The layout should persist across reloads; wait for the session store to load
  await expect.poll(() => page.locator(`${toolbar} [data-slot="graph-layout-name"]`).textContent()).toBe("Ribbon")

  expect(errors).toEqual([])
})

test("a saved ribbon from the old representation opens as the ribbon (T17.1)", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  // The reader's choice is stored, so the document holds the graph state.
  await page.locator(`${toolbar} [data-slot="graph-toolbar-layout"] summary`).click()
  await page.locator(`${toolbar} [data-slot="graph-layout-option"][data-value="ribbon"]`).click()
  await expect(page.locator(`${toolbar} [data-slot="graph-layout-name"]`)).toHaveText("Ribbon")

  // Rewrite the stored state in the shape the old build wrote: a representation beside the strategy.
  await page.evaluate(() => {
    const key = "opencode.global.dat:layout"
    const stored = JSON.parse(localStorage.getItem(key) ?? "{}") as {
      sessionView?: Record<string, { graph?: Record<string, unknown> }>
    }

    for (const view of Object.values(stored.sessionView ?? {})) {
      if (!view.graph) continue
      view.graph.representation = "ribbon"
      delete view.graph.layout
    }

    localStorage.setItem(key, JSON.stringify(stored))
  })

  await page.reload()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await expect(page.locator(`${toolbar} [data-slot="graph-layout-name"]`)).toHaveText("Ribbon")

  expect(errors).toEqual([])
})

test("selects a node from search and inspects it in the DOM panel", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  await openMenu(page)
  await page.getByRole("button", { name: "Search the graph" }).click()
  const search = page.getByRole("dialog", { name: "Search the graph" })
  await search.getByRole("combobox").fill("token.ts")
  await search.getByRole("option", { name: "src/auth/token.ts", exact: true }).click()

  const panel = page.locator(inspector)
  await expect(panel.getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible()
  await expect(panel.getByText("File", { exact: true })).toBeVisible()

  expect(errors).toEqual([])
})

test("filters the map with a facet chip and keeps the answer addressable", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  const facets = await openFacets(page)
  await facets.locator('[data-slot="graph-facet-kind"][data-value="file"]').click()
  await expect(facets.locator('[data-slot="graph-facet-kind"][data-value="file"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  )

  // Only files (and the session root) survive the kind facet; the tools are gone from the map.
  await expect.poll(() => page.locator(`${canvasHost} [data-kind="tool"]`).count()).toBe(0)
  await expect.poll(() => page.locator(`${canvasHost} [data-kind="file"]`).count()).toBeGreaterThan(0)

  // The chip reports what it kept against what the map had.
  await expect(facets.locator('[data-slot="graph-facet-kind"][data-value="file"]')).toContainText("/")

  expect(errors).toEqual([])
})

test("switches the lens by preset and by domain toggles", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  const layers = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  await openLayers(page)
  await layers.locator('[data-slot="graph-lens-preset"][data-value="runtime"]').click()
  await expect(layers.locator('[data-slot="graph-lens-preset"][data-value="runtime"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  )

  // A domain toggle composes over the same scope; the preset is simply no longer the whole state.
  await layers.locator('[data-slot="graph-domain-option"][data-value="code"]').click()
  await expect(layers.locator('[data-slot="graph-domain-option"][data-value="code"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(layers.locator('[data-slot="graph-lens-preset"][data-value="runtime"]')).toHaveAttribute(
    "aria-pressed",
    "false",
  )

  expect(errors).toEqual([])
})

test("opens a view permalink with its facet question applied", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openSession(page, graphFixture())

  await page.evaluate(() => {
    window.location.hash = "#graph?kind:file"
  })
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")

  const facets = await openFacets(page)
  await expect(facets.locator('[data-slot="graph-facet-kind"][data-value="file"]')).toHaveAttribute("aria-pressed", "true")
  await expect.poll(() => page.locator(`${canvasHost} [data-kind="tool"]`).count()).toBe(0)

  expect(errors).toEqual([])
})

test("the status bar acts on the held set and clears it", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  await page.locator(`${canvasHost} [data-node-id="file:src/auth/token.ts"]`).click()

  const bar = page.locator('[data-slot="graph-status-bar"]')
  await expect(bar).toBeVisible()

  // Keep only the held file: the tools leave the map, the held file stays.
  await bar.locator('[data-slot="graph-status-keep-only"]').click()
  await expect.poll(() => page.locator(`${canvasHost} [data-kind="tool"]`).count()).toBe(0)
  await expect(page.locator(`${canvasHost} [data-node-id="file:src/auth/token.ts"]`)).toBeVisible()

  // Clear releases both the scope and the selection.
  await bar.getByRole("button", { name: "Clear the selection scope" }).click()
  await expect(bar).toBeHidden()
  await expect.poll(() => page.locator(`${canvasHost} [data-kind="tool"]`).count()).toBeGreaterThan(0)

  expect(errors).toEqual([])
})

test("a parked scrubber diffs the earlier turn against the live map", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  await page.locator('[data-slot="graph-time-toggle"]').click()
  const scrubber = page.locator('[data-slot="session-graph-scrubber"]')
  await scrubber.locator("input").evaluate((element) => {
    const input = element as HTMLInputElement
    input.value = "1"
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })

  const compare = page.locator('[data-slot="graph-compare-bar"]')
  await expect(compare).toBeVisible()
  await expect(compare.locator('[data-slot="graph-compare-counts"]')).toContainText("+")
  await expect(scrubber.locator('[data-slot="graph-time-tick"]')).toHaveCount(2)

  await compare.locator('[data-slot="graph-compare-open"]').click()
  const compareWindow = page.locator('[data-slot="graph-window"][data-window-kind="compare"]')
  await expect(compareWindow).toBeVisible()
  await expect(compareWindow.locator('[data-slot="graph-compare-section"][data-diff="added"]')).toBeVisible()

  await compare.locator('[data-slot="graph-compare-clear"]').click()
  await expect(compare).toBeHidden()

  expect(errors).toEqual([])
})

test("collapses a group to its chip and expands it again", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  const groupID = "phase:turn:msg_user_1:explore:1"
  const group = page.locator(`${canvasHost} [data-node-id="${groupID}"]`)
  const member = page.locator(`${canvasHost} [data-node-id="tool:prt_tool_read_1"]`)
  await expect(member).toBeVisible()

  const box = (await group.boundingBox())!
  await page.mouse.click(box.x + 24, box.y + 18)

  const toggle = page.locator('[data-slot="graph-status-group-toggle"]')
  await expect(toggle).toHaveAttribute("data-collapsed", "false")
  await toggle.click()

  await expect(toggle).toHaveAttribute("data-collapsed", "true")
  await expect.poll(() => member.count()).toBe(0)
  await expect(group).toBeVisible()

  await toggle.click()
  await expect.poll(() => member.count()).toBe(1)

  expect(errors).toEqual([])
})

test("toggles an edge kind from the legend", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  await page.locator(`${toolbar} [data-slot="graph-toolbar-view"] > summary`).click()
  await page.getByRole("button", { name: "Show the legend" }).click()
  const legend = page.locator('[data-slot="graph-legend"]')
  const writes = legend.locator('[data-slot="graph-legend-edge-kind"][data-kind="writes"]')
  await expect(writes).toHaveAttribute("aria-pressed", "true")

  await writes.click()
  await expect(writes).toHaveAttribute("aria-pressed", "false")
  await expect(writes).toHaveAttribute("data-hidden", "true")

  await writes.click()
  await expect(writes).toHaveAttribute("aria-pressed", "true")

  expect(errors).toEqual([])
})

test("adds a note to the selected node and finds it by search", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  await page.locator(`${canvasHost} [data-node-id="file:src/auth/token.ts"]`).click()
  await page.locator('[data-slot="graph-status-add-note"]').click()

  const composer = page.locator('[data-slot="graph-note-composer"]')
  await expect(composer).toBeVisible()
  await composer.locator('[data-slot="graph-note-input"]').fill("Investigate token refresh")
  await composer.locator('[data-slot="graph-note-save"]').click()
  await expect(composer).toBeHidden()

  const note = page.locator(`${canvasHost} [data-node-id^="note:"]`)
  await expect(note).toHaveCount(1)

  await openMenu(page)
  await page.getByRole("button", { name: "Search the graph" }).click()
  const search = page.getByRole("dialog", { name: "Search the graph" })
  await search.getByRole("combobox").fill("Investigate token refresh")
  await expect(search.getByRole("option", { name: /Investigate token refresh/ })).toBeVisible()

  expect(errors).toEqual([])
})

test("edits and deletes a note from the inspector", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  await page.locator(`${canvasHost} [data-node-id="file:src/auth/token.ts"]`).click()
  await page.locator('[data-slot="graph-status-add-note"]').click()
  const composer = page.locator('[data-slot="graph-note-composer"]')
  await composer.locator('[data-slot="graph-note-input"]').fill("First draft")
  await composer.locator('[data-slot="graph-note-save"]').click()

  // Select the note itself, then edit it in place.
  await page.locator(`${canvasHost} [data-node-id^="note:"]`).click()
  await page.getByRole("button", { name: "Edit note" }).first().click()
  await expect(composer).toBeVisible()
  await composer.locator('[data-slot="graph-note-input"]').fill("Refined note")
  await composer.locator('[data-slot="graph-note-save"]').click()
  await expect(page.locator(`${canvasHost} [data-node-id^="note:"]`)).toContainText("Refined note")

  await page.locator(`${canvasHost} [data-node-id^="note:"]`).click()
  await page.getByRole("button", { name: "Delete note" }).first().click()
  await expect(page.locator(`${canvasHost} [data-node-id^="note:"]`)).toHaveCount(0)

  expect(errors).toEqual([])
})

test("brackets walk the selected node's edges", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  await page.locator(`${canvasHost} [data-node-id="file:src/auth/token.ts"]`).click()
  const selected = page.locator(`${canvasHost} [data-node-id]:has([data-selected="true"])`)
  const before = await selected.getAttribute("data-node-id")

  await page.keyboard.press("]")
  await expect.poll(() => selected.getAttribute("data-node-id")).not.toBe(before)
  await expect(page.locator('[data-slot="graph-status-bar"]')).toHaveAttribute("data-selection-count", "1")

  await page.keyboard.press("[")
  await expect(page.locator('[data-slot="graph-status-bar"]')).toHaveAttribute("data-selection-count", "1")

  expect(errors).toEqual([])
})

test("renders an assistant message as Markdown in the inspector", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  // Search reaches the assistant text node by its summary, then renders it through the shared Markdown.
  await openMenu(page)
  await page.getByRole("button", { name: "Search the graph" }).click()
  const search = page.getByRole("dialog", { name: "Search the graph" })
  await search.getByRole("combobox").fill("inspect the failing")
  await search.getByRole("option").first().click()

  const markdown = page.locator(inspector).locator('[data-component="markdown"]')
  await expect(markdown).toBeVisible()
  await expect(markdown).toContainText("inspect the failing authentication tests")

  expect(errors).toEqual([])
})

test("appends a node from a live event without losing the selection", async ({ page }) => {
  const errors = trackPageErrors(page)

  const timeline = await setupTimeline(page, {
    sessionMessages: buildFixtureMessages(),
  })

  await openGraphViaMenu(page)
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")

  await openMenu(page)
  await page.getByRole("button", { name: "Search the graph" }).click()
  const search = page.getByRole("dialog", { name: "Search the graph" })
  await search.getByRole("combobox").fill("token.ts")
  await search.getByRole("option", { name: "src/auth/token.ts", exact: true }).click()

  const panel = page.locator(inspector)
  await expect(panel.getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible()

  // A new assistant turn streams in a tool that reads a further file.
  const live = assistantMessage([], { id: "msg_live_1", parentID: "msg_user_2", completed: false })
  await timeline.send(stepStarted(live))
  await timeline.send(
    partUpdated({
      ...toolPart("prt_live_read_1", "read", "completed", { path: "src/auth/refresh.ts" }, { output: "export {}" }),
      messageID: "msg_live_1",
    }),
  )

  await expect(page.getByText("src/auth/refresh.ts").first()).toBeVisible()
  // The earlier selection is untouched by the append.
  await expect(panel.getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible()

  expect(errors).toEqual([])
})

test("disposes the graph when switching sessions and restores it on return", async ({ page }) => {
  const errors = trackPageErrors(page)
  const other = "ses_session_graph_other"

  const input = {
    name: "SessionGraph",
    directory,
    sessions: [
      { id: sessionID, title: "Session graph" },
      { id: other, title: "Session graph other" },
    ],
    pageMessages: (id: string) => ({ items: id === sessionID ? buildFixtureMessages() : [] }),
  }

  await openGraph(page, input)

  await page.locator(`a[data-titlebar-tab-link][href="${sessionHref(other)}"]`).click()
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable()
  await expect(page.locator(canvasHost)).toHaveCount(0)

  await page.locator(`a[data-titlebar-tab-link][href="${sessionHref(sessionID)}"]`).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-renderer", "spacegraph")

  expect(errors).toEqual([])
})

test("keeps the canvas ready across a resize", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  await page.setViewportSize({ width: 1024, height: 720 })
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await expect(page.locator(toolbar)).toBeVisible()

  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")

  expect(errors).toEqual([])
})

test("keeps the toolbar back control clickable under the floating header toggles", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await openGraph(page, graphFixture())

  // The toolbar's back control sits in the panel's top-right, where the desktop header toggles float.
  // Playwright only clicks when the element receives the event, so this fails if the toggles cover it.
  await page.locator(toolbar).getByRole("button", { name: "Back to transcript" }).click()
  await expect(page.locator(canvasHost)).toHaveCount(0)
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable()

  expect(errors).toEqual([])
})

test("opens the hybrid turn map over the graph and closes on Escape", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  // Selecting a turn (via a message hash) makes the turn-map control available in the toolbar.
  await page.evaluate(() => {
    window.location.hash = "#message-msg_user_1"
  })
  await expect(page.locator(inspector).getByText("Turn", { exact: true })).toBeVisible()

  await openMenu(page)
  await page.locator(toolbar).getByRole("button", { name: "Open turn map" }).click()
  const overlay = page.getByRole("dialog", { name: "Turn map" })
  await expect(overlay).toBeVisible()
  await expect(overlay.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")

  await page.keyboard.press("Escape")
  await expect(overlay).toBeHidden()
  // The graph underneath is untouched.
  await expect(page.locator(toolbar)).toBeVisible()

  expect(errors).toEqual([])
})

test("shows the map and the log together, and the reader chooses how they meet", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  // The map offers the way into the hybrid: a reader who wants the log does not have to leave the
  // map to get it.
  await page.locator(`${toolbar} [data-slot="graph-toolbar-split"]`).click()

  const hybrid = page.locator('[data-slot="spacegraph-surface-hybrid"]')
  await expect(hybrid).toBeVisible()
  await expect(hybrid).toHaveAttribute("data-arrangement", "stacked")
  // The map canvas is visible in the hybrid
  await expect(page.locator(canvasHost)).toBeVisible()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")

  // The arrangement is the reader's choice, and it lives in the map's own Draw menu.
  await openMenu(page)
  await page.locator(`${toolbar} [data-slot="graph-arrangement-option"][data-value="side"]`).click()
  await expect(hybrid).toHaveAttribute("data-arrangement", "side")

  await openMenu(page)
  await page.locator(`${toolbar} [data-slot="graph-arrangement-option"][data-value="floating"]`).click()
  await expect(hybrid).toHaveAttribute("data-arrangement", "floating")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")

  expect(errors).toEqual([])
})

test("folds the checkpoint scrubber until the reader asks for it", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  const scrubber = page.locator('[data-slot="session-graph-scrubber"]')
  await expect(scrubber).toHaveCount(0)

  await page.locator('[data-slot="graph-time-toggle"]').click()
  await expect(scrubber).toBeVisible()
  await expect(scrubber).toContainText("Turn 2 of 2")

  await scrubber.locator("input").evaluate((element) => {
    const input = element as HTMLInputElement
    input.value = "1"
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await expect(scrubber).toContainText("Turn 1 of 2")

  // The reader opened it, so it stays open when they walk back to the live turn.
  await scrubber.locator("input").evaluate((element) => {
    const input = element as HTMLInputElement
    input.value = "2"
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await expect(scrubber).toContainText("Turn 2 of 2")
  await expect(scrubber).toBeVisible()

  expect(errors).toEqual([])
})

test("picking a node in the map moves the log to it", async ({ page }) => {
  const errors = trackPageErrors(page)
  // A long transcript, so the log has somewhere to move.
  const items = [...historyMessages(20), ...buildFixtureMessages()]
  await openSession(page, { ...graphFixture(), pageMessages: () => ({ items }) })
  await openGraphViaMenu(page)
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await page.locator(`${toolbar} [data-slot="graph-toolbar-split"]`).click()
  await expect(page.locator('[data-slot="session-graph-panel"]')).toBeVisible()

  // The oldest turn's answer, picked in the map.
  await openMenu(page)
  await page.getByRole("button", { name: "Search the graph" }).click()
  const search = page.getByRole("dialog", { name: "Search the graph" })
  await search.getByRole("combobox").fill("Fix the authentication test failures")
  await search.locator('[data-node-id="msg:msg_user_1"]').click()

  // The log followed the map: the picked row is the one on screen, not merely mounted.
  const row = page.locator(
    '[data-slot="session-graph-panel-log"] [data-timeline-row="UserMessage"][data-message-id="msg_user_1"]',
  )
  await expect(row).toBeVisible()
  await expect(row).toBeInViewport()

  expect(errors).toEqual([])
})

test("scales the log's text from the split, without leaving the map", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())
  await page.locator(`${toolbar} [data-slot="graph-toolbar-split"]`).click()
  await expect(page.locator('[data-slot="session-graph-panel"]')).toBeVisible()

  // The slider is at hand: a split panel's log is narrow, so the reader wants its text bigger.
  const slider = page.locator('[data-slot="session-graph-panel-log-scale"] input[type="range"]')
  await expect(slider).toBeVisible()

  // The log's content owns the transcript's inherited size, so it is the surface the slider scales.
  const content = page.locator('[data-slot="session-graph-panel-log-content"]')
  const before = await content.evaluate((element) => getComputedStyle(element).fontSize)

  await slider.fill("1.3")

  await expect
    .poll(() => content.evaluate((element) => getComputedStyle(element).fontSize))
    .not.toBe(before)

  expect(errors).toEqual([])
})

test("reveals the turn for a message hash and returns to it in the transcript", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  const panel = page.locator(inspector)
  // A hash that targets a message while graph mode is active selects the owning turn.
  await page.evaluate(() => {
    window.location.hash = "#message-msg_user_1"
  })
  await expect(panel.getByRole("heading", { name: "Fix the authentication test failures." })).toBeVisible()
  await expect(panel.getByText("Turn", { exact: true })).toBeVisible()

  // The reverse direction: open in transcript returns to the originating message.
  await page.getByRole("button", { name: "Open in transcript" }).click()
  await expect(page.locator(canvasHost)).toHaveCount(0)
  await expect(page.locator('[data-timeline-row="UserMessage"][data-message-id="msg_user_1"]')).toBeVisible()

  expect(errors).toEqual([])
})

test("selects the turn for a message hash when the graph opens", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openSession(page, graphFixture())

  await page.evaluate(() => {
    window.location.hash = "#message-msg_user_2"
  })
  await openGraphViaMenu(page)
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")

  await expect(page.locator(inspector).getByRole("heading", { name: "Also cover the refresh path" })).toBeVisible()

  expect(errors).toEqual([])
})

test("opens the graph on a node permalink and frames the node", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openSession(page, graphFixture())

  // T3.5: a shared link names the node, and the graph opens on it.
  await page.evaluate(() => {
    window.location.hash = "#graph:file:src/auth/token.ts"
  })
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await expect(page.locator(inspector).getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible()

  expect(errors).toEqual([])
})

test("opens the graph on a node permalink from a cold load", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openSession(page, graphFixture())

  await page.evaluate(() => {
    window.location.hash = "#graph:turn:msg_user_1"
  })
  // A reload is a cold load: the app boots with the link and opens the graph on its own.
  await page.reload()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await expect(page.locator(inspector).getByRole("heading", { name: "Fix the authentication test failures." })).toBeVisible()

  expect(errors).toEqual([])
})

test("falls back safely when a permalink names an unknown node", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openSession(page, graphFixture())

  await page.evaluate(() => {
    window.location.hash = "#graph:file:does/not/exist.ts"
  })
  // The graph opens, nothing is selected, and the transcript stays reachable.
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await expect(page.locator(inspector).getByText("Select a node to see its details")).toBeVisible()
  await page.locator(toolbar).getByRole("button", { name: "Back to transcript" }).click()
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable()

  expect(errors).toEqual([])
})

test("counts interactions for the usability protocol when the counter is on", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openSession(page, graphFixture())

  // T2.3: the counter is opt-in through the URL and never leaves the browser.
  await page.goto(`${sessionHref(sessionID)}?graphMetrics=1`)
  const readout = page.locator('[data-slot="graph-metrics"]')
  await expect(readout).toContainText("0 interactions")

  // A surface switch is an interaction.
  await openGraphViaMenu(page)
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await expect(readout).toContainText("1 interaction")

  // So is opening the search.
  await openMenu(page)
  await page.getByRole("button", { name: "Search the graph" }).click()
  await expect(readout).toContainText("2 interactions")

  expect(errors).toEqual([])
})

test("restores the transcript position after leaving the graph", async ({ page }) => {
  const errors = trackPageErrors(page)
  // A long transcript so switching modes has a position worth restoring.
  const items = [...historyMessages(20), ...buildFixtureMessages()]
  await openSession(page, {
    name: "SessionGraph",
    directory,
    sessions: [{ id: sessionID, title: "Session graph" }],
    pageMessages: () => ({ items }),
    // Enable the experimental session graph feature flag
    seed: {
      settings: {
        experimental: {
          sessionGraph: true,
        },
      },
    },
  })

  const scroller = page.locator(".scroll-view__viewport", { has: page.locator("[data-timeline-row]") })
  // Scroll up from the pinned bottom so the timeline remembers a mid-session position.
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight
    element.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -600 }))
    element.scrollTop -= 600
  })

  // The virtualizer settles late measurements by nudging the offset to hold the visible row; one
  // nudge is a valid position, not a restore failure, so record the offset once it stops moving.
  const before = await scroller.evaluate(async (element) => {
    const frame = () => new Promise<number>((resolve) => requestAnimationFrame(() => resolve(element.scrollTop)))
    let previous = await frame()

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const next = await frame()

      if (Math.abs(next - previous) < 1) return Math.round(next)
      previous = next
    }

    return Math.round(previous)
  })

  expect(before).toBeGreaterThan(0)

  await openGraphViaMenu(page)
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await openGraphViaMenu(page)
  await expect(page.locator(canvasHost)).toHaveCount(0)

  await expect.poll(() => scroller.evaluate((element) => Math.round(element.scrollTop))).toBe(before)
  expect(errors).toEqual([])
})

test("falls back to Cytoscape when the SpaceGraph adapter fails to load", async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_BUILD === "1", "intercepts dev-server module URLs; built chunks are hashed")
  // Abort the preferred adapter's module so its factory rejects; the registry must fall through.
  await page.route(/spacegraph-renderer\/dist\/index/, (route) => route.abort())
  await openGraph(page, graphFixture())

  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-renderer", "cytoscape", { timeout: 30_000 })
  // The fallback is declared to the user, not silent, and the perspective depths are disabled rather than broken.
  await expect(page.locator('[data-slot="graph-fallback"]')).toBeVisible()
  await expect(page.locator('[data-slot="graph-layers-depth"] option[value="orbit"]')).toHaveAttribute("disabled", "")
})

test("returns to the transcript when no renderer can mount", async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_BUILD === "1", "intercepts dev-server module URLs; built chunks are hashed")
  await page.route(/spacegraph-renderer\/dist\/index/, (route) => route.abort())
  await page.route(/cytoscape-renderer\/dist\/index/, (route) => route.abort())
  await openSession(page, graphFixture())
  await openGraphViaMenu(page)

  const error = page.locator('[data-slot="graph-error"]')
  await expect(error).toBeVisible({ timeout: 30_000 })
  await error.getByRole("button", { name: "Back to transcript" }).click()
  await expect(page.locator(canvasHost)).toHaveCount(0)
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable()
})

test("falls back to the transcript when the graph module fails to load", async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_BUILD === "1", "intercepts the dev-server module URL; the built chunk is hashed")
  // Abort the lazily imported graph module so its error boundary must recover into the transcript.
  await page.route(/session-graph\/src\/index\.ts/, (route) => route.abort())
  await openSession(page, graphFixture())

  await openGraphViaMenu(page)
  await expect(page.getByText("Couldn't open the graph view")).toBeVisible()

  await page.getByRole("button", { name: "Back to transcript" }).click()
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable()
  await expect(page.locator(canvasHost)).toHaveCount(0)
  // The transcript is an independent surface: it renders and accepts input without the graph module.
  await expect(
    page.locator('[data-slot="session-graph-panel-log"] [data-timeline-row="UserMessage"]').first(),
  ).toBeVisible()
})

test("names the session a fork came from and opens it", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, {
    ...graphFixture(),
    sessions: [
      {
        id: sessionID,
        title: "Session graph",
        fork: { sessionID: "ses_origin", boundary: { type: "through", messageID: "msg_user_1" } },
      },
      { id: "ses_origin", title: "Original session" },
    ],
  })

  // The root node carries the attribution, so the inspector can name where this session came from.
  await openMenu(page)
  await page.getByRole("button", { name: "Search the graph" }).click()
  const search = page.getByRole("dialog", { name: "Search the graph" })
  await search.getByRole("combobox").fill("Session")
  await search.locator('[data-node-id="session"]').click()

  const panel = page.locator(inspector)
  await expect(panel).toContainText("Forked from")
  await expect(panel).toContainText("ses_origin")

  // The action opens the other session, the way the transcript opens a session it links to.
  await panel.getByRole("button", { name: "Open the session this was forked from" }).click()
  await expect(page).toHaveURL(new RegExp("ses_origin"))

  expect(errors).toEqual([])
})

test("pans the view with the right mouse button", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  const card = page.locator(`${canvasHost} [data-node-id="file:src/auth/token.ts"]`)
  const before = await card.boundingBox()
  const host = (await page.locator(canvasHost).boundingBox())!

  // The right button belongs to the camera: the view follows the cursor. Drag from the middle of
  // the canvas; the composer overlays the pane's bottom edge, so its corner is not the map.
  await page.mouse.move(host.x + host.width / 2, host.y + host.height / 2)
  await page.mouse.down({ button: "right" })
  await page.mouse.move(host.x + host.width / 2 - 100, host.y + host.height / 2 - 100, { steps: 10 })
  await page.mouse.up({ button: "right" })

  await expect
    .poll(async () => Math.round(Math.abs(((await card.boundingBox())?.x ?? 0) - (before?.x ?? 0))))
    .toBeGreaterThan(20)

  expect(errors).toEqual([])
})

test("the card budget follows the camera (T17.5)", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  // The detail level's budget is 24 cards, and the fixture's session has more activity than that.
  await openLayers(page)
  await page.locator('[data-slot="graph-layers-level"] button', { hasText: "Detail" }).click()
  await expect.poll(() => page.locator(`${canvasHost} [data-kind]`).count()).toBeGreaterThan(0)

  const cards = () =>
    page
      .locator(`${canvasHost} [data-kind]`)
      .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? "").sort())

  const before = await cards()

  // The budget is spent, so there are fewer cards than the session has nodes.
  expect(before.length).toBeLessThan(43)

  // The camera moves: the budget follows it, and the cards move with it.
  const host = (await page.locator(canvasHost).boundingBox())!
  await page.mouse.move(host.x + host.width / 2, host.y + host.height / 2)
  await page.mouse.down({ button: "right" })
  await page.mouse.move(host.x + host.width / 2 - 420, host.y + host.height / 2 - 240, { steps: 10 })
  await page.mouse.up({ button: "right" })

  await expect.poll(cards).not.toEqual(before)

  expect(errors).toEqual([])
})

test("zooms the view with the mouse wheel", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  const zoom = page.locator('[data-slot="graph-zoom-level"]')
  const before = await zoom.innerText()
  const host = (await page.locator(canvasHost).boundingBox())!

  await page.mouse.move(host.x + host.width / 2, host.y + host.height / 2)
  await page.mouse.wheel(0, -300)

  await expect.poll(() => zoom.innerText()).not.toBe(before)

  expect(errors).toEqual([])
})

test("selects a node when its card is clicked", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  const card = page.locator(`${canvasHost} [data-node-id="file:src/auth/token.ts"]`)
  await card.click()

  await expect(page.locator(inspector).getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible()

  expect(errors).toEqual([])
})

test("keeps the card styling when the layout changes", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  const card = page.locator(`${canvasHost} [data-node-id="file:src/auth/token.ts"]`)

  const styling = () =>
    card.locator("[data-kind]").evaluate((element) => {
      const style = getComputedStyle(element)

      return {
        background: style.backgroundColor,
        border: style.borderTopColor,
        glyph: element.querySelector("svg") !== null,
      }
    })

  const before = await styling()

  await page.locator('[data-slot="graph-toolbar-layout"] summary').click()
  await page.locator('[data-slot="graph-layout-option"][data-value="timeline"]').click()

  // The card is still the card: the model rebuilt it, and its styling came with it.
  await expect.poll(styling).toEqual(before)

  expect(errors).toEqual([])
})

test("drags a group and carries its members", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  const groups = page.locator(`${canvasHost} .spacegraph-group-node`)
  const rects = () =>
    groups.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect()
        return { id: (element as HTMLElement).dataset.nodeId, x: rect.x, y: rect.y }
      }),
    )

  const host = (await page.locator(canvasHost).boundingBox())!
  const before = await rects()
  const target = before.find((group) => group.x > host.x && group.x + 400 < host.x + host.width && group.y > host.y + 80)
  expect(target).toBeDefined()

  await page.mouse.move(target!.x + 24, target!.y + 18)
  await page.mouse.down()
  await page.mouse.move(target!.x + 114, target!.y + 68, { steps: 10 })
  await page.mouse.up()

  await expect
    .poll(async () => {
      const after = await rects()
      return after.findIndex((group, index) => Math.abs(group.x - before[index]!.x) > 40)
    })
    .toBeGreaterThanOrEqual(0)

  // A rebuild from a toolbar lens keeps the reader's drag.
  const index = (await rects()).findIndex((group, at) => Math.abs(group.x - before[at]!.x) > 40)
  expect(index).toBeGreaterThanOrEqual(0)
  await openMenu(page)
  await page.getByRole("button", { name: "Toggle changed files" }).click()
  await expect.poll(async () => (await rects())[index]!.x).toBeGreaterThan(before[index]!.x + 40)

  expect(errors).toEqual([])
})

test("resizes a group from its handle", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  const handles = await page.locator(`${canvasHost} .resize-handle`).evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect()
      const point = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
      return {
        node: (element.closest('[data-node-id]') as HTMLElement | null)?.dataset.nodeId,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        hit: point === element || element.contains(point),
      }
    }),
  )
  const handle = handles.find((candidate) => candidate.hit)
  expect(handle).toBeDefined()

  const group = page.locator(`${canvasHost} [data-node-id="${handle!.node}"]`)
  const before = (await group.boundingBox())!
  const centre = { x: handle!.x + handle!.width / 2, y: handle!.y + handle!.height / 2 }

  await page.mouse.move(centre.x, centre.y)
  await page.mouse.down()
  await page.mouse.move(centre.x + 90, centre.y + 60, { steps: 10 })
  await page.mouse.up()

  await expect.poll(async () => (await group.boundingBox())?.width ?? 0).toBeGreaterThan(before.width + 30)

  // A rebuild from a toolbar lens keeps the reader's resize.
  await openMenu(page)
  await page.getByRole("button", { name: "Toggle changed files" }).click()
  await expect.poll(async () => (await group.boundingBox())?.width ?? 0).toBeGreaterThan(before.width + 30)

  expect(errors).toEqual([])
})

test.skip("graph.hybrid (mod+shift+h) toggles hybrid and preserves transcript scroll", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  // Enter the hybrid so the log is on screen, then scroll it down.
  await page.keyboard.press("Control+Shift+h")
  const hybrid = page.locator('[data-slot="spacegraph-surface-hybrid"]')
  await expect(hybrid).toBeVisible()

  const transcript = page.locator(".scroll-view__viewport", { has: page.locator("[data-timeline-row]") })
  await transcript.evaluate((el) => {
    el.scrollTop = 500
  })
  const scrollBefore = await transcript.evaluate((el) => Math.round(el.scrollTop))
  expect(scrollBefore).toBeGreaterThan(0)

  // Leave the hybrid: switch back to map surface (mod+shift+m), and the log's position is not lost.
  await page.keyboard.press("Control+Shift+m")
  await expect(hybrid).toBeHidden()
  await expect.poll(() => transcript.evaluate((el) => Math.round(el.scrollTop))).toBe(scrollBefore)

  // Return to the hybrid with mod+shift+h; the log is where the reader left it.
  await page.keyboard.press("Control+Shift+h")
  await expect(hybrid).toBeVisible()
  await expect.poll(() => transcript.evaluate((el) => Math.round(el.scrollTop))).toBe(scrollBefore)

  expect(errors).toEqual([])
})

test.skip("log text-size slider changes scale and survives reload (persists as logTextScale)", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  // Open hybrid to access the text size slider
  await page.locator(`${toolbar} [data-slot="graph-toolbar-split"]`).click()
  await expect(page.locator('[data-slot="session-graph-panel"]')).toBeVisible()

  const slider = page.locator('[data-slot="session-graph-panel-log"] input[type="range"][aria-label="Log text size"]')
  await expect(slider).toBeVisible()

  // Change the text size
  await slider.fill("1.4")
  await expect(page.locator('[data-slot="session-graph-panel-log"] .text-right')).toContainText("140%")

  // Reload the page
  await page.reload()
  await expect(page.locator('[data-slot="session-graph-panel"]')).toBeVisible({ timeout: 30_000 })

  // Verify the text size persisted
  await expect(slider).toBeVisible()
  await expect(slider).toHaveValue("1.4")
  await expect(page.locator('[data-slot="session-graph-panel-log"] .text-right')).toContainText("140%")

  expect(errors).toEqual([])
})
