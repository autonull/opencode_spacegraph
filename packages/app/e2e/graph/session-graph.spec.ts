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
async function openMenu(page: Page, which: "draw" | "show") {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-${which}"]`)
  if ((await menu.count()) > 0) {
    const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
    if (!open) await menu.locator("summary").click()
    return
  }
  const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
  const open = await overflow.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!open) await overflow.getByLabel("More controls").click()
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
  await page.getByRole("button", { name: "Toggle graph view" }).click()
  // Wait for the lazy-loaded graph module to resolve (Suspense fallback to disappear)
  await expect(page.locator('[data-slot="session-graph-loading"]')).toBeHidden({ timeout: 30_000 })
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
}

test("switches to the graph, renders the fixture, and persists the mode", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-renderer", "spacegraph")
  await expect(page.locator(toolbar)).toBeVisible()
  // Execution level renders activity cards from the model; a changed file is a stable anchor.
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

  await openMenu(page, "draw")
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

  // T1.4: the desktop header toggle is absent, so the mobile tab surface carries the switch.
  const toggle = page.getByRole("button", { name: "Toggle graph view" })
  await expect(toggle).toBeVisible()
  await toggle.click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await expect(page.locator(toolbar)).toBeVisible()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )

  expect(overflow).toBeLessThanOrEqual(1)

  expect(errors).toEqual([])
})

test("switches to the ribbon representation and persists it", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  const ribbon = page.locator(toolbar).getByRole("button", { name: "Ribbon", exact: true })
  await ribbon.click()
  await expect(ribbon).toHaveAttribute("aria-pressed", "true")
  // The ribbon is a per-turn bar of phase segments: real model nodes, still DOM cards.
  await expect.poll(() => page.locator(`${canvasHost} [data-kind="turn"]`).count()).toBeGreaterThan(0)
  await expect.poll(() => page.locator(`${canvasHost} [data-kind="phase"]`).count()).toBeGreaterThan(0)

  await page.reload()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await expect(page.locator(toolbar).getByRole("button", { name: "Ribbon", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )

  expect(errors).toEqual([])
})

test("selects a node from search and inspects it in the DOM panel", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  await page.getByRole("button", { name: "Search the graph" }).click()
  const search = page.getByRole("dialog", { name: "Search the graph" })
  await search.getByRole("combobox").fill("token.ts")
  await search.getByRole("option", { name: "src/auth/token.ts", exact: true }).click()

  const panel = page.locator(inspector)
  await expect(panel.getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible()
  await expect(panel.getByText("File", { exact: true })).toBeVisible()

  expect(errors).toEqual([])
})

test("renders an assistant message as Markdown in the inspector", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  // Search reaches the assistant text node by its summary, then renders it through the shared Markdown.
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

  await page.getByRole("button", { name: "Toggle graph view" }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")

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

  await openMenu(page, "show")
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
  await page.locator(toolbar).getByRole("button", { name: "Show the log beside the map" }).click()

  const hybrid = page.locator('[data-slot="session-graph-panel"]')
  await expect(hybrid).toBeVisible()
  await expect(hybrid).toHaveAttribute("data-arrangement", "stacked")
  await expect(page.locator('[data-slot="session-graph-panel-map"]')).toBeVisible()
  await expect(page.locator('[data-slot="session-graph-panel-log"]')).toBeVisible()
  // The log is still the log, and the map is still the map.
  await expect(
    page.locator(
      '[data-slot="session-graph-panel-log"] [data-timeline-row="UserMessage"][data-message-id="msg_user_1"]',
    ),
  ).toBeVisible()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")

  // The arrangement is the reader's choice, and it lives in the map's own Draw menu.
  await openMenu(page, "draw")
  await page.locator(toolbar).getByRole("button", { name: "Beside the log" }).click()
  await expect(hybrid).toHaveAttribute("data-arrangement", "side")

  await openMenu(page, "draw")
  await page.locator(toolbar).getByRole("button", { name: "Over the log" }).click()
  await expect(hybrid).toHaveAttribute("data-arrangement", "floating")
  await expect(page.locator('[data-slot="session-graph-panel-pane-bar"]')).toBeVisible()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")

  expect(errors).toEqual([])
})

test("picking a node in the map moves the log to it", async ({ page }) => {
  const errors = trackPageErrors(page)
  // A long transcript, so the log has somewhere to move.
  const items = [...historyMessages(20), ...buildFixtureMessages()]
  await openSession(page, { ...graphFixture(), pageMessages: () => ({ items }) })
  await page.getByRole("button", { name: "Toggle graph view" }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await page.locator(toolbar).getByRole("button", { name: "Show the log beside the map" }).click()
  await expect(page.locator('[data-slot="session-graph-panel"]')).toBeVisible()

  const scroller = page.locator('[data-slot="session-graph-panel-log"] .scroll-view__viewport')
  const before = await scroller.evaluate((element) => element.scrollTop)
  expect(before).toBeGreaterThan(0)

  // The oldest turn's answer, picked in the map.
  await page.getByRole("button", { name: "Search the graph" }).click()
  const search = page.getByRole("dialog", { name: "Search the graph" })
  await search.getByRole("combobox").fill("Fix the authentication test failures")
  await search.locator('[data-node-id="msg:msg_user_1"]').click()

  // The log followed the map.
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollTop))
    .toBeLessThan(before)
  await expect(
    page.locator(
      '[data-slot="session-graph-panel-log"] [data-timeline-row="UserMessage"][data-message-id="msg_user_1"]',
    ),
  ).toBeVisible()

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
  await page.getByRole("button", { name: "Toggle graph view" }).click()
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
  await page.getByRole("button", { name: "Toggle graph view" }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await expect(readout).toContainText("1 interaction")

  // So is opening the search.
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

  await page.getByRole("button", { name: "Toggle graph view" }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await page.getByRole("button", { name: "Toggle graph view" }).click()
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
  await expect(page.locator(toolbar).locator("button", { hasText: "Orbit" })).toBeDisabled()
})

test("returns to the transcript when no renderer can mount", async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_BUILD === "1", "intercepts dev-server module URLs; built chunks are hashed")
  await page.route(/spacegraph-renderer\/dist\/index/, (route) => route.abort())
  await page.route(/cytoscape-renderer\/dist\/index/, (route) => route.abort())
  await openSession(page, graphFixture())
  await page.getByRole("button", { name: "Toggle graph view" }).click()

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

  await page.getByRole("button", { name: "Toggle graph view" }).click()
  await expect(page.getByText("Couldn't open the graph view")).toBeVisible()

  await page.getByRole("button", { name: "Back to transcript" }).click()
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable()
  await expect(page.locator(canvasHost)).toHaveCount(0)
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

  // The right button belongs to the camera: the view follows the cursor.
  await page.mouse.move(host.x + host.width - 40, host.y + host.height - 40)
  await page.mouse.down({ button: "right" })
  await page.mouse.move(host.x + host.width - 140, host.y + host.height - 140, { steps: 10 })
  await page.mouse.up({ button: "right" })

  await expect
    .poll(async () => Math.round(Math.abs(((await card.boundingBox())?.x ?? 0) - (before?.x ?? 0))))
    .toBeGreaterThan(20)

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

  await openMenu(page, "draw")
  await page.locator('[data-slot="graph-layout-option"][data-strategy="timeline"]').click()

  // The card is still the card: the model rebuilt it, and its styling came with it.
  await expect.poll(styling).toEqual(before)

  expect(errors).toEqual([])
})
