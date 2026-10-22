import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test as base, type Page } from "@playwright/test"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
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
async function openMenu(page: Page, which: "draw" | "show") {
  const menu = page.locator(`${toolbar} [data-slot="graph-toolbar-${which}"]`)
  if ((await menu.count()) > 0) {
    const open = await menu.evaluate((element) => (element as HTMLDetailsElement).open)
    if (!open) await menu.locator("summary").click()
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
  if (!open) await menu.locator("summary").click()
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

async function setLevel(page: Page, level: "Overview" | "Execution" | "Detail") {
  await page.locator(toolbar).getByRole("button", { name: level, exact: true }).click()
  await expect(page.locator(toolbar).getByRole("button", { name: level, exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
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

test("captures the transcript, graph levels, selection, return, and 3D", async ({ page }) => {
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })

  // 01 — the transcript baseline.
  await openSession(page, graphFixture())
  await settle(page)
  await capture(page, "01-log.png")

  if (mode === "baseline") {
    expect(errors).toEqual([])

    return
  }

  // 02 — overview: turns and phases carry meaning, tool calls are counts.
  await page.getByRole("button", { name: "Toggle graph view" }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-renderer", "spacegraph")
  await setLevel(page, "Overview")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "02-graph-overview.png")

  // 03 — execution: tool calls and provenance files become individual objects. The level change must
  // always reach the canvas: a representation change that does not repaint is the U3.3/U3.4 contract bug.
  const overviewFrame = await canvasSample(page)
  await setLevel(page, "Execution")
  await fit(page)
  await waitForStillCanvas(page)
  expect(await canvasSample(page)).not.toEqual(overviewFrame)
  await capture(page, "03-graph-execution.png")

  // 04 — a selected node with inspector detail in the DOM panel.
  await page.getByRole("button", { name: "Search the graph" }).click()
  const search = page.getByRole("dialog", { name: "Search the graph" })
  await search.getByRole("combobox").fill("token.ts")
  await search.getByRole("option", { name: "src/auth/token.ts", exact: true }).click()
  await expect(page.locator(inspector).getByRole("heading", { name: "src/auth/token.ts" })).toBeVisible()
  await waitForStillCanvas(page)
  await capture(page, "04-graph-selected.png")

  // 05 — return to the transcript (the header toggle; the toolbar's back control sits under the floating header).
  await page.getByRole("button", { name: "Toggle graph view" }).click()
  await expect(page.locator('[data-component="composer-editor"]')).toBeEditable()
  await settle(page)
  await capture(page, "05-return-to-log.png")

  // 06 — the 3D (orbit) depth on the same model.
  await page.getByRole("button", { name: "Toggle graph view" }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
  await openMenu(page, "draw")
  await page.locator(toolbar).getByRole("button", { name: "Orbit", exact: true }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-projection", "3d")
  await waitForStillCanvas(page)
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "06-graph-3d.png")

  // 18 — the `layered` depth treatment (LE.14): a shallow camera and a subtle depth fade, still
  // billboarded and flat-card; the depth spectrum's minimum legible 2.5D bar.
  await openMenu(page, "draw")
  await page.locator(toolbar).getByRole("button", { name: "Layer", exact: true }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-depth", "layered")
  await waitForStillCanvas(page)
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "18-graph-layered.png")

  // 19 — the `depth-stack` treatment (LE.14/LE.16): the last depth value, completing the spectrum at
  // the benchmark lanes layout. The matrix captures one frame per option value (LE.16). The pose
  // animates, so settle before fitting (the fit measures the projected bounds of the settled camera).
  await openMenu(page, "draw")
  await page.locator(toolbar).getByRole("button", { name: "Stack", exact: true }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-depth", "depth-stack")
  await waitForStillCanvas(page)
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "19-graph-depth-stack.png")

  // 31 — the tilted camera with the billboard off: the cards lie in the content plane, so the
  // perspective shears them. That shear is the camera working, not a broken renderer (T1.19), and
  // this frame is the proof. The billboard is off by default; the toggle is exercised to show it
  // is the switch that turns the cards back to face the reader.
  await openMenu(page, "draw")
  await page.locator(toolbar).getByRole("button", { name: "Orbit", exact: true }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-depth", "orbit")
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-card-facing", "plane")
  await setLevel(page, "Detail")
  await waitForStillCanvas(page)
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "31-graph-perspective.png")

  // 11 — the Timeline layout strategy (RF.2) on the same model.
  await openMenu(page, "draw")
  await page.locator(toolbar).getByRole("button", { name: "Flat", exact: true }).click()
  await setLevel(page, "Execution")
  await pickLayout(page, "timeline")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "11-graph-timeline.png")

  // 12 — the Hierarchy layout strategy: ancestry reads as an indent, not a horizontal fan.
  await pickLayout(page, "hierarchy")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "12-graph-hierarchy.png")

  // 28 — the Tree layout (T7.2): the work hangs under the turn it belongs to, and the tree grows
  // downward. A different geometry, not a redraw of the lanes.
  await pickLayout(page, "tree")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "28-graph-tree.png")

  // 29 — the Force layout (T7.3): the session's own shape. Linked work pulls together, the rest
  // drifts apart.
  await pickLayout(page, "force")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "29-graph-force.png")

  // 30 — the layout gallery (T7.5): the same model in every layout, side by side.
  await openMenu(page, "show")
  await page.locator(toolbar).getByRole("button", { name: "Compare the layouts", exact: true }).click()
  await expect(page.locator('[data-slot="graph-gallery"]')).toBeVisible()
  await capture(page, "30-graph-gallery.png")
  await page.keyboard.press("Escape")
  await expect(page.locator('[data-slot="graph-gallery"]')).toHaveCount(0)

  // 15 — the turn ribbon layout (LE.8): one horizontal bar of phase segments per turn. The summary
  // layouts draw the level's grain, so the overview is the frame that shows the phase segments. The
  // layout swaps the whole geometry, so let the adapter settle before framing the new bounds.
  await setLevel(page, "Overview")
  await pickLayout(page, "ribbon")
  await waitForStillCanvas(page)
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "15-graph-ribbon.png")

  // 16 — the turn matrix layout (LE.9): turns as rows, phase categories as columns.
  await pickLayout(page, "matrix")
  await waitForStillCanvas(page)
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "16-graph-matrix.png")

  // Back to the node-link graph, lanes layout, for the file lens and the narrow/light frames.
  await pickLayout(page, "lanes")
  await setLevel(page, "Execution")

  // 20 — camera zoom at 150% of the fit. The toolbar steps a tenth of the fit, so the readout is 150%.
  await fit(page)
  await waitForStillCanvas(page)
  await zoomToPercent(page, 150)
  await waitForStillCanvas(page)
  await capture(page, "20-graph-zoom-150.png")

  // 21 — the closest zoom the renderer allows.
  await zoomToMax(page)
  await waitForStillCanvas(page)
  await capture(page, "21-graph-zoom-max.png")

  // 22 — the camera centred on the first turn, read at the 150% zoom.
  await fit(page)
  await waitForStillCanvas(page)
  await zoomToPercent(page, 150)
  await focusNode(page, "turn:msg_user_1", "authentication test failures")
  await capture(page, "22-graph-turn-1.png")

  // 23 — the camera centred on the second turn.
  await focusNode(page, "turn:msg_user_2", "cover the refresh path")
  await capture(page, "23-graph-turn-2.png")

  // 24 — the failure chain: the failing test run, read at the closest zoom.
  await zoomToMax(page)
  await focusNode(page, "tool:prt_tool_shell_2", "FAIL auth refresh token")
  await capture(page, "24-graph-failure-chain.png")

  // 17 — the file-first lens (LE.12): the changed-files rail with provenance bundled to turn spines.
  await openMenu(page, "draw")
  await page.locator(toolbar).getByRole("button", { name: "Toggle changed files", exact: true }).click()
  await expect(page.locator('[data-slot="graph-file-rail"]')).toBeVisible()
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "17-graph-files.png")
  await openMenu(page, "draw")
  await page.locator(toolbar).getByRole("button", { name: "Toggle changed files", exact: true }).click()

  // 13 — a narrow 390×900 viewport (RF.11): the toolbar wraps and the canvas stays framed.
  await page.setViewportSize({ width: 390, height: 900 })
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "13-graph-narrow.png")
  await page.setViewportSize({ width: 1440, height: 900 })

  // 14 — light scheme parity (RF.9/RF.11): the same model re-themes from the host tokens.
  await page.emulateMedia({ colorScheme: "light" })
  await setLevel(page, "Overview")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "14-graph-light.png")

  expect(errors).toEqual([])
})
