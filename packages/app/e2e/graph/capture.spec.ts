import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test as base, type Page } from "@playwright/test"
import { buildFixtureMessages, buildFixtureSnapshot } from "@opencode/session-ui/graph"
import { trackPageErrors } from "../utils/errors"
import { seedSessionGraph } from "../utils/graph"
import { openSession } from "../utils/workspace"

// The screenshot capture for Phase 5 (V5.1/V5.3/V5.4). It uses the canonical fixture (§7) through the
// app's own mocked server harness, so the images are the real routed session, not a Storybook host.
// Images are written only when GRAPH_CAPTURE_DIR is set (the `graph:capture` CLI); the assertions run
// either way, which is what `graph:capture --mode=verify` relies on.

const directory = "C:/OpenCode/SessionGraph"

const sessionID = "ses_session_graph"

const canvasHost = '[data-slot="graph-canvas-host"]'

const toolbar = '[data-slot="graph-toolbar"]'

const inspector = '[data-slot="graph-inspector"]'

const captureDir = process.env.GRAPH_CAPTURE_DIR

// The graph is behind an experimental flag, so every capture starts with it on.
const test = base.extend({
  page: async ({ page }, use) => {
    await seedSessionGraph(page)
    await use(page)
  },
})

// `baseline` writes only the transcript frame; `demo`/`compare`/`verify` walk the whole flow.
const mode = process.env.GRAPH_CAPTURE_MODE ?? "demo"

// Determinism (V5.3): fixed viewport, scale factor 1, a pinned scheme and locale; reduced motion is
// emulated per page (`page.emulateMedia`) because this Playwright build does not expose it as a fixture.
test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  locale: "en-US",
})

function graphFixture() {
  return {
    name: "SessionGraph",
    directory,
    sessions: [{ id: sessionID, title: "Session graph" }],
    pageMessages: () => ({ items: buildFixtureMessages() }),
    configEntries: [{ type: "document", info: { experimental: { all_flags: true } } }],
  }
}

async function capture(page: Page, name: string) {
  if (!captureDir) return
  // A menu the reader opened stays open; the frame is the map's record, not a stray dropdown.
  await page.evaluate(() => {
    document.querySelectorAll<HTMLDetailsElement>("details[data-slot^='graph-toolbar-']").forEach((menu) => {
      menu.open = false
    })
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


/** T14: the toolbar's menus are popovers on a wide row and one overflow menu on a narrow one. */
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

/** Picks a layout from the toolbar's layout menu. */
async function pickLayout(page: Page, layout: string) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layout"]`)
  const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!open) await menu.locator(":scope > summary").click()
  await page.locator(`${toolbar} [data-slot="graph-layout-option"][data-value="${layout}"]`).click()
}

// The graph paints on demand into a preserved drawing buffer, so the capture waits on the buffer itself
// rather than on DOM state. Two consecutive equal samples, taken across poll intervals, prove a camera
// flight or projection tween has settled; a single same-frame pair can be equal mid-tween.
async function waitForStillCanvas(page: Page) {
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
      { intervals: [100] },
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

async function closeLayers(page: Page) {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-layers"]`)
  if (await menu.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await menu.locator(":scope > summary").click()
  }
}

async function setLevel(page: Page, level: "Overview" | "Execution" | "Detail") {
  await openLayers(page)
  const levels = page.locator('[data-slot="graph-layers-level"]')
  // The SegmentedControl renders as a group with buttons inside; use CSS selector with hasText
  // to avoid issues with the group's aria-label interfering with getByRole.
  await levels.locator('button', { hasText: level }).click()
  await expect(levels.locator('button', { hasText: level })).toHaveAttribute("aria-pressed", "true")
  await closeLayers(page)
}

async function fit(page: Page) {
  // RF.7: a narrow toolbar keeps the fit control inside the overflow menu; open it, click, and close.
  const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
  const compact = (await overflow.count()) > 0

  if (compact) await overflow.getByLabel("More controls").click()
  await page.locator(toolbar).getByRole("button", { name: "Fit to view", exact: true }).click()

  if (compact) await overflow.getByLabel("More controls").click()
}

async function zoomPercent(page: Page) {
  const text = await page.locator('[data-slot="graph-zoom-level"]').textContent()

  return Number.parseInt((text ?? "0").replace("%", ""), 10)
}

// The camera acts asynchronously: the readout must reflect the click before the next decision is
// made, or the capture counts clicks the camera never took (T6.20).
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

// The toolbar steps a tenth of the fit, so the readout lands within one step of the target.
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

// The closest zoom the renderer allows: the toolbar's own limit, which the renderer declares, so
// the frame is the same magnification every run.
async function zoomToMax(page: Page) {
  for (let step = 0; step < 60; step += 1) {
    if (!(await zoomEnabled(page, "Zoom in"))) return await zoomPercent(page)

    await clickZoom(page, "Zoom in")
  }

  throw new Error("graph:capture: the camera never reached its maximum zoom")
}

// The search is the reader's own way of moving the camera: picking a result selects the node and
// centres the camera on it.
async function focusNode(page: Page, nodeId: string, query: string) {
  await page.getByRole("button", { name: "Search the graph" }).click()
  const search = page.getByRole("dialog", { name: "Search the graph" })
  await search.getByRole("combobox").fill(query)
  await search.locator(`[data-node-id="${nodeId}"]`).click()
  await waitForStillCanvas(page)
}


// Each frame is its own test so it can be generated in isolation (`-g "<frame>"`); the shared setup
// below makes every frame deterministic without depending on the frames before it.
function workspaceFixture() {
  return { ...graphFixture(), graphWorkspace: buildFixtureSnapshot() }
}

async function openGraph(page: Page, input = graphFixture()) {
  await openSession(page, input)
  await settle(page)
  await page.getByRole("button", { name: "Toggle graph view" }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-renderer", "spacegraph")
}

async function still(page: Page) {
  await waitForStillCanvas(page)
}

async function chooseProfile(page: Page, profile: string) {
  await openLayers(page)
  // New UI: preset buttons inside the Layers menu with data-slot="graph-lens-preset"
  await page.locator('[data-slot="graph-lens-preset"][data-value="' + profile + '"]').click()
  await closeLayers(page)
}

async function chooseDepth(page: Page, depth: string) {
  await openLayers(page)
  await page.locator('[data-slot="graph-layers-depth"]').selectOption(depth)
  await closeLayers(page)
}

// Gap 6: the gallery is the comparison surface, so every preview must be readable on its own.
// The previews are static SVG, so the only production seam needed is the DOM the gallery already
// renders; contrast follows the same WCAG ratio the contract's ContrastAuditor uses.
const GALLERY_MIN_FONT_PX = 9
const GALLERY_MIN_CONTRAST = 4.5

function relativeLuminance(color: string): number | undefined {
  const match = color.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/)
  if (!match) return undefined
  const channel = (value: string) => {
    const c = Number(value) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(match[1]) + 0.7152 * channel(match[2]) + 0.0722 * channel(match[3])
}

function contrastRatio(foreground: string, background: string): number | undefined {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  if (a === undefined || b === undefined) return undefined
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

// Gap 3: a CSS3D card in the content plane shears under a tilted camera. The billboard switch is the
// product's fix; compare each card's on-screen aspect to its CSS box to measure shear without reading
// the renderer's transform. A screen-facing card keeps its aspect (ratio ≈ 1) at any camera pose.
async function measureCardShear(page: Page) {
  return page.evaluate(() => {
    return [...document.querySelectorAll<HTMLElement>(".html-node-container")].map((card) => {
      const box = card.getBoundingClientRect()
      return {
        id: card.dataset.nodeId,
        width: box.width,
        height: box.height,
        ratio:
          card.offsetWidth > 0 && card.offsetHeight > 0 && box.height > 0
            ? box.width / box.height / (card.offsetWidth / card.offsetHeight)
            : 1,
      }
    })
  })
}

async function measureGallery(page: Page) {
  return page.evaluate(() => {
    const items = [...document.querySelectorAll('[data-slot="graph-gallery-item"]')]
    return items.map((item) => {
      const svg = item.querySelector("svg")
      const texts = svg ? [...svg.querySelectorAll("text")] : []
      const fontSizes = texts.map((text) => Number.parseFloat(getComputedStyle(text).fontSize))
      const fill = texts.length ? getComputedStyle(texts[0]).fill : ""
      const preview = item.querySelector("span")
      const background = preview ? getComputedStyle(preview).backgroundColor : ""
      const box = svg?.getBoundingClientRect()
      return {
        strategy: item.getAttribute("data-strategy"),
        hasSvg: Boolean(svg),
        textCount: texts.length,
        minFontSize: fontSizes.length ? Math.min(...fontSizes) : 0,
        fill,
        background,
        width: box?.width ?? 0,
        height: box?.height ?? 0,
      }
    })
  })
}

test("01 log", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openSession(page, graphFixture())
  await settle(page)
  await capture(page, "01-log.png")
  expect(errors).toEqual([])
})

test("02 graph overview", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Overview")
  await fit(page)
  await still(page)
  await capture(page, "02-graph-overview.png")
  expect(errors).toEqual([])
})

test("03 graph execution", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Overview")
  await fit(page)
  await still(page)
  const overviewFrame = await canvasSample(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  expect(await canvasSample(page)).not.toEqual(overviewFrame)
  await capture(page, "03-graph-execution.png")
  expect(errors).toEqual([])
})

test("04 graph selected", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await page.getByRole("button", { name: "Search the graph" }).click()
  const search = page.getByRole("dialog", { name: "Search the graph" })
  await search.getByRole("combobox").fill("token.ts")
  await search.getByRole("option", { name: "src/auth/token.ts", exact: true }).click()
  await expect(page.locator(inspector).getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible()
  await still(page)
  await capture(page, "04-graph-selected.png")
  expect(errors).toEqual([])
})

test("05 return to log", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await page.getByRole("button", { name: "Toggle graph view" }).click()
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable({ timeout: 15000 })
  await expect(page.locator('[data-component="composer-editor"]')).toBeVisible({ timeout: 15000 })
  await settle(page)
  await capture(page, "05-return-to-log.png")
  expect(errors).toEqual([])
})

test("06 graph 3d", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await chooseDepth(page, "orbit")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-projection", "3d")
  await still(page)
  await fit(page)
  await still(page)
  await capture(page, "06-graph-3d.png")
  expect(errors).toEqual([])
})

test("11 graph timeline", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await chooseDepth(page, "flat")
  await setLevel(page, "Execution")
  await pickLayout(page, "timeline")
  await fit(page)
  await still(page)
  await capture(page, "11-graph-timeline.png")
  expect(errors).toEqual([])
})

test("12 graph hierarchy", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await chooseDepth(page, "flat")
  await setLevel(page, "Execution")
  await pickLayout(page, "hierarchy")
  await fit(page)
  await still(page)
  await capture(page, "12-graph-hierarchy.png")
  expect(errors).toEqual([])
})

test("13 graph narrow", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await page.setViewportSize({ width: 390, height: 900 })
  await fit(page)
  await still(page)
  await capture(page, "13-graph-narrow.png")
  await page.setViewportSize({ width: 1440, height: 900 })
  expect(errors).toEqual([])
})

test("14 graph light", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await page.emulateMedia({ colorScheme: "light" })
  await setLevel(page, "Overview")
  await fit(page)
  await still(page)
  await capture(page, "14-graph-light.png")
  expect(errors).toEqual([])
})

test("15 graph ribbon", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Overview")
  await pickLayout(page, "ribbon")
  await still(page)
  await fit(page)
  await still(page)
  await capture(page, "15-graph-ribbon.png")
  expect(errors).toEqual([])
})

test("16 graph matrix", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Overview")
  await pickLayout(page, "matrix")
  await still(page)
  await fit(page)
  await still(page)
  await capture(page, "16-graph-matrix.png")
  expect(errors).toEqual([])
})

test("17 graph files", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await openMenu(page)
  await page.locator(toolbar).getByRole("button", { name: "Toggle changed files", exact: true }).click()
  await expect(page.locator('[data-slot="graph-file-rail"]')).toBeVisible()
  await fit(page)
  await still(page)
  await capture(page, "17-graph-files.png")
  expect(errors).toEqual([])
})

test("18 graph layered", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
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
  expect(errors).toEqual([])
})

test("19 graph depth stack", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await chooseDepth(page, "orbit")
  await chooseDepth(page, "depth-stack")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-depth", "depth-stack")
  await still(page)
  await fit(page)
  await still(page)
  await capture(page, "19-graph-depth-stack.png")
  expect(errors).toEqual([])
})

test("20 graph zoom 150", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await zoomToPercent(page, 150)
  await still(page)
  await capture(page, "20-graph-zoom-150.png")
  expect(errors).toEqual([])
})

test("21 graph zoom max", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await zoomToMax(page)
  await still(page)
  await capture(page, "21-graph-zoom-max.png")
  expect(errors).toEqual([])
})

test("22 graph turn 1", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await zoomToPercent(page, 150)
  await focusNode(page, "turn:msg_user_1", "authentication test failures")
  await capture(page, "22-graph-turn-1.png")
  expect(errors).toEqual([])
})

test("23 graph turn 2", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await focusNode(page, "turn:msg_user_2", "cover the refresh path")
  await capture(page, "23-graph-turn-2.png")
  expect(errors).toEqual([])
})

test("24 graph failure chain", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  await zoomToMax(page)
  await focusNode(page, "tool:prt_tool_shell_2", "FAIL auth refresh token")
  await capture(page, "24-graph-failure-chain.png")
  expect(errors).toEqual([])
})

test("28 graph tree", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await pickLayout(page, "tree")
  await fit(page)
  await still(page)
  await capture(page, "28-graph-tree.png")
  expect(errors).toEqual([])
})

test("29 graph force", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await pickLayout(page, "force")
  await fit(page)
  await still(page)
  await capture(page, "29-graph-force.png")
  expect(errors).toEqual([])
})

test("30 graph gallery", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await openMenu(page)
  await page.locator(toolbar).getByRole("button", { name: "Compare the layouts", exact: true }).click()
  await expect(page.locator('[data-slot="graph-gallery"]')).toBeVisible()
  const previews = await measureGallery(page)
  expect(previews.length, "every layout gets a preview").toBeGreaterThanOrEqual(7)
  expect(previews.filter((preview) => preview.hasSvg).length).toBe(previews.length)
  let measuredText = 0
  for (const preview of previews) {
    expect(preview.width, `${preview.strategy}: preview width`).toBeGreaterThan(80)
    expect(preview.height, `${preview.strategy}: preview height`).toBeGreaterThan(40)
    if (preview.textCount === 0) continue
    measuredText += 1
    expect(preview.minFontSize, `${preview.strategy}: preview font size`).toBeGreaterThanOrEqual(GALLERY_MIN_FONT_PX)
    const ratio = contrastRatio(preview.fill, preview.background)
    expect(ratio, `${preview.strategy}: preview contrast`).toBeDefined()
    expect(ratio!, `${preview.strategy}: preview contrast`).toBeGreaterThanOrEqual(GALLERY_MIN_CONTRAST)
  }
  expect(measuredText, "previews carry legible labels").toBeGreaterThan(0)
  await capture(page, "30-graph-gallery.png")
  await page.keyboard.press("Escape")
  await expect(page.locator('[data-slot="graph-gallery"]')).toHaveCount(0)
  expect(errors).toEqual([])
})

test("31 graph perspective", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
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
  expect(errors).toEqual([])
})

test("32 graph workspace code", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  const workspaceResponse = page.waitForResponse((response) => response.url().includes("/api/graph/workspace"))
  await openGraph(page, workspaceFixture())
  expect((await (await workspaceResponse).json()).data.packages).toHaveLength(2)
  await setLevel(page, "Detail")
  await pickLayout(page, "hierarchy")
  await chooseProfile(page, "code")
  const a11yNodes = page.locator('[data-component="session-graph-a11y"] li')
  await expect(a11yNodes.filter({ hasText: "refreshToken" })).not.toHaveCount(0)
  await still(page)
  await fit(page)
  await still(page)
  await capture(page, "32-graph-workspace-code.png")
  expect(errors).toEqual([])
})

test("33 graph workspace all", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  const workspaceResponse = page.waitForResponse((response) => response.url().includes("/api/graph/workspace"))
  await openGraph(page, workspaceFixture())
  expect((await (await workspaceResponse).json()).data.packages).toHaveLength(2)
  await setLevel(page, "Overview")
  await pickLayout(page, "tree")
  await chooseProfile(page, "all")
  const a11yNodes = page.locator('[data-component="session-graph-a11y"] li')
  await expect(a11yNodes.filter({ hasText: "@project/ui" })).not.toHaveCount(0)
  await still(page)
  await fit(page)
  await still(page)
  await capture(page, "33-graph-workspace-all.png")
  expect(errors).toEqual([])
})

test("34 graph surfaces", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await page.getByRole("button", { name: "Show the graph beside the log" }).click()
  await expect(page.locator('[data-slot="spacegraph-surface-hybrid"]')).toBeVisible()
  await setLevel(page, "Execution")
  await chooseProfile(page, "code")
  await fit(page)
  await still(page)
  await capture(page, "34-graph-surfaces.png")
  expect(errors).toEqual([])
})

test("35 graph scrubber", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  // The scrubber is folded into the toolbar; open it for the frame.
  await page.locator('[data-slot="graph-time-toggle"]').click()
  const scrubber = page.locator('[data-slot="session-graph-scrubber"] input')
  await expect(scrubber).toBeVisible()
  await scrubber.press("Home")
  await expect(page.locator('[data-slot="session-graph-scrubber"] output')).toContainText("1")
  await fit(page)
  await still(page)
  await capture(page, "35-graph-scrubber.png")
  expect(errors).toEqual([])
})

test("36 graph trace overlay", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  // Trigger "Why?" trace on the first user message
  await focusNode(page, "turn:msg_user_1", "authentication test failures")
  await page.locator(inspector).getByRole("button", { name: "Why?" }).click()
  await still(page)
  await capture(page, "36-graph-trace-overlay.png")
  expect(errors).toEqual([])
})

test("37 graph collapsed group", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await setLevel(page, "Execution")
  await fit(page)
  await still(page)
  // Select a phase group node and collapse it via the status bar
  await focusNode(page, "phase:turn:msg_user_1:explore:1", "explore")
  await expect(page.locator(inspector)).toBeVisible()
  // Collapse the group via the status bar
  await page.locator('[data-slot="graph-status-bar"] [data-slot="graph-status-group-toggle"]').click()
  await still(page)
  await capture(page, "37-graph-collapsed-group.png")
  expect(errors).toEqual([])
})

test("38 graph card shear", async ({ page }) => {
  test.skip(mode === "baseline", "baseline captures the transcript only")
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGraph(page)
  await chooseDepth(page, "orbit")
  await fit(page)
  await still(page)

  const plane = await measureCardShear(page)
  const planeDrawn = plane.filter((card) => card.width > 0 && card.height > 0)
  expect(planeDrawn.length, "drawn cards under a tilted camera").toBeGreaterThan(0)

  await openMenu(page)
  await page.locator(toolbar).getByRole("button", { name: "Billboard cards" }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-card-facing", "camera")
  await still(page)

  const billboard = await measureCardShear(page)
  const drawn = billboard.filter((card) => card.width > 0 && card.height > 0)
  expect(drawn.length, "drawn cards keep their box").toBeGreaterThan(0)
  for (const card of drawn) {
    expect(card.width, `${card.id}: card width`).toBeGreaterThanOrEqual(8)
    expect(card.height, `${card.id}: card height`).toBeGreaterThanOrEqual(8)
  }
  const sheared = drawn.filter((card) => card.ratio < 0.85 || card.ratio > 1.15)
  expect(
    sheared.length / drawn.length,
    `billboarded cards keep their aspect (plane mean ${(planeDrawn.reduce((sum, card) => sum + card.ratio, 0) / planeDrawn.length).toFixed(2)})`,
  ).toBeLessThan(0.1)
  expect(errors).toEqual([])
})
