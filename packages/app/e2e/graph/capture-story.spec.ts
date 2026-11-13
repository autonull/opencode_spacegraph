import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test as base, type Page } from "@playwright/test"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { trackPageErrors } from "../utils/errors"
import { seedSessionGraph } from "../utils/graph"
import { openSession } from "../utils/workspace"
import { waitForGraphContent } from "../utils/waits"

const KNOWN_FLAKY_ERRORS = ["Maximum call stack size exceeded"]

const test = base.extend({
  page: async ({ page }, use) => {
    await seedSessionGraph(page)
    await use(page)
  },
})

test.skip(!process.env.GRAPH_CAPTURE_DEMO, "Story recording; set GRAPH_CAPTURE_DEMO=1")

const directory = "C:/OpenCode/SessionGraph"
const sessionID = "ses_session_graph"
const toolbar = '[data-slot="graph-toolbar"]'
const inspector = '[data-slot="graph-inspector"]'

const captureDir = process.env.GRAPH_CAPTURE_DIR
const videoDir = process.env.GRAPH_VIDEO_DIR

function filterKnownErrors(errs: string[]): string[] {
  return errs.filter((e) => !KNOWN_FLAKY_ERRORS.some((k) => e.includes(k)))
}

function graphFixture() {
  return {
    name: "SessionGraph",
    directory,
    sessions: [{ id: sessionID, title: "Session graph" }],
    pageMessages: () => ({ items: buildFixtureMessages() }),
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

async function addCursorRing(page: Page) {
  await page.evaluate(() => {
    const ring = document.createElement("div")
    ring.id = "demo-cursor-ring"
    ring.style.cssText = `
      position:fixed;width:24px;height:24px;border:2px solid #00d4aa;border-radius:50%;
      pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);
      transition:transform 0.05s linear,opacity 0.1s;opacity:0;box-shadow:0 0 8px #00d4aa;
    `
    document.body.append(ring)
    ;(window as any).demoCursorRing = ring
  })
}

async function moveCursorRing(page: Page, x: number, y: number) {
  await page.evaluate(([x, y]) => {
    const ring = (window as any).demoCursorRing
    if (ring) {
      ring.style.transform = `translate(${x - 12}px, ${y - 12}px)`
      ring.style.opacity = "1"
    }
  }, [x, y])
}

async function clickRipple(page: Page, x: number, y: number) {
  await page.evaluate(([x, y]) => {
    const ripple = document.createElement("div")
    ripple.style.cssText = `
      position:fixed;left:${x}px;top:${y}px;width:0;height:0;border-radius:50%;
      background:rgba(0,212,170,0.3);pointer-events:none;z-index:2147483646;
      transform:translate(-50%,-50%);
      animation:demo-ripple 0.4s ease-out forwards;
    `
    const style = document.createElement("style")
    style.textContent = `
      @keyframes demo-ripple { to { width:60px;height:60px;opacity:0; } }
    `
    document.head.appendChild(style)
    document.body.appendChild(ripple)
    setTimeout(() => ripple.remove(), 400)
  }, [x, y])
}

async function hideCursorRing(page: Page) {
  await page.evaluate(() => {
    const ring = (window as any).demoCursorRing
    if (ring) ring.style.opacity = "0"
  })
}

const frameMarks: { frame: string; elapsed: number }[] = []
let flowWallStart = 0

function recordMark(name: string) {
  if (!flowWallStart) return
  frameMarks.push({ frame: name, elapsed: (Date.now() - flowWallStart) / 1000 })
  if (videoDir) {
    mkdirSync(videoDir, { recursive: true })
    writeFileSync(resolve(videoDir, "marks.json"), JSON.stringify(frameMarks, null, 2))
  }
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

async function openGraph(page: Page) {
  await openSession(page, graphFixture())
  await page.evaluate(() => {
    window.location.hash = "#graph:file:src/auth/token.ts"
  })
  await expect(page.locator('[data-slot="spacegraph-surface-map"]')).toBeVisible()
  await waitForGraphContent(page)
}

async function openMenu(page: Page, slot: string) {
  const menu = page.locator(`${toolbar} [data-slot="${slot}"]`)
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!open) await menu.locator(":scope > summary").click()
}

async function closeMenu(page: Page, slot: string) {
  const menu = page.locator(`${toolbar} [data-slot="${slot}"]`)
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
  if (open) await menu.locator(":scope > summary").click()
}

async function pickLayout(page: Page, layout: string) {
  await openMenu(page, "graph-toolbar-layout")
  await page.locator(`${toolbar} [data-slot="graph-layout-option"][data-value="${layout}"]`).click()
  await closeMenu(page, "graph-toolbar-layout")
}

async function fit(page: Page) {
  const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
  const compact = (await overflow.count()) > 0
  if (compact) await overflow.getByLabel("More controls").click()
  await page.locator(toolbar).getByRole("button", { name: "Fit", exact: true }).click()
  if (compact) await overflow.getByLabel("More controls").click()
}

async function focusNode(page: Page, nodeId: string, query: string) {
  await page.locator('[data-slot="graph-canvas-region"]').focus()
  await page.keyboard.press("/")
  const search = page.getByRole("dialog", { name: "Search" })
  const input = search.getByRole("combobox")
  await input.fill(query)
  await expect(search.locator(`[data-node-id="${nodeId}"]`)).toBeVisible({ timeout: 10000 })
  await input.press("Enter")
  await page.waitForTimeout(500)
  await still(page)
}

async function still(page: Page) {
  await waitForGraphContent(page)
  await page.waitForTimeout(1000)
}

async function capture(page: Page, name: string) {
  recordMark(name)
  if (!captureDir) return
  await page.evaluate(() => {
    document.querySelectorAll<HTMLDetailsElement>("details[data-slot^='graph-toolbar-']").forEach((menu) => {
      menu.open = false
    })
    window.scrollTo(0, 0)
  })
  mkdirSync(captureDir, { recursive: true })
  await page.screenshot({ path: resolve(captureDir, name), fullPage: false })
  if (name === "story-01-attention-badge.png") {
    await removeFirstFrameMarker(page)
  }
}

async function openSearch(page: Page) {
  await page.locator('[data-slot="graph-canvas-region"]').focus()
  await page.keyboard.press("/")
  const search = page.getByRole("dialog")
  await expect(search).toBeVisible()
  return search
}

async function closeSearch(page: Page, search: ReturnType<typeof page.getByRole>) {
  await page.keyboard.press("Escape")
  await expect(search).toBeHidden()
}

test.describe.configure({ retries: 0, mode: "serial" })

test("Story: Debugging a failing auth test", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })

  await addFirstFrameMarker(page)
  await addCursorRing(page)
  await openGraph(page)

  // Sync beacon for video timeline anchoring
  await syncBeacon(page)
  flowWallStart = Date.now()

  // ═══════════════════════════════════════════════════════════════════
  // ACT 1: THE PROBLEM — Open graph, immediately see attention badge
  // ═══════════════════════════════════════════════════════════════════

  await fit(page)
  await still(page)
  await capture(page, "story-01-attention-badge.png")

  // ═══════════════════════════════════════════════════════════════════
  // ACT 2: INVESTIGATE — "Why?" trace from the failure
  // ═══════════════════════════════════════════════════════════════════

  await fit(page)
  await focusNode(page, "result:prt_tool_shell_2", "failed result")
  await expect(page.locator(inspector).getByRole("heading", { name: "failed" })).toBeVisible({ timeout: 10000 })
  const whyBtn = page.locator(inspector).getByRole("button", { name: "Why" })
  await whyBtn.click()
  await still(page)
  await capture(page, "story-02-why-trace.png")

  await page.keyboard.press("Escape")

  // ═══════════════════════════════════════════════════════════════════
  // ACT 3: NAVIGATE — Palette search for failed tools
  // ═══════════════════════════════════════════════════════════════════

  await fit(page)
  const search = await openSearch(page)
  await search.getByRole("combobox").fill("failed tools")
  await expect(search.locator('[data-node-id="tool:prt_tool_shell_2"]')).toBeVisible()
  await still(page)
  await capture(page, "story-03-palette-failed-tools.png")

  await search.locator('[data-node-id="tool:prt_tool_shell_2"]').click()
  await expect(page.locator(inspector).getByRole("heading", { name: "shell" })).toBeVisible()
  await still(page)
  await capture(page, "story-04-shell-inspector.png")

  await closeSearch(page, search)

  // ═══════════════════════════════════════════════════════════════════
  // ACT 4: INSPECT — File diff widget shows the wrong fix
  // ═══════════════════════════════════════════════════════════════════

  await fit(page)
  const search2 = await openSearch(page)
  await search2.getByRole("combobox").fill("token.ts")
  await search2.getByRole("option", { name: "src/auth/token.ts", exact: true }).click()
  await expect(page.locator(inspector).getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible()
  await still(page)
  await capture(page, "story-05-wrong-fix-diff.png")

  await closeSearch(page, search2)

  // ═══════════════════════════════════════════════════════════════════
  // ACT 5: DISCOVER — Hierarchy layout reveals subagent found root cause
  // ═══════════════════════════════════════════════════════════════════

  await pickLayout(page, "hierarchy")
  await fit(page)
  await still(page)
  await capture(page, "story-06-hierarchy-subagent.png")

  await focusNode(page, "phase:turn:msg_user_1:explore:1", "explore")
  await still(page)
  await capture(page, "story-07-subagent-finding.png")

  // ═══════════════════════════════════════════════════════════════════
  // ACT 6: SHARE — Permalink to the failure for teammate
  // ═══════════════════════════════════════════════════════════════════

  await fit(page)
  const search4 = await openSearch(page)
  await search4.getByRole("combobox").fill("failed")
  await expect(search4.locator('[data-node-id="tool:prt_tool_shell_2"]')).toBeVisible()
  await search4.locator('[data-node-id="tool:prt_tool_shell_2"]').click()
  await still(page)

  await closeSearch(page, search4)
  await still(page)

  await capture(page, "story-08-permalink.png")

  await hideCursorRing(page)

  // Final verification
  expect(filterKnownErrors(errors)).toEqual([])
})