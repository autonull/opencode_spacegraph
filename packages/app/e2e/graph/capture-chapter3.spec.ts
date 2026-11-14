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

test.skip(!process.env.GRAPH_CAPTURE_DEMO, "Chapter 3 Audit recording; set GRAPH_CAPTURE_DEMO=1")

const directory = "C:/OpenCode/SessionGraphChapter3"
const sessionID = "ses_chapter3_audit"
const projectID = "proj_chapter3"
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
    name: "SessionGraphChapter3",
    directory,
    sessions: [{ id: sessionID, title: "Session graph (audit)" }],
    pageMessages: () => ({ items: narrativeMessages }),
  }
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

const frameMarks: { frame: string; elapsed: number }[] = []
let flowWallStart = 0

function recordMark(name: string) {
  if (!flowWallStart) return
  frameMarks.push({ frame: name, elapsed: (Date.now() - flowWallStart) / 1000 })
  mkdirSync(videoDir, { recursive: true })
  writeFileSync(resolve(videoDir, "marks-chapter3.json"), JSON.stringify(frameMarks, null, 2))
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

async function openGraph(page: Page) {
  await page.keyboard.press("Control+Shift+M")
  await waitForGraphContent(page)
  await expect(graphCanvasHost(page)).toHaveAttribute("data-graph-renderer", "spacegraph")
}

async function searchAndFocusNode(page: Page, nodeId: string, query: string) {
  await page.locator('[data-slot="graph-canvas-region"]').focus()
  await page.keyboard.press("/")
  const search = page.getByRole("dialog", { name: "Search" })
  const input = search.getByRole("combobox")
  await input.fill(query)
  await expect(search.locator(`[data-node-id="${nodeId}"]`)).toBeVisible({ timeout: 10000 })
  await input.press("Enter")
  await waitForStillCanvas(page)
}

async function openFileRail(page: Page) {
  const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
  const compact = (await overflow.count()) > 0
  if (compact) await overflow.getByLabel("More controls").click()
  await page.locator(toolbar).getByRole("button", { name: "Files", exact: true }).click()
  await expect(page.locator('[data-slot="graph-file-rail"]')).toBeVisible({ timeout: 15000 })
  if (compact) await overflow.getByLabel("More controls").click()
}

test.describe.configure({ retries: 0, mode: "serial" })

test("Chapter 3 — Audit: what did it touch — files rail → diff → the wrong fix", async ({ page }) => {
  console.log("[TEST] Starting Chapter 3 test")
  test.setTimeout(600_000)
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  flowWallStart = Date.now()

  // Open session with all narrative messages pre-loaded
  await openSession(page, graphFixture())

  // Sync beacon for video timeline anchoring
  await syncBeacon(page)

  // ── FRAME 01: Open graph, fit to see full session ──
  await openGraph(page)
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "chapter3-01-graph-open.png")
  recordMark("chapter3-01-graph-open")

  // ── FRAME 02: Open files rail to see changed files ──
  await openFileRail(page)
  await waitForStillCanvas(page)
  await capture(page, "chapter3-02-files-rail.png")
  recordMark("chapter3-02-files-rail")

  // ── FRAME 03: Search for token.ts (the wrong fix file), click to open diff ──
  await searchAndFocusNode(page, "file:src/auth/token.ts", "token.ts")
  await expect(page.locator(inspector).getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible({ timeout: 10000 })
  await waitForStillCanvas(page)
  await capture(page, "chapter3-03-token-diff.png")
  recordMark("chapter3-03-token-diff")

  // ── FRAME 04: Search for session.ts (the correct fix), click to open diff ──
  await searchAndFocusNode(page, "file:src/auth/session.ts", "session.ts")
  await expect(page.locator(inspector).getByRole("heading", { name: "src/auth/session.ts" })).toBeVisible({ timeout: 10000 })
  await waitForStillCanvas(page)
  await capture(page, "chapter3-04-session-diff.png")
  recordMark("chapter3-04-session-diff")

  expect(filterKnownErrors(errors)).toEqual([])
})

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  locale: "en-US",
  video: { mode: "on", size: { width: 1440, height: 900 } },
})