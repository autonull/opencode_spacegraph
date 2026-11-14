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

// Explorations are opt-in. The take is the artifact; marks name the beats so
// stills and commentary can be cut from the same recording.
test.skip(!process.env.GRAPH_EXPLORE_DEMO, "Exploration take; set GRAPH_EXPLORE_DEMO=1")

const theme = process.env.GRAPH_EXPLORE_THEME ?? "diagnose"
const seed = Number(process.env.GRAPH_EXPLORE_SEED ?? "1")
const directory = `C:/OpenCode/Explore/${theme}`
const sessionID = `ses_explore_${theme}`
const toolbar = '[data-slot="graph-toolbar"]'
const inspector = '[data-slot="graph-inspector"]'
const canvasHost = '[data-slot="graph-canvas-host"]'

const videoDir = fileURLToPath(new URL("../../../../docs/spacegraph/video", import.meta.url))

function filterKnownErrors(errs: string[]): string[] {
  return errs.filter((e) => !KNOWN_FLAKY_ERRORS.some((k) => e.includes(k)))
}

function graphFixture() {
  return {
    name: `SessionGraphExplore-${theme}`,
    directory,
    sessions: [{ id: sessionID, title: `Exploration (${theme})` }],
    pageMessages: () => ({ items: buildNarrativeFixtureMessages() }),
  }
}

/** Deterministic variation: the same seed reproduces the same take. */
function random(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const frameMarks: { frame: string; elapsed: number }[] = []
let flowWallStart = 0

function recordMark(name: string) {
  if (!flowWallStart) return
  frameMarks.push({ frame: name, elapsed: (Date.now() - flowWallStart) / 1000 })
  mkdirSync(videoDir, { recursive: true })
  writeFileSync(resolve(videoDir, `marks-explore-${theme}.json`), JSON.stringify(frameMarks, null, 2))
}

/** Authored performance time, not a synchronization primitive. */
async function pace(ms: number) {
  await new Promise((done) => setTimeout(done, ms))
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

async function pickLayout(page: Page, layout: string) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layout"]`)
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await menu.locator(":scope > summary").click()
  }
  await page.locator(`${toolbar} [data-slot="graph-layout-option"][data-value="${layout}"]`).click()
}

async function chooseDepth(page: Page, depth: "flat" | "orbit") {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await menu.locator(":scope > summary").click()
  }
  const dropdown = page.locator('[data-slot="graph-layers-depth"]')
  await expect(dropdown).toBeVisible({ timeout: 5000 })
  await dropdown.selectOption(depth)
  await menu.locator(":scope > summary").click()
}

async function searchAndFocus(page: Page, nodeId: string, query: string) {
  await page.locator('[data-slot="graph-canvas-region"]').focus()
  await page.keyboard.press("/")
  const search = page.getByRole("dialog", { name: "Search" })
  const input = search.getByRole("combobox")
  await input.fill(query)
  await expect(search.locator(`[data-node-id="${nodeId}"]`)).toBeVisible({ timeout: 10000 })
  await input.press("Enter")
  await pace(600)
}

async function hoverCanvas(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps: number) {
  await page.mouse.move(from.x, from.y, { steps: Math.max(4, Math.floor(steps / 3)) })
  await page.mouse.move(to.x, to.y, { steps })
}

async function dragCanvas(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps: number) {
  await page.mouse.move(from.x, from.y, { steps: 6 })
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps })
  await page.mouse.up()
}

async function zoomCanvas(page: Page, at: { x: number; y: number }, delta: number) {
  await page.mouse.move(at.x, at.y, { steps: 8 })
  await page.mouse.wheel(0, delta)
  await pace(500)
}

async function canvasBox(page: Page) {
  const box = await page.locator(canvasHost).boundingBox()
  if (!box) throw new Error("graph canvas has no box")
  return box
}

function pointIn(box: { x: number; y: number; width: number; height: number }, rnd: () => number) {
  return {
    x: box.x + box.width * (0.15 + rnd() * 0.7),
    y: box.y + box.height * (0.15 + rnd() * 0.7),
  }
}

const layouts = ["lanes", "timeline", "hierarchy", "tree", "force", "grid", "circular", "ribbon", "matrix"]
const queries = ["failed result", "token.ts", "session.ts", "explore", "subagent", "compaction"]

/**
 * Detours are the improvisation. Each one is a valid interaction the UI
 * supports, chosen by the seed, kept in the take even when it flounders.
 */
async function detour(page: Page, rnd: () => number) {
  const roll = rnd()
  const box = await canvasBox(page)
  if (roll < 0.25) {
    await pickLayout(page, layouts[Math.floor(rnd() * layouts.length)])
    await pace(400 + rnd() * 800)
    return
  }
  if (roll < 0.4) {
    await chooseDepth(page, rnd() > 0.5 ? "orbit" : "flat")
    await pace(500 + rnd() * 900)
    return
  }
  if (roll < 0.55) {
    const query = queries[Math.floor(rnd() * queries.length)]
    await page.locator('[data-slot="graph-canvas-region"]').focus()
    await page.keyboard.press("/")
    const search = page.getByRole("dialog", { name: "Search" })
    await search.getByRole("combobox").fill(query)
    await pace(700 + rnd() * 800)
    await page.keyboard.press("Escape")
    return
  }
  if (roll < 0.7) {
    await dragCanvas(page, pointIn(box, rnd), pointIn(box, rnd), 14 + Math.floor(rnd() * 12))
    await pace(400)
    return
  }
  if (roll < 0.85) {
    await zoomCanvas(page, pointIn(box, rnd), rnd() > 0.5 ? -240 : 240)
    return
  }
  await hoverCanvas(page, pointIn(box, rnd), pointIn(box, rnd), 20 + Math.floor(rnd() * 20))
  await pace(300)
}

test.describe.configure({ retries: 0, mode: "serial" })

test(`Exploration — ${theme} (seed ${seed})`, async ({ page }) => {
  test.setTimeout(900_000)
  const errors = trackPageErrors(page)
  const rnd = random(seed)
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: theme === "night" ? "light" : "dark" })

  await openSession(page, graphFixture())
  await openGraph(page)
  await fit(page)
  await syncBeacon(page)
  flowWallStart = Date.now()
  recordMark(`${theme}-00-open`)

  if (theme === "diagnose") {
    await searchAndFocus(page, "result:prt_narr_shell_2", "failed result")
    await expect(page.locator(inspector).getByRole("heading", { name: "failed" })).toBeVisible({ timeout: 10000 })
    recordMark(`${theme}-01-failure`)
    await page.locator(inspector).getByRole("button", { name: "Why" }).click()
    await pace(900)
    recordMark(`${theme}-02-why-trace`)
    await detour(page, rnd)
    await fit(page)
    recordMark(`${theme}-03-recover`)
  }

  if (theme === "audit") {
    await pickLayout(page, "timeline")
    await pace(700)
    recordMark(`${theme}-01-timeline`)
    await searchAndFocus(page, "file:src/auth/token.ts", "token.ts")
    recordMark(`${theme}-02-wrong-fix`)
    await searchAndFocus(page, "file:src/auth/session.ts", "session.ts")
    recordMark(`${theme}-03-correct-fix`)
    await detour(page, rnd)
    recordMark(`${theme}-04-detour`)
  }

  if (theme === "chaos") {
    for (let i = 0; i < 12; i++) {
      await detour(page, rnd)
      recordMark(`${theme}-${String(i + 1).padStart(2, "0")}-detour`)
    }
    await fit(page)
    recordMark(`${theme}-13-fit`)
  }

  if (theme === "night") {
    await pickLayout(page, "hierarchy")
    await pace(800)
    recordMark(`${theme}-01-hierarchy`)
    await detour(page, rnd)
    await searchAndFocus(page, "result:prt_narr_shell_2", "failed result")
    recordMark(`${theme}-02-failure`)
    await fit(page)
    recordMark(`${theme}-03-fit`)
  }

  if (!["diagnose", "audit", "chaos", "night"].includes(theme)) {
    throw new Error(`unknown GRAPH_EXPLORE_THEME=${theme} (diagnose|audit|chaos|night)`)
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
