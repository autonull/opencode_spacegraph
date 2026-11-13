import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test as base, type Page } from "@playwright/test"
import { buildNarrativeFixtureMessages } from "@opencode/session-ui/graph"
import { trackPageErrors } from "../utils/errors"
import { seedSessionGraph } from "../utils/graph"
import { openSession } from "../utils/workspace"
import { waitForGraphContent, graphCanvasHost } from "../utils/waits"

const KNOWN_FLAKY_ERRORS = ["Maximum call stack size exceeded"]

const test = base.extend({
  page: async ({ page }, use) => {
    await seedSessionGraph(page)
    await use(page)
  },
})

test.skip(!process.env.GRAPH_CAPTURE_DEMO, "Chapter 1 live-open recording; set GRAPH_CAPTURE_DEMO=1")

const directory = "C:/OpenCode/SessionGraphChapter1"
const sessionID = "ses_chapter1_live"
const projectID = "proj_chapter1"
const toolbar = '[data-slot="graph-toolbar"]'
const inspector = '[data-slot="graph-inspector"]'

const captureDir = process.env.GRAPH_CAPTURE_DIR
const videoDir = fileURLToPath(new URL("../../../../docs/spacegraph/video", import.meta.url))

function filterKnownErrors(errs: string[]): string[] {
  return errs.filter((e) => !KNOWN_FLAKY_ERRORS.some((k) => e.includes(k)))
}

function graphFixture() {
  const narrativeMessages = buildNarrativeFixtureMessages()
  return {
    name: "SessionGraphChapter1",
    directory,
    sessions: [{ id: sessionID, title: "Session graph (live)" }],
    pageMessages: () => ({ items: narrativeMessages }),
  }
}

let firstFrameMarkerAdded = false

async function addFirstFrameMarker(page: Page) {
  if (firstFrameMarkerAdded) return
  await page.evaluate(() => {
    const marker = document.createElement("div")
    marker.id = "graph-first-frame-marker"
    marker.style.cssText =
      "position:fixed;top:0;left:0;width:10px;height:10px;background:#ff0000;z-index:2147483647;pointer-events:none"
    document.body.append(marker)
  })
  firstFrameMarkerAdded = true
}

async function removeFirstFrameMarker(page: Page) {
  if (!firstFrameMarkerAdded) return
  await page.evaluate(() => {
    const marker = document.getElementById("graph-first-frame-marker")
    marker?.remove()
  })
  firstFrameMarkerAdded = false
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
  if (name === "chapter1-01-live-open.png") {
    await removeFirstFrameMarker(page)
  }
}

const frameMarks: { frame: string; elapsed: number }[] = []
let flowWallStart = 0

function recordMark(name: string) {
  if (!flowWallStart) return
  frameMarks.push({ frame: name, elapsed: (Date.now() - flowWallStart) / 1000 })
  mkdirSync(videoDir, { recursive: true })
  writeFileSync(resolve(videoDir, "marks-chapter1.json"), JSON.stringify(frameMarks, null, 2))
}

async function syncBeacon(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        const beacon = document.createElement("div")
        beacon.style.cssText =
          "position:fixed;inset:0;z-index:2147483647;background:#fff;pointer-events:none"
        document.body.append(beacon)
        setTimeout(() => {
          beacon.remove()
          done()
        }, 360)
      }),
  )
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

test.describe.configure({ retries: 0, mode: "serial" })

test("Chapter 1 — Live: watch the session build with nodes streaming in", async ({ page }) => {
  console.log("[TEST] Starting Chapter 1 test")
  test.setTimeout(600_000)
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await addFirstFrameMarker(page)
  flowWallStart = Date.now()

  // Open session with all narrative messages pre-loaded (like capture-live)
  await openSession(page, graphFixture())

  // Sync beacon for video timeline anchoring
  await syncBeacon(page)

  // ── FRAME 01: Live open on a running session ──
  await page.keyboard.press("Control+Shift+M")
  await waitForGraphContent(page)
  await expect(graphCanvasHost(page)).toHaveAttribute("data-graph-renderer", "spacegraph")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "chapter1-01-live-open.png")
  recordMark("chapter1-01-live-open")

  expect(filterKnownErrors(errors)).toEqual([])
})

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  locale: "en-US",
  video: { mode: "on", size: { width: 1440, height: 900 } },
})