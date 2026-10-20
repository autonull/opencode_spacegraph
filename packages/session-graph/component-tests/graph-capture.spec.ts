import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { expect, story } from "../../storybook/playwright/story"

// The Cytoscape half of the Phase 5 capture (V5.4). The app has no renderer switch, so the second
// backend is captured through its Storybook story over the same canonical fixture. Writes only when
// GRAPH_CAPTURE_DIR is set, exactly like the app-side `capture.spec.ts`.
//
// The camera is driven the way a reader drives it — the toolbar's zoom control and the search — so
// the frames show what their names say on both backends (T6.19).

const captureDir = process.env.GRAPH_CAPTURE_DIR

type Harness = {
  select: (id: string | undefined) => void
}

story.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })

async function capture(page: import("@playwright/test").Page, name: string) {
  if (!captureDir) return
  mkdirSync(captureDir, { recursive: true })
  await page.screenshot({ path: resolve(captureDir, name) })
}

async function waitForStillCanvas(page: import("@playwright/test").Page) {
  let previous = ""
  let still = 0

  await expect
    .poll(
      async () => {
        const current = await page.evaluate(() => {
          const canvas = document.querySelector<HTMLCanvasElement>('[data-slot="graph-canvas-host"] canvas')
          return canvas ? canvas.toDataURL() : ""
        })
        still = current !== "" && current === previous ? still + 1 : 0
        previous = current
        return still >= 2
      },
      { intervals: [100] },
    )
    .toBe(true)
}

async function zoomPercent(page: import("@playwright/test").Page, root: import("@playwright/test").Locator) {
  const text = await root.locator('[data-slot="graph-zoom-level"]').textContent()
  return Number.parseInt((text ?? "0").replace("%", ""), 10)
}

// The camera acts asynchronously: the readout must reflect the click before the next decision is
// made, or the capture counts clicks the camera never took (T6.20).
async function clickZoom(
  page: import("@playwright/test").Page,
  root: import("@playwright/test").Locator,
  label: "Zoom in" | "Zoom out",
) {
  const before = await zoomPercent(page, root)
  await root.getByRole("button", { name: label, exact: true }).click()
  await expect.poll(() => zoomPercent(page, root)).not.toBe(before)
}

// The toolbar steps a tenth of the fit, so the readout lands within one step of the target.
async function zoomToPercent(
  page: import("@playwright/test").Page,
  root: import("@playwright/test").Locator,
  target: number,
) {
  for (let step = 0; step < 60; step += 1) {
    const current = await zoomPercent(page, root)
    if (Math.abs(current - target) <= 4) return current
    const button = root.getByRole("button", { name: current < target ? "Zoom in" : "Zoom out", exact: true })
    if (!(await button.isEnabled())) return current
    await clickZoom(page, root, current < target ? "Zoom in" : "Zoom out")
  }

  throw new Error(`graph:capture: the camera never reached ${target}%`)
}

// The closest zoom the renderer allows: the toolbar's own limit, which the renderer declares, so
// the frame is the same magnification every run.
async function zoomToMax(page: import("@playwright/test").Page, root: import("@playwright/test").Locator) {
  const zoomIn = root.getByRole("button", { name: "Zoom in", exact: true })

  for (let step = 0; step < 60; step += 1) {
    if (!(await zoomIn.isEnabled())) return await zoomPercent(page, root)
    await clickZoom(page, root, "Zoom in")
  }

  throw new Error("graph:capture: the camera never reached its maximum zoom")
}

// Picking a search result selects the node and centres the camera on it.
async function focusNode(
  page: import("@playwright/test").Page,
  root: import("@playwright/test").Locator,
  nodeId: string,
  query: string,
) {
  await root.getByRole("button", { name: "Search the graph" }).click()
  const search = root.getByRole("dialog", { name: "Search the graph" })
  await search.getByRole("combobox").fill(query)
  await search.locator(`[data-node-id="${nodeId}"]`).click()
  await waitForStillCanvas(page)
}

story("captures the Cytoscape adapter over the canonical fixture", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view--cytoscape")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })
  await expect(host).toHaveAttribute("data-graph-renderer", "cytoscape")
  await expect(root.locator('[data-slot="cytoscape-card"]').first()).toBeVisible()
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await root.getByRole("button", { name: "Fit to view", exact: true }).click()
  await capture(page, "07-cytoscape-overview.png")

  await page.evaluate(() => (window as unknown as { __graphView: Harness }).__graphView.select("file:src/auth/token.ts"))
  await expect(root.locator('[data-slot="graph-inspector"]').getByText("src/auth/token.ts").first()).toBeVisible()
  await root.getByRole("button", { name: "Fit to view", exact: true }).click()
  await capture(page, "08-cytoscape-selected.png")

  // 20 — camera zoom at 150% of the fit. The toolbar steps a tenth of the fit, so the readout is 150%.
  await root.getByRole("button", { name: "Fit to view", exact: true }).click()
  await zoomToPercent(page, root, 150)
  await waitForStillCanvas(page)
  await capture(page, "20-cytoscape-zoom-150.png")

  // 21 — the closest zoom the renderer allows.
  await zoomToMax(page, root)
  await waitForStillCanvas(page)
  await capture(page, "21-cytoscape-zoom-max.png")

  // 22 — the camera centred on the first turn, read at the 150% zoom.
  await root.getByRole("button", { name: "Fit to view", exact: true }).click()
  await zoomToPercent(page, root, 150)
  await focusNode(page, root, "turn:msg_user_1", "authentication test failures")
  await capture(page, "22-cytoscape-turn-1.png")

  // 23 — the camera centred on the second turn.
  await focusNode(page, root, "turn:msg_user_2", "cover the refresh path")
  await capture(page, "23-cytoscape-turn-2.png")

  // 24 — the failure chain: the failing test run, read at the closest zoom.
  await zoomToMax(page, root)
  await focusNode(page, root, "tool:prt_tool_shell_2", "FAIL auth refresh token")
  await capture(page, "24-cytoscape-failure-chain.png")

  expect(errors).toEqual([])
})

/**
 * 25 — a long session at the drawn window (T6.6). The map shows its recent tail and says how much
 * of the session it left out, so a capped view is never a silent one.
 */
story("captures a long session at the drawn window", async ({ mount, page }) => {
  const errors: string[] = []

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view--scale")
  const host = root.locator('[data-slot="graph-canvas-host"]')

  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })
  await expect(root.locator('[data-slot="graph-scale-notice"]')).toBeVisible()
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await root.getByRole("button", { name: "Fit to view", exact: true }).click()
  await capture(page, "25-graph-scale-window.png")

  expect(errors).toEqual([])
})
