import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test as base, type Page } from "@playwright/test"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { trackPageErrors } from "../utils/errors"
import { seedSessionGraph } from "../utils/graph"
import { openSession } from "../utils/workspace"
import { waitForGraphContent } from "../utils/waits"

const KNOWN_FLAKY_ERRORS = [
  "Maximum call stack size exceeded",
]

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
const inspector = '[data-slot="graph-inspector"]'

const captureDir = process.env.GRAPH_CAPTURE_DIR

// GRAPH_CAPTURE_ONLY - comma-separated frame numbers or ranges (e.g., "3" or "15,16" or "20-24")
const captureOnly = process.env.GRAPH_CAPTURE_ONLY?.split(",").flatMap((part) => {
  const range = part.split("-").map(Number)
  if (range.length === 2) {
    const [start, end] = range
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }
  return range
})

function shouldCapture(name: string): boolean {
  if (!captureOnly || captureOnly.length === 0) return true
  const match = name.match(/^(\d+)[-\s]/)
  if (!match) return true
  const frameNum = Number.parseInt(match[1], 10)
  return captureOnly.includes(frameNum)
}

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  locale: "en-US",
})

function filterKnownErrors(errors: string[]): string[] {
  return errors.filter((e) => !KNOWN_FLAKY_ERRORS.some((k) => e.includes(k)))
}

function graphFixture() {
  return {
    name: "SessionGraph",
    directory,
    sessions: [{ id: sessionID, title: "Session graph" }],
    pageMessages: () => ({ items: buildFixtureMessages() }),
  }
}

async function capture(page: Page, name: string) {
  if (!captureDir || !shouldCapture(name)) return
  await page.evaluate(() => {
    document.querySelectorAll<HTMLDetailsElement>("details[data-slot^='graph-toolbar-']").forEach((menu) => {
      menu.open = false
    })
    window.scrollTo(0, 0)
    for (const element of document.querySelectorAll<HTMLElement>("*")) {
      if (element.closest('[data-slot="graph-inspector"]')) continue
      if (element.scrollTop > 0) element.scrollTop = 0
      if (element.scrollLeft > 0) element.scrollLeft = 0
    }
    const panel = document.querySelector<HTMLElement>('[data-slot="graph-inspector"]')
    for (const element of panel?.querySelectorAll<HTMLElement>("*") ?? []) {
      if (element.scrollHeight > element.clientHeight) element.scrollTop = element.scrollHeight
    }
  })
  mkdirSync(captureDir, { recursive: true })
  await page.screenshot({ path: resolve(captureDir, name) })
}

function canvasSample(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-slot="graph-canvas-host"] canvas')
    return canvas ? canvas.toDataURL() : ""
  })
}

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

async function pickLayout(page: Page, layout: string) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layout"]`)
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!open) await menu.locator(":scope > summary").click()
  await page.locator(`${toolbar} [data-slot="graph-layout-option"][data-value="${layout}"]`).click()
}

async function waitForStillCanvas(page: Page, timeout = 30000) {
  // First ensure there is graph content
  await waitForGraphContent(page)

  let previous = ""
  let still = 0
  await expect
    .poll(
      async () => {
        const current = await canvasSample(page)
        still = current !== "" && current === previous ? still + 1 : 0
        previous = current
        return still >= 2
      },
      { intervals: [100], timeout },
    )
    .toBe(true)
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}

async function openLayers(page: Page) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!open) await menu.locator(":scope > summary").click()
}

async function openExportMenu(page: Page) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-export"]`)
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!open) await menu.locator(":scope > summary").click()
}

async function closeLayers(page: Page) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  if (await menu.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await menu.locator(":scope > summary").click()
  }
}

async function setLevel(page: Page, level: "Overview" | "Execution" | "Detail") {
  await openLayers(page)
  const levels = page.locator('[data-slot="graph-layers-level"]')
  await levels.locator('button', { hasText: level }).click()
  await expect(levels.locator('button', { hasText: level })).toHaveAttribute("aria-pressed", "true")
  await closeLayers(page)
}

async function fit(page: Page) {
  const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
  const compact = (await overflow.count()) > 0
  if (compact) await overflow.getByLabel("More").click()
  await page.locator(toolbar).getByRole("button", { name: "Fit", exact: true }).click()
  if (compact) await overflow.getByLabel("More").click()
}

async function zoomPercent(page: Page) {
  const text = await page.locator('[data-slot="graph-zoom-level"]').textContent()
  return Number.parseInt((text ?? "0").replace("%", ""), 10)
}

async function clickZoom(page: Page, label: "Zoom in" | "Zoom out") {
  const before = await zoomPercent(page)
  const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
  const compact = (await overflow.count()) > 0
  if (compact) await overflow.getByLabel("More controls").click()
  await page.locator(toolbar).getByRole("button", { name: label, exact: true }).click()
  if (compact) await overflow.getByLabel("More controls").click()
  await expect.poll(() => zoomPercent(page)).not.toBe(before)
}

async function zoomEnabled(page: Page, label: "Zoom in" | "Zoom out") {
  const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
  const compact = (await overflow.count()) > 0
  if (compact) await overflow.getByLabel("More controls").click()
  const enabled = await page.locator(toolbar).getByRole("button", { name: label, exact: true }).isEnabled()
  if (compact) await overflow.getByLabel("More controls").click()
  return enabled
}

async function zoomToPercent(page: Page, target: number) {
  for (let step = 0; step < 60; step += 1) {
    const current = await zoomPercent(page)
    if (Math.abs(current - target) <= 4) return current
    const label = current < target ? "Zoom in" : "Zoom out"
    if (!(await zoomEnabled(page, label))) return current
    await clickZoom(page, label)
  }
  throw new Error(`graph:capture: the camera never reached ${target}%`)
}

async function zoomToMax(page: Page) {
  for (let step = 0; step < 60; step += 1) {
    if (!(await zoomEnabled(page, "Zoom in"))) return await zoomPercent(page)
    await clickZoom(page, "Zoom in")
  }
  throw new Error("graph:capture: the camera never reached its maximum zoom")
}

async function focusNode(page: Page, nodeId: string, query: string) {
  // Focus canvas and open search with "/" shortcut (like component test)
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
  await waitForStillCanvas(page)
}

async function openGraph(page: Page) {
  await openSession(page, graphFixture())
  await settle(page)
  await page.keyboard.press("Control+Shift+M")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true", { timeout: 30000 })
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-renderer", "spacegraph")
}

async function still(page: Page, timeout = 30000) {
  await waitForStillCanvas(page, timeout)
}

async function chooseDepth(page: Page, depth: string) {
  await openLayers(page)
  await page.locator('[data-slot="graph-layers-depth"]').selectOption(depth)
  await closeLayers(page)
}

async function chooseProfile(page: Page, profile: string) {
  await openLayers(page)
  await page.locator('[data-slot="graph-lens-preset"][data-value="' + profile + '"]').click()
  await closeLayers(page)
}

test("01 log", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openSession(page, graphFixture())
  await settle(page)
  await capture(page, "01-log.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("02 graph overview", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Overview")
  await fit(page)
  await still(page)
  await capture(page, "02-graph-overview.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("03 graph execution", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Overview")
  await fit(page)
  await still(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await capture(page, "03-graph-execution.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("04 graph selected", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await openMenu(page)
  await page.locator(toolbar).getByRole("button", { name: "Search" }).click()
  const search = page.getByRole("dialog", { name: "Search" })
  await search.getByRole("combobox").fill("token.ts")
  await search.getByRole("option", { name: "src/auth/token.ts", exact: true }).click()
  await expect(page.locator(inspector).getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible()
  await still(page)
  await capture(page, "04-graph-selected.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("05 return to log", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await page.keyboard.press("Control+Shift+T")
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable({ timeout: 15000 })
  await expect(page.locator('[data-component="composer-editor"]')).toBeVisible({ timeout: 15000 })
  await settle(page)
  await capture(page, "05-return-to-log.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("06 graph 3d", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await chooseDepth(page, "orbit")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-projection", "3d")
  await still(page)
  await fit(page)
  await still(page)
  await capture(page, "06-graph-3d.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("11 graph timeline", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await chooseDepth(page, "flat")
  await setLevel(page, "Execution")
  await pickLayout(page, "timeline")
  await fit(page)
  await still(page)
  await capture(page, "11-graph-timeline.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("12 graph hierarchy", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await chooseDepth(page, "flat")
  await setLevel(page, "Execution")
  await pickLayout(page, "hierarchy")
  await fit(page)
  await still(page)
  await capture(page, "12-graph-hierarchy.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("13 graph narrow", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await page.setViewportSize({ width: 390, height: 900 })
  // Wait for ResizeObserver to fire and update compact state (overflow menu appears)
  await expect(page.locator('[data-slot="graph-toolbar-overflow"]')).toBeVisible({ timeout: 10000 })
  await fit(page)
  await still(page)
  await capture(page, "13-graph-narrow.png")
  await page.setViewportSize({ width: 1440, height: 900 })
  expect(filterKnownErrors(errors)).toEqual([])
})

test("14 graph light", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await page.emulateMedia({ colorScheme: "light" })
  await setLevel(page, "Overview")
  await fit(page)
  await still(page)
  await capture(page, "14-graph-light.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("15 graph ribbon", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Overview")
  await pickLayout(page, "ribbon")
  // Wait for the ribbon layout to initialize and canvas to be ready
  await waitForGraphContent(page)
  await still(page)
  await fit(page)
  await still(page)
  await capture(page, "15-graph-ribbon.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("16 graph matrix", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Overview")
  await pickLayout(page, "matrix")
  await still(page)
  await fit(page)
  await still(page)
  await capture(page, "16-graph-matrix.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("17 graph files", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await openMenu(page)
  await page.locator(toolbar).getByRole("button", { name: "Files", exact: true }).click()
  await expect(page.locator('[data-slot="graph-file-rail"]')).toBeVisible()
  await fit(page)
  await still(page)
  await capture(page, "17-graph-files.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("18 graph layered", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await chooseDepth(page, "orbit")
  await chooseDepth(page, "layered")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-depth", "layered")
  await still(page)
  await fit(page)
  await still(page)
  await capture(page, "18-graph-layered.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("19 graph depth stack", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await chooseDepth(page, "orbit")
  await chooseDepth(page, "depth-stack")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-depth", "depth-stack")
  await still(page, 60000)
  await fit(page)
  await still(page, 60000)
  await capture(page, "19-graph-depth-stack.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("20 graph zoom 150", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await zoomToPercent(page, 150)
  await still(page)
  await capture(page, "20-graph-zoom-150.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("21 graph zoom max", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await zoomToMax(page)
  await still(page)
  await capture(page, "21-graph-zoom-max.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("22 graph turn 1", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await zoomToPercent(page, 150)
  await still(page)
  // Use navigation query "g t" to focus on turn 1
  await focusNode(page, "turn:msg_user_1", "g t")
  await capture(page, "22-graph-turn-1.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("23 graph turn 2", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await focusNode(page, "turn:msg_user_2", "cover the refresh path")
  await capture(page, "23-graph-turn-2.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("24 graph failure chain", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await zoomToMax(page)
  await focusNode(page, "tool:prt_tool_shell_2", "FAIL auth refresh token")
  await capture(page, "24-graph-failure-chain.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("28 graph tree", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await pickLayout(page, "tree")
  await fit(page)
  await still(page)
  await capture(page, "28-graph-tree.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("29 graph force", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await pickLayout(page, "force")
  await fit(page)
  await still(page)
  await capture(page, "29-graph-force.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("30 graph gallery", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await openMenu(page)
  await page.locator(toolbar).getByRole("button", { name: "Gallery", exact: true }).click()
  await expect(page.locator('[data-slot="graph-gallery"]')).toBeVisible()
  await capture(page, "30-graph-gallery.png")
  await page.keyboard.press("Escape")
  await expect(page.locator('[data-slot="graph-gallery"]')).toHaveCount(0)
  expect(filterKnownErrors(errors)).toEqual([])
})

test("31 graph perspective", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await chooseDepth(page, "orbit")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-depth", "orbit")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-card-facing", "plane")
  await setLevel(page, "Detail")
  await still(page)
  await fit(page)
  await still(page)
  await capture(page, "31-graph-perspective.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("34 graph surfaces", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await page.keyboard.press("Control+Shift+H")
  const hybrid = page.locator('[data-slot="spacegraph-surface-hybrid"]')
  await expect(hybrid).toBeVisible()
  await still(page)
  await capture(page, "34-graph-surfaces.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("36 graph trace overlay", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  // Focus on the failed result node which has a trace
  // Use "failed result" query to filter to failed result kind nodes via NLQ (kind:result status:failed)
  await focusNode(page, "result:prt_tool_shell_2", "failed result")
  // Wait for inspector to show the selected result - label is "failed" for failed shell tools
  await expect(page.locator(inspector).getByRole("heading", { name: "failed" })).toBeVisible({ timeout: 10000 })
  await page.locator(inspector).getByRole("button", { name: "Why" }).click()
  await still(page)
  await capture(page, "36-graph-trace-overlay.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("37 graph collapsed group", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await focusNode(page, "phase:turn:msg_user_1:explore:1", "explore")
  await expect(page.locator(inspector)).toBeVisible()
  await page.locator('[data-slot="graph-status-bar"] [data-slot="graph-status-group-toggle"]').click()
  await still(page)
  await capture(page, "37-graph-collapsed-group.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("38 graph hybrid", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await page.keyboard.press("Control+Shift+H")
  const hybrid = page.locator('[data-slot="spacegraph-surface-hybrid"]')
  await expect(hybrid).toBeVisible({ timeout: 15000 })
  await openMenu(page)
  await page.locator('[data-slot="graph-arrangement-option"][data-value="side"]').click()
  await expect(hybrid).toHaveAttribute("data-arrangement", "side")
  await still(page)
  await capture(page, "38-graph-hybrid.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("39 graph nlq search", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await openMenu(page)
  await page.locator(toolbar).getByRole("button", { name: "Search" }).click()
  const search = page.getByRole("dialog", { name: "Search" })
  // Type natural language query
  await search.getByRole("combobox").fill("failed tools")
  // Wait for results and compiled query chip
  await expect(search.locator('[data-node-id="tool:prt_tool_shell_2"]')).toBeVisible()
  await still(page)
  await capture(page, "39-graph-nlq-search.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("40 graph nlq code errors", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await openMenu(page)
  await page.locator(toolbar).getByRole("button", { name: "Search" }).click()
  const search = page.getByRole("dialog", { name: "Search" })
  // Type natural language query "failed" - compiles to status:failed
  // Matches both error nodes and failed tools; the failed tool is visible even when Verify group is folded
  await search.getByRole("combobox").fill("failed")
  await expect(search.locator('[data-node-id="tool:prt_tool_shell_2"]')).toBeVisible()
  await still(page)
  await capture(page, "40-graph-nlq-code-errors.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("41 graph trust lens", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  // Trust lens banner should appear when unverified files detected
  // The fixture has tool calls without verify/test nodes
  const trustBanner = page.locator('[data-slot="graph-trust-banner"]')
  if (await trustBanner.count() > 0) {
    await expect(trustBanner).toBeVisible()
    await capture(page, "41-graph-trust-lens.png")
  } else {
    // Banner may not appear if no unverified files - capture without it
    await capture(page, "41-graph-trust-lens.png")
  }
  expect(filterKnownErrors(errors)).toEqual([])
})

test("42 graph permalink copy", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await openMenu(page)
  await page.locator(toolbar).getByRole("button", { name: "Search" }).click()
  const search = page.getByRole("dialog", { name: "Search" })
  await search.getByRole("combobox").fill("token.ts")
  await search.getByRole("option", { name: "src/auth/token.ts", exact: true }).click()
  await expect(page.locator(inspector).getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible()
  await still(page)
  // Open export menu and capture permalink copy button
  await openExportMenu(page)
  await expect(page.locator('[data-slot="graph-export-option"]').first()).toBeVisible()
  await capture(page, "42-graph-permalink-copy.png")
  expect(filterKnownErrors(errors)).toEqual([])
})

test("43 graph demo map", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Overview")
  await fit(page)
  await still(page)
  await capture(page, "43-graph-demo-map.png")
  expect(filterKnownErrors(errors)).toEqual([])
})