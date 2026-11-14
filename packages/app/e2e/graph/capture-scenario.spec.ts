import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test as base, type Page } from "@playwright/test"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { trackPageErrors } from "../utils/errors"
import { seedSessionGraph } from "../utils/graph"
import { openSession } from "../utils/workspace"
import { waitForGraphContent, graphCanvasHost } from "../utils/waits"

const KNOWN_FLAKY_ERRORS = ["Maximum call stack size exceeded"]

const test = base.extend({
  page: async ({ page }, use) => {
    await seedSessionGraph(page, { graph_attention: true })
    await use(page)
  },
})

// Scenario captures are opt-in. Set GRAPH_CAPTURE_SCENARIO=1 to run.
// Set GRAPH_CAPTURE_SCENARIO_NUM to run a specific scenario (1-8).
test.skip(!process.env.GRAPH_CAPTURE_SCENARIO, "Scenario capture; set GRAPH_CAPTURE_SCENARIO=1")

const scenarioNum = Number(process.env.GRAPH_CAPTURE_SCENARIO_NUM ?? "1")
const directory = "C:/OpenCode/ScenarioGraph"
const sessionID = "ses_scenario_graph"
const toolbar = '[data-slot="graph-toolbar"]'
const inspector = '[data-slot="graph-inspector"]'

const videoDir = fileURLToPath(new URL("../../../../docs/spacegraph/video", import.meta.url))

function filterKnownErrors(errs: string[]): string[] {
  return errs.filter((e) => !KNOWN_FLAKY_ERRORS.some((k) => e.includes(k)))
}

function graphFixture() {
  return {
    name: "ScenarioGraph",
    directory,
    sessions: [{ id: sessionID, title: "Scenario graph" }],
    pageMessages: () => ({ items: buildFixtureMessages() }),
  }
}

const frameMarks: { frame: string; elapsed: number }[] = []
let flowWallStart = 0

function recordMark(name: string) {
  if (!flowWallStart) return
  frameMarks.push({ frame: name, elapsed: (Date.now() - flowWallStart) / 1000 })
  mkdirSync(videoDir, { recursive: true })
  writeFileSync(resolve(videoDir, `marks-scenario-${scenarioNum}.json`), JSON.stringify(frameMarks, null, 2))
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

/**
 * Scenario 1: "I need to know why the build broke"
 * 
 * Start: lanes, execution level, nothing selected
 * Actions: click attention badge -> click "Why"
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

  // Open the graph panel first to show the attention badge
  await pace(500)
  recordMark("scenario-1-02-attention-badge-visible")

  // Click the attention badge in the titlebar (the failure count button)
  // This is the TitlebarItem with id "graph-failures"
  const attentionButton = page.getByRole("button", { name: "Open the session map at the failure" })
  await expect(attentionButton).toBeVisible({ timeout: 10000 })
  await attentionButton.click()
  await pace(800)
  recordMark("scenario-1-03-attention-clicked")

  // Click "Why" button in the inspector to activate trace=why
  const whyButton = page.locator(inspector).getByRole("button", { name: "Why", exact: true })
  await expect(whyButton).toBeVisible({ timeout: 10000 })
  await whyButton.click()
  await waitForStillCanvas(page)
  await pace(500)
  recordMark("scenario-1-04-why-trace-active")

  // Hold on the outcome - the causal chain ending in the failed bun test error
  await pace(4000)
  recordMark("scenario-1-05-hold-outcome")
}

test.describe.configure({ retries: 0, mode: "serial" })

test(`Scenario ${scenarioNum} — capture`, async ({ page }) => {
  test.setTimeout(120_000)
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: "dark" })

  if (scenarioNum === 1) {
    await runScenario1(page)
  } else {
    throw new Error(`Scenario ${scenarioNum} not implemented yet`)
  }

  await pace(800)
  expect(filterKnownErrors(errors)).toEqual([])
})

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  locale: "en-US",
  video: { mode: "on", size: { width: 1440, height: 900 } },
})