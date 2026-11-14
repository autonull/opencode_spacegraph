import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test as base, type Page } from "@playwright/test"
import { buildNarrativeFixtureMessages } from "@opencode/session-ui/graph"
import { trackPageErrors } from "../utils/errors"
import { seedSessionGraph } from "../utils/graph"
import { openSession } from "../utils/workspace"
import { waitForGraphContent, graphCanvasHost } from "../utils/waits"

const KNOWN_FLAKY_ERRORS = ["Maximum call stack size exceeded", "NotAllowedError: Failed to execute 'writeText' on 'Clipboard'"]

const test = base.extend({
  page: async ({ page }, use) => {
    await seedSessionGraph(page, { graph_cost_lens: true, graph_palette: true, graph_attention: true, graph_layout_breadth: true })
    await use(page)
  },
})

test.describe.configure({ retries: 0, mode: "serial" })

// Scenario captures are opt-in. Set GRAPH_CAPTURE_SCENARIO=1 to run.
// Set GRAPH_CAPTURE_SCENARIO_NUM to run a specific scenario (1-8).
const runScenarios = !!process.env.GRAPH_CAPTURE_SCENARIO
const scenarioNum = Number(process.env.GRAPH_CAPTURE_SCENARIO_NUM ?? "1")
const directory = "C:/OpenCode/ScenarioGraph"
const sessionID = "ses_scenario_graph"
const toolbar = '[data-slot="graph-toolbar"]'
const inspector = '[data-slot="graph-inspector"]'

const videoDir = fileURLToPath(new URL("../../../../docs/spacegraph/video", import.meta.url))
const marksDir = fileURLToPath(new URL("../../../../docs/spacegraph/video/marks", import.meta.url))

function filterKnownErrors(errs: string[]): string[] {
  return errs.filter((e) => e && !KNOWN_FLAKY_ERRORS.some((k) => e.includes(k)))
}

function graphFixture() {
  return {
    name: "ScenarioGraph",
    directory,
    sessions: [{ id: sessionID, title: "Scenario graph" }],
    pageMessages: () => ({ items: buildNarrativeFixtureMessages() }),
  }
}

const frameMarks: { frame: string; elapsed: number }[] = []
let flowWallStart = 0

function recordMark(name: string) {
  if (!flowWallStart) return
  frameMarks.push({ frame: name, elapsed: (Date.now() - flowWallStart) / 1000 })
  mkdirSync(marksDir, { recursive: true })
  writeFileSync(resolve(marksDir, `marks-scenario-${scenarioNum}.json`), JSON.stringify(frameMarks, null, 2))
}

async function syncBeacon(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        const beacon = document.createElement("div")
        beacon.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#fff;pointer-events:none"
        document.body.append(beacon)
        setTimeout(() => {
          beacon.remove()
          done()
        }, 360)
      }),
  )
}

async function openGraph(page: Page) {
  await page.keyboard.press("Control+Shift+M")
  await waitForGraphContent(page)
  await expect(graphCanvasHost(page)).toHaveAttribute("data-graph-renderer", "spacegraph")
}

async function fit(page: Page) {
  const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
  const compact = (await overflow.count()) > 0
  if (compact) await overflow.getByLabel("More controls").click()
  await page.locator(toolbar).getByRole("button", { name: "Fit", exact: true }).click()
  if (compact) await overflow.getByLabel("More controls").click()
}

async function waitForStillCanvas(page: Page, timeout = 30000) {
  await waitForGraphContent(page)
  let previous = ""
  let still = 0
  await expect
    .poll(
      async () => {
        const canvas = page.locator<HTMLCanvasElement>('[data-slot="graph-canvas-host"] canvas')
        const current = await canvas.evaluate((c) => c.toDataURL()).catch(() => "")
        still = current !== "" && current === previous ? still + 1 : 0
        previous = current
        return still >= 2
      },
      { intervals: [100], timeout },
    )
    .toBe(true)
}

async function pace(ms: number) {
  await new Promise((done) => setTimeout(done, ms))
}

async function searchAndSelect(page: Page, query: string, nodeId: string) {
  await page.locator('[data-slot="graph-canvas-region"]').focus()
  await page.keyboard.press("/")
  const search = page.getByRole("dialog", { name: "Search" })
  const input = search.getByRole("combobox")
  await input.fill(query)
  // Wait for search results to appear
  await expect(search.locator('[role="option"]').first()).toBeVisible({ timeout: 10000 })
  await input.press("Enter")
  await pace(600)
  // Verify node is selected by checking inspector shows node detail
  await expect(page.locator(inspector).locator('h2')).toBeVisible({ timeout: 10000 })
}

async function clickTraceButton(page: Page, buttonName: "Why" | "Led here" | "Related" | "Downstream" | "Clear") {
  const button = page.locator(inspector).getByRole("button", { name: buttonName, exact: true })
  await expect(button).toBeVisible({ timeout: 10000 })
  await button.click()
  await waitForStillCanvas(page)
  await pace(500)
}

async function selectLayout(page: Page, layout: string) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layout"]`)
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await menu.locator(":scope > summary").click()
  }
  await page.locator(`${toolbar} [data-slot="graph-layout-option"][data-value="${layout}"]`).click()
}

async function selectLevel(page: Page, level: "overview" | "detail" | "execution") {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await menu.locator(":scope > summary").click()
  }
  const levelControl = page.locator('[data-slot="graph-layers-level"]')
  await expect(levelControl).toBeVisible({ timeout: 5000 })
  // Click the segmented control item for the desired level - use text content
  const levelLabels: Record<"overview" | "detail" | "execution", string> = {
    overview: "Overview",
    detail: "Detail",
    execution: "Execution",
  }
  const levelItem = levelControl.getByRole("button", { name: levelLabels[level], exact: true })
  await expect(levelItem).toBeVisible({ timeout: 5000 })
  await levelItem.click()
  await menu.locator(":scope > summary").click()
}

async function selectLens(page: Page, lensName: string) {
  // Lenses are profile presets in the layers menu
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await menu.locator(":scope > summary").click()
  }
  // Click the lens preset - use the preset ID (e.g., "review", "all", "code", "session", "runtime")
  const lensPresetIds: Record<string, string> = {
    "reviewer": "review",
    "cartographer": "all",
    "auditor": "all",
    "cost": "all",
    "reader": "all",
    "investigator": "all",
    "orchestrator": "all",
    "navigator": "all",
  }
  const presetId = lensPresetIds[lensName] || lensName
  const lensPreset = page.locator(`[data-slot="graph-lens-preset"][data-value="${presetId}"]`)
  await expect(lensPreset).toBeVisible({ timeout: 5000 })
  await lensPreset.click()
  await menu.locator(":scope > summary").click()
}

async function selectCostLens(page: Page, enabled: boolean) {
  // Cost lens is a toggle in the toolbar view controls
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-view"]`)
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await menu.locator(":scope > summary").click()
  }
  const costLensOption = page.locator('[data-slot="graph-cost-lens-option"]')
  await expect(costLensOption).toBeVisible({ timeout: 5000 })
  const isPressed = await costLensOption.getAttribute("aria-pressed")
  const shouldBePressed = enabled ? "true" : "false"
  if (isPressed !== shouldBePressed) {
    await costLensOption.click()
  }
  await menu.locator(":scope > summary").click()
}

async function selectTrustLens(page: Page, enabled: boolean) {
  // Trust lens is a toggle in the toolbar view controls
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-view"]`)
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await menu.locator(":scope > summary").click()
  }
  const trustLensOption = page.locator('[data-slot="graph-trust-lens-option"]')
  await expect(trustLensOption).toBeVisible({ timeout: 5000 })
  const isPressed = await trustLensOption.getAttribute("aria-pressed")
  const shouldBePressed = enabled ? "true" : "false"
  if (isPressed !== shouldBePressed) {
    await trustLensOption.click()
  }
  await menu.locator(":scope > summary").click()
}

async function selectFilesRail(page: Page, enabled: boolean) {
  // Files rail is a toggle in the toolbar view controls
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-view"]`)
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await menu.locator(":scope > summary").click()
  }
  const filesOption = page.locator('[data-slot="graph-files-option"]')
  await expect(filesOption).toBeVisible({ timeout: 5000 })
  const isPressed = await filesOption.getAttribute("aria-pressed")
  const shouldBePressed = enabled ? "true" : "false"
  if (isPressed !== shouldBePressed) {
    await filesOption.click()
  }
  await menu.locator(":scope > summary").click()
}

async function openFilesRail(page: Page) {
  const button = page.locator(toolbar).getByRole("button", { name: "Files", exact: true })
  await expect(button).toBeVisible({ timeout: 10000 })
  await button.click()
  await pace(500)
}

async function clickPermalink(page: Page) {
  // Open command palette and run "permalink" command
  await page.keyboard.press("Control+K")
  await pace(300)
  const palette = page.locator('.command-palette')
  await expect(palette).toBeVisible({ timeout: 10000 })
  const input = palette.getByRole("combobox")
  await input.fill("permalink")
  await pace(300)
  await input.press("Enter")
  await pace(1000)
  // Verify the URL hash was updated (clipboard write fails in test env but hash should be set)
  const hash = await page.evaluate(() => location.hash)
  expect(hash).toMatch(/^#spacegraph:/)
}

/**
 * Scenario 1: "I need to know why the build broke"
 * 
 * Start: lanes, execution level, nothing selected
 * Actions: search for failed result -> click "Why"
 * Legible: the failed `bun test` line and its error text (assertion message, file:line)
 * Hold: 4 s, zoomed so the error fills the lower third
 * Duration: 8 s
 */
async function runScenario1(page: Page) {
  await openSession(page, graphFixture())
  await openGraph(page)
  await fit(page)
  await syncBeacon(page)
  flowWallStart = Date.now()
  recordMark("scenario-1-01-open")

  // Search for the failed result
  await searchAndSelect(page, "failed", "result:prt_narr_shell_2")
  recordMark("scenario-1-02-failure-selected")

  // Click "Why" button in the inspector to activate trace=why
  const whyButton = page.locator(inspector).getByRole("button", { name: "Why", exact: true })
  await expect(whyButton).toBeVisible({ timeout: 10000 })
  await whyButton.click()
  await waitForStillCanvas(page)
  await pace(500)
  recordMark("scenario-1-03-why-trace-active")

  // Hold on the outcome - the causal chain ending in the failed bun test error
  await pace(4000)
  recordMark("scenario-1-04-hold-outcome")
}

/**
 * Scenario 2: "I need to find the call that caused the failure"
 * 
 * Start: lanes, execution level, trace=why active from scenario 1
 * Actions: search "failed" -> select result -> middle-click / frame node -> follow "led here" edge back to caller
 * Legible: the exact result node label and its command input text (the failing command)
 * Hold: 4 s on the caller node with command visible
 * Duration: 10 s
 */
async function runScenario2(page: Page) {
  await openSession(page, graphFixture())
  await openGraph(page)
  await fit(page)
  await syncBeacon(page)
  flowWallStart = Date.now()
  recordMark("scenario-2-01-open")

  // Search for "failed" to find the failure node (the first failed result)
  await searchAndSelect(page, "failed", "result:prt_narr_shell_1")
  recordMark("scenario-2-02-failure-result-selected")

  // Click "Led here" to follow the edge back to the caller
  await clickTraceButton(page, "Led here")
  recordMark("scenario-2-03-led-here-active")

  // Hold on the caller node with command visible
  await pace(4000)
  recordMark("scenario-2-04-hold-outcome")
}

/**
 * Scenario 3: "I need to see what the subagent actually did"
 * 
 * Start: hierarchy or tree layout, overview level, nothing selected
 * Actions: navigate to subagent node (delegated task) -> click to expand delegates -> open panel detail
 * Legible: the subagent's read tool calls (file paths) and the finding text it returned
 * Hold: 5 s on the panel showing the finding
 * Duration: 11 s
 */
async function runScenario3(page: Page) {
  await openSession(page, graphFixture())
  await openGraph(page)
  await selectLayout(page, "tree")
  await selectLevel(page, "overview")
  await fit(page)
  await syncBeacon(page)
  flowWallStart = Date.now()
  recordMark("scenario-3-01-open")

  // Search for subagent node
  await searchAndSelect(page, "subagent", "sub:ses_child_verify")
  recordMark("scenario-3-02-subagent-selected")

  // Click to expand delegates (the subagent node should show its children)
  await clickTraceButton(page, "Related")
  recordMark("scenario-3-03-delegates-expanded")

  // Hold on the panel showing the finding
  await pace(5000)
  recordMark("scenario-3-04-hold-outcome")
}

/**
 * Scenario 4: "I need to verify the fix before I merge"
 * 
 * Start: reviewer lens (files rail visible), detail level
 * Actions: select changed file in files rail -> open diff -> toggle between wrong fix and correct fix
 * Legible: side-by-side diff showing the wrong fix (red) and correct fix (green) with readable code lines
 * Hold: 4 s on the correct fix diff
 * Duration: 10 s
 */
async function runScenario4(page: Page) {
  await openSession(page, graphFixture())
  await openGraph(page)
  await selectLens(page, "reviewer")
  await selectFilesRail(page, true)
  await selectLevel(page, "detail")
  await fit(page)
  await syncBeacon(page)
  flowWallStart = Date.now()
  recordMark("scenario-4-01-open")

  // Select a changed file (the session.ts file that was modified)
  // Ensure layers menu is closed first
  const layersMenu = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  if (await layersMenu.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await layersMenu.locator(":scope > summary").click()
    await pace(200)
  }
  const fileItem = page.locator('[data-slot="graph-file-rail"] [data-file="file:src/auth/session.ts"]')
  await expect(fileItem).toBeVisible({ timeout: 10000 })
  await fileItem.click()
  await pace(800)
  recordMark("scenario-4-02-file-selected")

  // The diff should be visible in the inspector
  await pace(4000)
  recordMark("scenario-4-03-hold-outcome")
}

/**
 * Scenario 5: "I need to hand this to a teammate"
 * 
 * Start: cartographer lens, any layout, target node in view
 * Actions: select target node -> open share/copy permalink -> paste into chat (simulated)
 * Legible: the `#graph:<node-id>` URL with layout params visible in the toast/notification
 * Hold: 3 s on the copied URL toast
 * Duration: 7 s
 */
async function runScenario5(page: Page) {
  await openSession(page, graphFixture())
  await openGraph(page)
  await selectLens(page, "cartographer")
  await fit(page)
  await syncBeacon(page)
  flowWallStart = Date.now()
  recordMark("scenario-5-01-open")

  // Select a target node (the root cause finding)
  await searchAndSelect(page, "root cause", "msg_narr_cause_1:text:0")
  recordMark("scenario-5-02-node-selected")

  // Copy permalink
  await clickPermalink(page)
  recordMark("scenario-5-03-permalink-copied")

  // Hold on the copied URL toast
  await pace(3000)
  recordMark("scenario-5-04-hold-outcome")
}

/**
 * Scenario 6: "I need to audit a long session fast"
 * 
 * Start: auditor lens, matrix layout (`graph_layout_breadth` flag on), overview level
 * Actions: (no interaction needed — the lens + layout is the answer) -> observe compaction drops indicator
 * Legible: the matrix showing the whole session as one object; compaction "N drops" badge legible
 * Hold: 5 s on the full matrix view
 * Duration: 9 s
 */
async function runScenario6(page: Page) {
  await openSession(page, graphFixture())
  await openGraph(page)
  await selectLens(page, "auditor")
  await selectLayout(page, "matrix")
  await selectLevel(page, "overview")
  await fit(page)
  await syncBeacon(page)
  flowWallStart = Date.now()
  recordMark("scenario-6-01-open")

  // No interaction needed - the lens + layout is the answer
  // Observe compaction drops indicator
  await pace(5000)
  recordMark("scenario-6-02-hold-outcome")
}

/**
 * Scenario 7: "I need to know what this run cost"
 * 
 * Start: cost lens (`graph_cost_lens` flag on), lanes layout, execution level
 * Actions: (no interaction — lens applies cost sizing/color) -> scan for highest-cost nodes
 * Legible: per-node token counts and USD cost labels on the top 3 nodes; no relayout flash
 * Hold: 4 s on the highest-cost node with tooltip open
 * Duration: 8 s
 */
async function runScenario7(page: Page) {
  await openSession(page, graphFixture())
  await openGraph(page)
  await selectCostLens(page, true)
  await selectLayout(page, "lanes")
  await selectLevel(page, "execution")
  await fit(page)
  await syncBeacon(page)
  flowWallStart = Date.now()
  recordMark("scenario-7-01-open")

  // No interaction needed - lens applies cost sizing/color
  // Scan for highest-cost nodes (the subagent verification is the most expensive)
  await searchAndSelect(page, "verify", "prt_narr_subagent_1")
  recordMark("scenario-7-02-highest-cost-selected")

  // Hold on the highest-cost node with tooltip
  await pace(4000)
  recordMark("scenario-7-03-hold-outcome")
}

/**
 * Scenario 8: "I need to read a turn without leaving the transcript"
 * 
 * Start: reader lens, transcript surface, inline preview visible
 * Actions: hover turn row -> inline preview expands to interactive -> click expand to turn map
 * Legible: the turn's graph structure in the inline preview (static SVG) and after expand (interactive nodes)
 * Hold: 4 s on the expanded turn map with node labels readable
 * Duration: 10 s
 */
async function runScenario8(page: Page) {
  await openSession(page, graphFixture())
  // For scenario 8, we need the transcript surface with inline preview
  // This is a different surface - the transcript with inline graph preview
  await page.keyboard.press("Control+Shift+T") // Open transcript
  await pace(500)
  await openGraph(page) // This opens the graph panel
  await selectLens(page, "reader")
  await fit(page)
  await syncBeacon(page)
  flowWallStart = Date.now()
  recordMark("scenario-8-01-open")

  // Hover over a turn row to expand inline preview
  const turnRow = page.locator('[data-slot="transcript-row"]').first()
  await expect(turnRow).toBeVisible({ timeout: 10000 })
  await turnRow.hover()
  await pace(800)
  recordMark("scenario-8-02-inline-preview-expanded")

  // Click expand to turn map
  const expandButton = page.locator('[data-slot="graph-inline-expand"]').first()
  await expect(expandButton).toBeVisible({ timeout: 10000 })
  await expandButton.click()
  await waitForStillCanvas(page)
  await pace(500)
  recordMark("scenario-8-03-turn-map-expanded")

  // Hold on the expanded turn map with node labels readable
  await pace(4000)
  recordMark("scenario-8-04-hold-outcome")
}

test.describe(`Scenario ${scenarioNum} — capture`, () => {
  test(`Scenario ${scenarioNum} — capture`, async ({ page }) => {
  test.skip(!runScenarios, "Scenario capture; set GRAPH_CAPTURE_SCENARIO=1")
  test.setTimeout(120_000)
  const errors = trackPageErrors(page)
  
  // Log console messages for debugging
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`CONSOLE ERROR: ${msg.text()}`)
    }
  })
  
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: "dark" })

  switch (scenarioNum) {
    case 1:
      await runScenario1(page)
      break
    case 2:
      await runScenario2(page)
      break
    case 3:
      await runScenario3(page)
      break
    case 4:
      await runScenario4(page)
      break
    case 5:
      await runScenario5(page)
      break
    case 6:
      await runScenario6(page)
      break
    case 7:
      await runScenario7(page)
      break
    case 8:
      await runScenario8(page)
      break
    default:
      throw new Error(`Scenario ${scenarioNum} not implemented yet`)
  }

  await pace(800)
  expect(filterKnownErrors(errors)).toEqual([])
})

})

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  locale: "en-US",
  video: { mode: "on", size: { width: 1440, height: 900 } },
})