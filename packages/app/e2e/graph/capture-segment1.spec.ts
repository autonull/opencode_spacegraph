import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test as base, type Page } from "@playwright/test"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { trackPageErrors } from "../utils/errors"
import { seedSessionGraph } from "../utils/graph"
import { openSession } from "../utils/workspace"
import { graphCanvasHost, waitForGraphContent } from "../utils/waits"

const KNOWN_FLAKY_ERRORS = ["Maximum call stack size exceeded"]

function filterKnownErrors(errors: string[]): string[] {
  return errors.filter((e) => !KNOWN_FLAKY_ERRORS.some((k) => e.includes(k)))
}

const test = base.extend({
  page: async ({ page }, use) => {
    await seedSessionGraph(page)
    await use(page)
  },
})

// Demo recordings are opt-in so the default e2e run stays a bounded gate.
test.skip(!process.env.GRAPH_CAPTURE_DEMO, "Demo recording; set GRAPH_CAPTURE_DEMO=1")

const directory = "C:/OpenCode/SessionGraph"
const sessionID = "ses_session_graph"
const toolbar = '[data-slot="graph-toolbar"]'
const inspector = '[data-slot="graph-inspector"]'

function graphFixture() {
  return {
    name: "SessionGraph",
    directory,
    sessions: [{ id: sessionID, title: "Session graph" }],
    pageMessages: () => ({ items: buildFixtureMessages() }),
  }
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
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
  if (!open) await overflow.getByLabel("More").click()
}

async function setLevel(page: Page, level: "Overview" | "Execution" | "Detail") {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!open) await menu.locator(":scope > summary").click()
  const levels = page.locator('[data-slot="graph-layers-level"]')
  await levels.locator('button', { hasText: level }).click()
  await expect(levels.locator('button', { hasText: level })).toHaveAttribute("aria-pressed", "true")
  const close = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  if (await close.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await close.locator(":scope > summary").click()
  }
}

async function fit(page: Page) {
  const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
  const compact = (await overflow.count()) > 0
  if (compact) await overflow.getByLabel("More").click()
  await page.locator(toolbar).getByRole("button", { name: "Fit", exact: true }).click()
  if (compact) await overflow.getByLabel("More").click()
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

async function chooseDepth(page: Page, depth: string) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!open) await menu.locator(":scope > summary").click()
  const dropdown = page.locator('[data-slot="graph-layers-depth"]')
  await expect(dropdown).toBeVisible({ timeout: 5000 })
  await dropdown.selectOption(depth)
  if (depth === "flat") {
    await expect(graphCanvasHost(page)).toHaveAttribute("data-graph-depth", "flat", { timeout: 15000 })
  } else {
    await expect(graphCanvasHost(page)).toHaveAttribute("data-graph-projection", "3d", { timeout: 15000 })
  }
  const close = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  if (await close.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await close.locator(":scope > summary").click()
  }
}

const videoDir = fileURLToPath(new URL("../../../../docs/spacegraph/video", import.meta.url))

async function capture(page: Page, name: string) {
  if (!process.env.GRAPH_CAPTURE_DIR) return
  await page.evaluate(() => {
    document.querySelectorAll<HTMLDetailsElement>("details[data-slot^='graph-toolbar-']").forEach((menu) => {
      menu.open = false
    })
    window.scrollTo(0, 0)
  })
  mkdirSync(videoDir, { recursive: true })
  await page.screenshot({ path: resolve(videoDir, name) })
}

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  locale: "en-US",
  video: { mode: "on", size: { width: 1440, height: 900 } },
})

test("segment 1 — log through 3D orbit (frames 01-06) @capture @demo", async ({ page }) => {
  test.setTimeout(180_000)
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await syncBeacon(page)  // ← add sync beacon at start

  // ── FRAME 01: Log view ──
  await openSession(page, graphFixture())
  await settle(page)
  await capture(page, "01-log.png")

  // ── FRAME 02: Graph overview ──
  await page.keyboard.press("Control+Shift+M")
  await waitForGraphContent(page)
  await expect(graphCanvasHost(page)).toHaveAttribute("data-graph-renderer", "spacegraph")
  await setLevel(page, "Overview")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "02-graph-overview.png")

  // ── FRAME 03: Execution level ──
  await setLevel(page, "Execution")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "03-graph-execution.png")

  // ── FRAME 04: Node selected ──
  await openMenu(page)
  await page.locator(toolbar).getByRole("button", { name: "Search" }).click()
  const search = page.getByRole("dialog", { name: "Search" })
  await search.getByRole("combobox").fill("token.ts")
  await search.getByRole("option", { name: "src/auth/token.ts", exact: true }).click()
  await expect(page.locator(inspector).getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible()
  await waitForStillCanvas(page)
  await capture(page, "04-graph-selected.png")

  // ── FRAME 05: Return to log ──
  await page.keyboard.press("Control+Shift+T")
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable({ timeout: 15000 })
  await expect(page.locator('[data-component="composer-editor"]')).toBeVisible({ timeout: 15000 })
  await settle(page)
  await capture(page, "05-return-to-log.png")

  // ── FRAME 06: 3D orbit ──
  await page.keyboard.press("Control+Shift+M")
  await waitForGraphContent(page)
  await chooseDepth(page, "orbit")
  await expect(graphCanvasHost(page)).toHaveAttribute("data-graph-projection", "3d")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "06-graph-3d.png")

  expect(filterKnownErrors(errors)).toEqual([])
})