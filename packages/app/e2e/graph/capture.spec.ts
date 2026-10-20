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
  mkdirSync(captureDir, { recursive: true })
  await page.screenshot({ path: resolve(captureDir, name) })
}

function canvasSample(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-slot="graph-canvas-host"] canvas')

    return canvas ? canvas.toDataURL() : ""
  })
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

async function zoomIn(page: Page, clicks: number) {
  const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
  const compact = (await overflow.count()) > 0

  if (compact) await overflow.getByLabel("More controls").click()
  const zoomInBtn = page.locator(toolbar).getByRole("button", { name: "Zoom in", exact: true })

  for (let i = 0; i < clicks; i++) {
    await zoomInBtn.click()
    await page.waitForTimeout(50) // small delay for zoom animation
  }

  if (compact) await overflow.getByLabel("More controls").click()
}

async function selectViaHarness(page: Page, nodeId: string) {
  await page.evaluate((id) => {
    // SAFETY: __sessionGraphView is set by SessionGraphView in dev mode only
    const w = window as { __sessionGraphView?: { select: (id: string) => void } }
    const harness = w.__sessionGraphView
    harness?.select(id)
  }, nodeId)
  await fit(page)
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
  await page.locator(toolbar).getByRole("button", { name: "Orbit", exact: true }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-projection", "3d")
  await waitForStillCanvas(page)
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "06-graph-3d.png")

  // 18 — the `layered` depth treatment (LE.14): a shallow camera and a subtle depth fade, still
  // billboarded and flat-card; the depth spectrum's minimum legible 2.5D bar.
  await page.locator(toolbar).getByRole("button", { name: "Layer", exact: true }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-depth", "layered")
  await waitForStillCanvas(page)
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "18-graph-layered.png")

  // 19 — the `depth-stack` treatment (LE.14/LE.16): the last depth value, completing the spectrum at
  // the benchmark lanes layout. The matrix captures one frame per option value (LE.16). The pose
  // animates, so settle before fitting (the fit measures the projected bounds of the settled camera).
  await page.locator(toolbar).getByRole("button", { name: "Stack", exact: true }).click()
  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-depth", "depth-stack")
  await waitForStillCanvas(page)
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "19-graph-depth-stack.png")

  // 11 — the Timeline layout strategy (RF.2) on the same model.
  await page.locator(toolbar).getByRole("button", { name: "Flat", exact: true }).click()
  await setLevel(page, "Execution")
  await page.locator(toolbar).getByRole("button", { name: "Timeline", exact: true }).click()
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "11-graph-timeline.png")

  // 12 — the Hierarchy layout strategy: ancestry reads as an indent, not a horizontal fan.
  await page.locator(toolbar).getByRole("button", { name: "Hierarchy", exact: true }).click()
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "12-graph-hierarchy.png")

  // 15 — the turn ribbon representation (LE.8): one horizontal bar of phase segments per turn. The
  // representation swaps the whole layout, so let the adapter settle before framing the new bounds.
  await page.locator(toolbar).getByRole("button", { name: "Ribbon", exact: true }).click()
  await waitForStillCanvas(page)
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "15-graph-ribbon.png")

  // 16 — the turn matrix representation (LE.9): turns as rows, phase categories as columns.
  await page.locator(toolbar).getByRole("button", { name: "Matrix", exact: true }).click()
  await waitForStillCanvas(page)
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "16-graph-matrix.png")

  // Back to the node-link graph, lanes layout, for the file lens and the narrow/light frames.
  await page.locator(toolbar).getByRole("button", { name: "Graph", exact: true }).click()
  await page.locator(toolbar).getByRole("button", { name: "Lanes", exact: true }).click()

  // 20 — camera zoom ~1.5× fit (150%). The toolbar zoom steps by ~8%; 6 clicks from 100% ≈ 148%.
  await fit(page)
  await waitForStillCanvas(page)
  await zoomIn(page, 6)
  await waitForStillCanvas(page)
  await capture(page, "20-graph-zoom-150.png")

  // 21 — camera zoom ~2.5× fit (250%). Additional 13 clicks from 150% ≈ 254%.
  await zoomIn(page, 13)
  await waitForStillCanvas(page)
  await capture(page, "21-graph-zoom-250.png")

  // 22 — pan to turn 1 (first turn with tool calls). Select the turn and fit to frame it.
  await selectViaHarness(page, "turn:msg_plan_1")
  await capture(page, "22-graph-turn-1.png")

  // 23 — pan to turn 2 (recovery turn). Select the turn and fit to frame it.
  await selectViaHarness(page, "turn:msg_recovery_1")
  await capture(page, "23-graph-turn-2.png")

  // 24 — detail frame centred on the failure chain. Select a failed tool and fit.
  await selectViaHarness(page, "tool:prt_tool_shell_2")
  await capture(page, "24-graph-failure-chain.png")

  // 17 — the file-first lens (LE.12): the changed-files rail with provenance bundled to turn spines.
  await page.locator(toolbar).getByRole("button", { name: "Toggle changed files", exact: true }).click()
  await expect(page.locator('[data-slot="graph-file-rail"]')).toBeVisible()
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "17-graph-files.png")
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
