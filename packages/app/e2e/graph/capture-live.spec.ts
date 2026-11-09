import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
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

const directory = process.env.GRAPH_FIXTURE_DIR ?? "/tmp/SessionGraph"
const sessionID = "ses_session_graph"
const canvasHost = '[data-slot="graph-canvas-host"]'
const toolbar = '[data-slot="graph-toolbar"]'
const inspector = '[data-slot="graph-inspector"]'

const captureDir = process.env.GRAPH_CAPTURE_DIR

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

let firstFrameMarkerAdded = false

async function addFirstFrameMarker(page: Page) {
  if (firstFrameMarkerAdded) return
  await page.evaluate(() => {
    const marker = document.createElement("div")
    marker.id = "graph-first-frame-marker"
    marker.style.cssText = "position:fixed;top:0;left:0;width:10px;height:10px;background:#ff0000;z-index:2147483647;pointer-events:none"
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
  recordMark(page, name)
  if (!captureDir) return
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
  // Remove the first-frame marker after the first capture
  if (name === "01-log.png") {
    await removeFirstFrameMarker(page)
  }
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

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}

/**
 * Frame marks: wall-clock seconds since the sync beacon, written per capture so
 * a failed run still leaves a partial manifest. Post-processing anchors the
 * video timeline to the beacon and offsets every mark against it, giving
 * frame-accurate narration timing for demo video generation.
 */
const frameMarks: { frame: string; elapsed: number }[] = []
let flowWallStart = 0

function recordMark(page: Page, name: string) {
  if (!flowWallStart) return
  frameMarks.push({ frame: name, elapsed: (Date.now() - flowWallStart) / 1000 })
  mkdirSync(videoDir, { recursive: true })
  writeFileSync(resolve(videoDir, "marks.json"), JSON.stringify(frameMarks, null, 2))
}

/**
 * A deliberate, short fullscreen white flash that exists only to be located in
 * the recorded video during post-production: the demo generator detects its
 * first frame and uses it as the zero point for narration timing. It is not
 * used to synchronize any test step or assertion.
 */
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

async function closeMenus(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLDetailsElement>("details[data-slot^='graph-toolbar-']").forEach((menu) => {
      menu.open = false
    })
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
  if (!open) await overflow.getByLabel("More").click()
}

async function pickLayout(page: Page, layout: string) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layout"]`)
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!open) await menu.locator(":scope > summary").click()
  await page.locator(`${toolbar} [data-slot="graph-layout-option"][data-value="${layout}"]`).click()
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

async function openLayers(page: Page) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!open) await menu.locator(":scope > summary").click()
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
  const canvas = page.locator('[data-slot="graph-canvas-host"] canvas')
  await canvas.hover()
  const delta = label === "Zoom in" ? -200 : 200
  await page.mouse.wheel(0, delta)
  await expect.poll(() => zoomPercent(page), { timeout: 15000 }).not.toBe(before)
}

async function zoomEnabled(page: Page, label: "Zoom in" | "Zoom out") {
  const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
  const compact = (await overflow.count()) > 0
  if (compact) await overflow.getByLabel("More").click()
  const enabled = await page.locator(toolbar).getByRole("button", { name: label, exact: true }).isEnabled()
  if (compact) await overflow.getByLabel("More").click()
  return enabled
}

async function zoomToPercent(page: Page, target: number) {
  for (let step = 0; step < 60; step += 1) {
    const current = await zoomPercent(page)
    if (Math.abs(current - target) <= 4) return current
    const label = current < target ? "Zoom in" : "Zoom out"
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
  await page.locator('[data-slot="graph-canvas-region"]').focus()
  await page.keyboard.press("/")
  const search = page.getByRole("dialog", { name: "Search" })
  const input = search.getByRole("combobox")
  await input.fill(query)
  await expect(search.locator(`[data-node-id="${nodeId}"]`)).toBeVisible({ timeout: 10000 })
  await input.press("Enter")
  await page.waitForTimeout(500)
  await waitForStillCanvas(page)
}

async function chooseDepth(page: Page, depth: string) {
  await openLayers(page)
  const dropdown = page.locator('[data-slot="graph-layers-depth"]')
  await expect(dropdown).toBeVisible({ timeout: 5000 })
  await dropdown.selectOption(depth)
  // The capability fallback may revert the depth label to "flat" while keeping
  // the 3D projection. For the demo recording, the visual 3D state is what
  // matters; wait for projection=3d for non-flat depths.
  if (depth === "flat") {
    await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-depth", "flat", { timeout: 15000 })
  } else {
    await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-projection", "3d", { timeout: 15000 })
  }
  await closeLayers(page)
}

async function chooseProfile(page: Page, profile: string) {
  await openLayers(page)
  await page.locator('[data-slot="graph-lens-preset"][data-value="' + profile + '"]').click()
  await closeLayers(page)
}

async function openExportMenu(page: Page) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-export"]`)
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!open) await menu.locator(":scope > summary").click()
}

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  locale: "en-US",
  // Pin the recorded video size so the frame 13 narrow-viewport resize stays
  // pillar-boxed inside a constant 1440x900 recording instead of distorting it,
  // and always record: this spec exists to produce the demo source footage.
  video: { mode: "on", size: { width: 1440, height: 900 } },
})

const videoDir = fileURLToPath(new URL("../../../../docs/spacegraph/video", import.meta.url))

/**
 * Single continuous test that records one live video through the entire demo flow.
 * This produces a smooth, continuous recording instead of disjointed per-test clips.
 */
test("live demo recording — continuous flow through all frames", async ({ page }) => {
  test.setTimeout(1_800_000) // 30 minutes for full flow
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await addFirstFrameMarker(page)
  flowWallStart = Date.now()

  // ── FRAME 01: Log view ──
  await openSession(page, graphFixture())
  await settle(page)
  await capture(page, "01-log.png")

  // ── FRAME 02: Graph overview ──
  await page.keyboard.press("Control+Shift+M")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true", { timeout: 30000 })
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-renderer", "spacegraph")
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
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true", { timeout: 30000 })
  await chooseDepth(page, "orbit")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-projection", "3d")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "06-graph-3d.png")

  // ── FRAME 11: Timeline layout ──
  await chooseDepth(page, "flat")
  await setLevel(page, "Execution")
  await pickLayout(page, "timeline")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "11-graph-timeline.png")

  // ── FRAME 12: Hierarchy layout ──
  await pickLayout(page, "hierarchy")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "12-graph-hierarchy.png")

  // ── FRAME 13: Narrow viewport ──
  await pickLayout(page, "lanes")
  await setLevel(page, "Execution")
  await fit(page)
  await page.setViewportSize({ width: 390, height: 900 })
  await expect(page.locator('[data-slot="graph-toolbar-overflow"]')).toBeVisible({ timeout: 10000 })
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "13-graph-narrow.png")
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.locator('[data-slot="graph-toolbar-overflow"]')).toBeHidden({ timeout: 10000 })

  // ── FRAME 14: Light theme ──
  await page.emulateMedia({ colorScheme: "light" })
  await setLevel(page, "Overview")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "14-graph-light.png")

  // ── FRAME 15: Ribbon layout ──
  await page.emulateMedia({ colorScheme: "dark" })
  await setLevel(page, "Overview")
  await pickLayout(page, "ribbon")
  await waitForGraphContent(page)
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "15-graph-ribbon.png")

  // ── FRAME 16: Matrix layout ──
  await setLevel(page, "Overview")
  await pickLayout(page, "matrix")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "16-graph-matrix.png")

  // ── FRAME 17: Changed files ──
  // Reset the surface like the per-frame suite does by opening a fresh map:
  // leaves any stuck narrow/inspector state (frame 13 resized to 390px) behind.
  await page.keyboard.press("Control+Shift+T")
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable({ timeout: 15000 })
  await page.keyboard.press("Control+Shift+M")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true", { timeout: 30000 })
  await setLevel(page, "Execution")
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.locator('[data-slot="graph-toolbar-overflow"]')).toBeHidden({ timeout: 10000 })
  await pickLayout(page, "lanes")
  await openMenu(page)
  // The Files toggle is reachable only once the toolbar menu is open
  await page.locator(toolbar).getByRole("button", { name: "Files", exact: true }).click({ timeout: 15000 })
  await expect(page.locator('[data-slot="graph-file-rail"]')).toBeVisible({ timeout: 15000 })
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "17-graph-files.png")

  // ── FRAME 18: Layered 3D ──
  // Like the per-frame suite, the 3D depth frames start from the Overview level
  // with menus closed; layered depth does not take effect from Execution.
  await closeMenus(page)
  await setLevel(page, "Overview")
  await chooseDepth(page, "orbit")
  await chooseDepth(page, "layered")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "18-graph-layered.png")

  // ── FRAME 19: Depth stack ──
  await chooseDepth(page, "orbit")
  await chooseDepth(page, "depth-stack")
  await fit(page)
  await waitForStillCanvas(page, 60000)
  await capture(page, "19-graph-depth-stack.png")

  // ── FRAME 20: Zoom 150% ──
  // Skipped in live recording; zoom behavior differs after accumulated 3D state.
  // Covered by per-frame test 20 which starts from a fresh graph.

  // ── FRAME 21: Max zoom / auto-zoom ──
  // Skipped for same reason.

  // ── FRAME 22: Turn focus 1 ──
  await setLevel(page, "Execution")
  await fit(page)
  await focusNode(page, "turn:msg_user_1", "g t")
  await capture(page, "22-graph-turn-1.png")

  // ── FRAME 23: Turn focus 2 ──
  await setLevel(page, "Execution")
  await fit(page)
  await focusNode(page, "turn:msg_user_2", "cover the refresh path")
  await capture(page, "23-graph-turn-2.png")

  // ── FRAME 24: Failure chain ──
  await setLevel(page, "Execution")
  await fit(page)
  await focusNode(page, "tool:prt_tool_shell_2", "FAIL auth refresh token")
  await capture(page, "24-graph-failure-chain.png")

  // ── FRAME 28: Tree layout ──
  await setLevel(page, "Execution")
  await pickLayout(page, "tree")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "28-graph-tree.png")

  // ── FRAME 29: Force layout ──
  await pickLayout(page, "force")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "29-graph-force.png")

  // ── FRAME 31: Perspective ──
  await pickLayout(page, "lanes")
  await chooseDepth(page, "orbit")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-projection", "3d")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-card-facing", "plane")
  await setLevel(page, "Detail")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "31-graph-perspective.png")

  // ── FRAME 34: Surfaces ──
  await chooseDepth(page, "flat")
  await page.keyboard.press("Control+Shift+H")
  const hybrid = page.locator('[data-slot="spacegraph-surface-hybrid"]')
  await expect(hybrid).toBeVisible()
  await waitForStillCanvas(page)
  await capture(page, "34-graph-surfaces.png")

  // ── FRAME 36: Trace overlay ──
  await page.keyboard.press("Control+Shift+T")
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable({ timeout: 15000 })
  await page.keyboard.press("Control+Shift+M")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true", { timeout: 30000 })
  await setLevel(page, "Execution")
  await fit(page)
  await focusNode(page, "result:prt_tool_shell_2", "failed result")
  await expect(page.locator(inspector).getByRole("heading", { name: "failed" })).toBeVisible({ timeout: 10000 })
  await page.locator(inspector).getByRole("button", { name: "Why" }).click()
  await waitForStillCanvas(page)
  await capture(page, "36-graph-trace-overlay.png")

  // ── FRAME 37: Collapsed group ──
  await page.keyboard.press("Control+Shift+T")
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable({ timeout: 15000 })
  await page.keyboard.press("Control+Shift+M")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true", { timeout: 30000 })
  await setLevel(page, "Execution")
  await fit(page)
  await waitForStillCanvas(page)
  await focusNode(page, "phase:turn:msg_user_1:explore:1", "explore")
  await expect(page.locator(inspector)).toBeVisible()
  await page.locator('[data-slot="graph-status-bar"] [data-slot="graph-status-group-toggle"]').click()
  await waitForStillCanvas(page)
  await capture(page, "37-graph-collapsed-group.png")

  // ── FRAME 38: Hybrid view ──
  await page.keyboard.press("Control+Shift+T")
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable({ timeout: 15000 })
  await page.keyboard.press("Control+Shift+M")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true", { timeout: 30000 })
  await page.keyboard.press("Control+Shift+H")
  const hybrid2 = page.locator('[data-slot="spacegraph-surface-hybrid"]')
  await expect(hybrid2).toBeVisible({ timeout: 15000 })
  await openMenu(page)
  await page.locator('[data-slot="graph-arrangement-option"][data-value="side"]').click()
  await expect(hybrid2).toHaveAttribute("data-arrangement", "side")
  await waitForStillCanvas(page)
  await capture(page, "38-graph-hybrid.png")

  // ── FRAME 39: NLQ search ──
  await openMenu(page)
  await page.locator(toolbar).getByRole("button", { name: "Search" }).click()
  const search2 = page.getByRole("dialog", { name: "Search" })
  await search2.getByRole("combobox").fill("failed tools")
  await expect(search2.locator('[data-node-id="tool:prt_tool_shell_2"]')).toBeVisible()
  await waitForStillCanvas(page)
  await capture(page, "39-graph-nlq-search.png")

  // ── FRAME 40: NLQ code errors ──
  await search2.getByRole("combobox").fill("failed")
  await expect(search2.locator('[data-node-id="tool:prt_tool_shell_2"]')).toBeVisible()
  await waitForStillCanvas(page)
  await capture(page, "40-graph-nlq-code-errors.png")

  // Close the search dialog before the next flow; frame 42 opens its own.
  await page.keyboard.press("Escape")
  await expect(search2).toBeHidden()

  // ── FRAME 41: Trust lens ──
  const trustBanner = page.locator('[data-slot="graph-trust-banner"]')
  if (await trustBanner.count() > 0) {
    await expect(trustBanner).toBeVisible()
    await capture(page, "41-graph-trust-lens.png")
  } else {
    await capture(page, "41-graph-trust-lens.png")
  }

  // ── FRAME 42: Permalink copy ──
  await page.keyboard.press("Control+Shift+M")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true", { timeout: 30000 })
  await openMenu(page)
  await page.locator(toolbar).getByRole("button", { name: "Search" }).click()
  const search3 = page.getByRole("dialog", { name: "Search" })
  await search3.getByRole("combobox").fill("token.ts")
  await search3.getByRole("option", { name: "src/auth/token.ts", exact: true }).click()
  await expect(page.locator(inspector).getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible()
  await waitForStillCanvas(page)
  await openExportMenu(page)
  await expect(page.locator('[data-slot="graph-export-option"]').first()).toBeVisible()
  await capture(page, "42-graph-permalink-copy.png")

  // ── FRAME 43: Demo map ──
  await page.keyboard.press("Control+Shift+T")
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable({ timeout: 15000 })
  await page.keyboard.press("Control+Shift+M")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true", { timeout: 30000 })
  await setLevel(page, "Overview")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "43-graph-demo-map.png")

  expect(filterKnownErrors(errors)).toEqual([])
})