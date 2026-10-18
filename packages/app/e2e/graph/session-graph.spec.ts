import { expect, test, type Page } from "@playwright/test"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { sessionHref } from "../utils/app"
import { trackPageErrors } from "../utils/errors"
import { assistantMessage, partUpdated, setupTimeline, stepStarted, toolPart } from "../utils/timeline"
import { openSession } from "../utils/workspace"

const directory = "C:/OpenCode/SessionGraph"

const sessionID = "ses_session_graph"

const canvasHost = '[data-slot="graph-canvas-host"]'

const toolbar = '[data-slot="graph-toolbar"]'

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

test("selects a node from search and inspects it in the DOM panel", async ({ page }) => {
  const errors = trackPageErrors(page)
  await openGraph(page, graphFixture())

  await page.getByRole("button", { name: "Search the graph" }).click()
  const search = page.getByRole("dialog", { name: "Search the graph" })
  await search.getByRole("textbox").fill("token.ts")
  await search.getByRole("button", { name: "src/auth/token.ts", exact: true }).click()

  const panel = page.locator(inspector)
  await expect(panel.getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible()
  await expect(panel.getByText("File", { exact: true })).toBeVisible()

  expect(errors).toEqual([])
})

test("appends a node from a live event without losing the selection", async ({ page }) => {
  const errors = trackPageErrors(page)
  const timeline = await setupTimeline(page, { sessionMessages: buildFixtureMessages() })
  await page.getByRole("button", { name: "Toggle graph view" }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")

  await page.getByRole("button", { name: "Search the graph" }).click()
  const search = page.getByRole("dialog", { name: "Search the graph" })
  await search.getByRole("textbox").fill("token.ts")
  await search.getByRole("button", { name: "src/auth/token.ts", exact: true }).click()

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
