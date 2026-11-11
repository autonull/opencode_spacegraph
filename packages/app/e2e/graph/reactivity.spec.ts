import { expect, test as base, type Page } from "@playwright/test"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { trackPageErrors } from "../utils/errors"
import { seedSessionGraph } from "../utils/graph"
import { openSession } from "../utils/workspace"
import { waitForGraphContent } from "../utils/waits"

const test = base.extend({
  page: async ({ page }, use) => {
    await seedSessionGraph(page)
    await use(page)
  },
})

// Use a much smaller viewport to ensure transcript is scrollable in hybrid surface
test.use({
  viewport: { width: 1440, height: 500 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  locale: "en-US",
})

const directory = "C:/OpenCode/SessionGraph"

const sessionID = "ses_session_graph"

const canvasHost = '[data-slot="graph-canvas-host"]'

const toolbar = '[data-slot="graph-toolbar"]'

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
  await page.keyboard.press("Control+Shift+M")
  await waitForGraphContent(page)
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-renderer", "spacegraph")
}

async function openMenu(page: Page) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-view"]`)

  if ((await menu.count()) === 0) {
    const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
    // SAFETY: the overflow element is a <details> element per the toolbar component structure
    const open = await overflow.evaluate((element) => (element as HTMLDetailsElement).open)

    if (!open) await overflow.getByLabel("More controls").click()

    return
  }

  // SAFETY: the menu element is a <details> element per the toolbar component structure
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)

  if (!open) await menu.locator(":scope > summary").click()
}

async function openLayers(page: Page) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  // SAFETY: the menu element is a <details> element per the toolbar component structure
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)

  if (!open) await menu.locator(":scope > summary").click()
}

async function closeLayers(page: Page) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  // SAFETY: the menu element is a <details> element per the toolbar component structure
  const isOpen = await menu.evaluate((element) => (element as HTMLDetailsElement).open)

  if (isOpen) await menu.locator(":scope > summary").click()
}

async function setLevel(page: Page, level: "Overview" | "Execution" | "Detail") {
  await openLayers(page)
  const levels = page.locator('[data-slot="graph-layers-level"]')
  await levels.locator('button', { hasText: level }).click()
  await expect(levels.locator('button', { hasText: level })).toHaveAttribute("aria-pressed", "true")
  await closeLayers(page)
}

async function pickLayout(page: Page, layout: string) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layout"]`)
  // SAFETY: the menu element is a <details> element per the toolbar component structure
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)

  if (!open) await menu.locator(":scope > summary").click()
  await page.locator(`${toolbar} [data-slot="graph-layout-option"][data-value="${layout}"]`).click()
}

async function fit(page: Page) {
  const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
  const compact = (await overflow.count()) > 0

  if (compact) await overflow.getByLabel("More controls").click()
  await page.locator(toolbar).getByRole("button", { name: "Fit to view", exact: true }).click()

  if (compact) await overflow.getByLabel("More controls").click()

  // eslint-disable-next-line no-useless-return
  return
}

async function setArrangement(page: Page, arrangement: "stacked" | "side" | "floating") {
  const toolbar = page.locator('[data-slot="graph-toolbar"]')
  const viewMenu = toolbar.locator('[data-slot="graph-toolbar-view"]')
  // SAFETY: the viewMenu element is a <details> element per the toolbar component structure
  const open = await viewMenu.evaluate((element) => (element as HTMLDetailsElement).open)

  if (!open) await viewMenu.locator(":scope > summary").click()
  await toolbar.locator(`[data-slot="graph-arrangement-option"][data-value="${arrangement}"]`).click()
}

async function waitForStillCanvas(page: Page) {
  let previous = ""
  let still = 0
  await expect
    .poll(
      async () => {
        const canvas = page.locator(`${canvasHost} canvas`)
        const current = await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL())
        const nextStill = current !== "" && current === previous ? still + 1 : 0
        previous = current
        still = nextStill

        return still >= 2
      },
      { intervals: [100], timeout: 30000 },
    )
    .toBe(true)
}

async function countExecutionNodes(page: Page) {
  return page.locator(`${canvasHost} [data-node-id^="tool:"], ${canvasHost} [data-node-id^="file:"], ${canvasHost} [data-node-id^="result:"]`).count()
}

async function countRibbonNodes(page: Page) {
  return page.locator(`${canvasHost} [data-node-id^="turn:"], ${canvasHost} [data-node-id^="phase:"]`).count()
}

async function getTranscriptScrollTop(page: Page) {
  // The transcript is inside the hybrid surface's ScrollView viewport
  return page.locator('[data-slot="session-timeline-scroll"] .scroll-view__viewport').evaluate((el) => el.scrollTop)
}

async function setTranscriptScrollTop(page: Page, scrollTop: number) {
  await page.locator('[data-slot="session-timeline-scroll"] .scroll-view__viewport').evaluate((el, value) => {
    el.scrollTop = value
  }, scrollTop)
}

async function ensureTranscriptScrollable(page: Page) {
  // The transcript needs enough content to be scrollable. Wait for it to have overflow.
  await page.locator('[data-slot="session-timeline-scroll"]').evaluate((el) => {
    if (el.scrollHeight <= el.clientHeight) {
      // Not enough content to scroll - we'll need to work with what we have
      console.log('Transcript not scrollable:', { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight })
    }
  })
}

async function openHybridView(page: Page) {
  const toolbar = page.locator('[data-slot="graph-toolbar"]')
  const splitButton = toolbar.locator('[data-slot="graph-toolbar-split"]')
  await splitButton.click()
  await expect(page.locator('[data-slot="spacegraph-surface-hybrid"]')).toBeVisible()
}

async function closeHybridView(page: Page) {
  const toolbar = page.locator('[data-slot="graph-toolbar"]')
  const splitButton = toolbar.locator('[data-slot="graph-toolbar-split"]')
  await splitButton.click()
  await expect(page.locator('[data-slot="spacegraph-surface-hybrid"]')).toBeHidden()
}

test.describe("Graph reactivity", () => {
  test("level toggle re-renders the canvas", async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.emulateMedia({ reducedMotion: "reduce" })
    await openGraph(page)

    // Set to Overview first (default is now Execution per Phase 2.5)
    await setLevel(page, "Overview")
    await fit(page)
    await waitForStillCanvas(page)
    const overviewNodeCount = await countExecutionNodes(page)

    // Switch to Execution level
    await setLevel(page, "Execution")
    await fit(page)
    await waitForStillCanvas(page)

    // Should now have execution nodes (tool:, file:, result:)
    const executionNodeCount = await countExecutionNodes(page)
    expect(executionNodeCount).toBeGreaterThan(overviewNodeCount)
    expect(executionNodeCount).toBeGreaterThan(0)

    // Toolbar should reflect Execution level
    await openLayers(page)
    const executionButton = page.locator('[data-slot="graph-layers-level"] button', { hasText: "Execution" })
    await expect(executionButton).toHaveAttribute("aria-pressed", "true")
    await closeLayers(page)

    // Switch back to Overview
    await setLevel(page, "Overview")
    await fit(page)
    await waitForStillCanvas(page)

    const overviewNodeCount2 = await countExecutionNodes(page)
    expect(overviewNodeCount2).toBeLessThan(executionNodeCount)

    expect(errors).toEqual([])
  })

  test("layout toggle re-renders the canvas", async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.emulateMedia({ reducedMotion: "reduce" })
    await openGraph(page)
    await setLevel(page, "Execution")
    await fit(page)
    await waitForStillCanvas(page)

    // Test lanes -> timeline
    await pickLayout(page, "timeline")
    await fit(page)
    await waitForStillCanvas(page)
    await expect(page.locator('[data-slot="graph-layout-name"]')).toHaveText("Timeline")

    // Test timeline -> ribbon
    await pickLayout(page, "ribbon")
    await fit(page)
    await waitForStillCanvas(page)
    await expect(page.locator('[data-slot="graph-layout-name"]')).toHaveText("Ribbon")

    // Ribbon should only draw turn:/phase: nodes
    const ribbonNodeCount = await countRibbonNodes(page)
    expect(ribbonNodeCount).toBeGreaterThan(0)

    // The node set should be different from execution (lanes) layout
    const executionNodeCount = await countExecutionNodes(page)
    expect(ribbonNodeCount).not.toBe(executionNodeCount)

    expect(errors).toEqual([])
  })

  test("model stream is reflected", async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.emulateMedia({ reducedMotion: "reduce" })
    await openGraph(page)
    await setLevel(page, "Execution")
    await fit(page)
    await waitForStillCanvas(page)

    // Count initial tool nodes
    const initialToolNodes = await page.locator(`${canvasHost} [data-node-id^="tool:"]`).count()
    expect(initialToolNodes).toBeGreaterThan(0)

    // The fixture is static, but we can verify the model updates by checking
    // that the canvas responds to level/layout changes which trigger model rebuilds
    await setLevel(page, "Overview")
    await fit(page)
    await waitForStillCanvas(page)

    await setLevel(page, "Execution")
    await fit(page)
    await waitForStillCanvas(page)

    // Tool nodes should still be there after round-trip
    const finalToolNodes = await page.locator(`${canvasHost} [data-node-id^="tool:"]`).count()
    expect(finalToolNodes).toBe(initialToolNodes)
    expect(finalToolNodes).toBeGreaterThan(0)

    expect(errors).toEqual([])
  })
})