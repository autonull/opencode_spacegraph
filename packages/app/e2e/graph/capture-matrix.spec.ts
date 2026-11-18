import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test as base, type Page } from "@playwright/test"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { trackPageErrors } from "../utils/errors"
import { seedSessionGraph } from "../utils/graph"
import { openSession } from "../utils/workspace"

// P5.1 on the OpenCode surface. The explorer's matrix proves the full 19-axis space; this spec feeds
// the same sampling policy into the axes the app toolbar owns. Cells come from the committed
// app-cells.json so the gate is deterministic and shares the library sampler with the explorer. Each
// cell gets its own page: switching depth repeatedly on one mounted graph trips a pre-existing Solid
// recursion bug in the keeper suite, and isolation is also what the rest of the capture gate relies on.
const directory = "C:/OpenCode/SessionGraph"
const sessionID = "ses_session_graph"
const canvasHost = '[data-slot="graph-canvas-host"]'
const toolbar = '[data-slot="graph-toolbar"]'
const captureDir = process.env.GRAPH_CAPTURE_DIR
const matrixPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../docs/spacegraph/screenshots/matrix/app-cells.json")
const matrix = JSON.parse(readFileSync(matrixPath, "utf8")) as {
  cells: { id: string; values: Record<string, string> }[]
  strategy: string
  seed: number
  sampled: number
}

const test = base.extend({
  page: async ({ page }, use) => {
    await seedSessionGraph(page)
    await use(page)
  },
})

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  locale: "en-US",
  actionTimeout: 15_000,
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

function canvasSample(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-slot="graph-canvas-host"] canvas')
    return canvas ? canvas.toDataURL() : ""
  })
}

async function still(page: Page) {
  let previous = ""
  let count = 0
  await expect
    .poll(
      async () => {
        const current = await canvasSample(page)
        count = current !== "" && current === previous ? count + 1 : 0
        previous = current
        return count >= 2
      },
      { intervals: [100] },
    )
    .toBe(true)
}

async function openMenu(page: Page, slot: string) {
  const menu = page.locator(`${toolbar} [data-slot="${slot}"]`)
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await menu.locator(":scope > summary").click()
  }
}

async function closeMenu(page: Page, slot: string) {
  const menu = page.locator(`${toolbar} [data-slot="${slot}"]`)
  if (await menu.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await menu.locator(":scope > summary").click()
  }
}

const levelLabels: Record<string, string> = {
  overview: "Overview",
  execution: "Execution",
  detail: "Detail",
}

async function applyCell(page: Page, values: Record<string, string>) {
  await openMenu(page, "graph-toolbar-layout")
  await page.locator(`${toolbar} [data-slot="graph-layout-option"][data-value="${values.layout}"]`).click()
  await still(page)

  await openMenu(page, "graph-toolbar-layers")
  await page.locator('[data-slot="graph-layers-depth"]').selectOption(values.depth)
  await still(page)

  await openMenu(page, "graph-toolbar-layers")
  await page.locator('[data-slot="graph-layers-level"] button', { hasText: levelLabels[values.level] }).click()
  await still(page)

  await openMenu(page, "graph-toolbar-layers")
  await page.locator(`[data-slot="graph-lens-preset"][data-value="${values.lens}"]`).click()
  await closeMenu(page, "graph-toolbar-layers")

  await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-depth", values.depth)
  await expect(
    page.locator(`${toolbar} [data-slot="graph-layout-option"][data-value="${values.layout}"]`),
  ).toHaveAttribute("aria-pressed", "true")
  await expect(page.locator('[data-slot="graph-layers-level"] button', { hasText: levelLabels[values.level] })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await still(page)
}

for (const [index, cell] of matrix.cells.entries()) {
  test(`cell ${String(index).padStart(2, "0")}: ${cell.id}`, async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.emulateMedia({ reducedMotion: "reduce" })
    await openSession(page, graphFixture())
    await page.evaluate(() => document.fonts.ready.then(() => undefined))
    await page.getByRole("button", { name: "Toggle graph view" }).click()
    await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-ready", "true")
    await expect(page.locator(canvasHost)).toHaveAttribute("data-graph-renderer", "spacegraph")

    await applyCell(page, cell.values)

    const name = `${String(index).padStart(2, "0")}-${createHash("sha256").update(cell.id).digest("hex").slice(0, 10)}.png`
    const dir = captureDir ? resolve(captureDir, "matrix-app") : undefined
    if (dir) mkdirSync(dir, { recursive: true })
    const image = await (dir
      ? page.screenshot({ path: resolve(dir, name) })
      : page.screenshot())
    const sha256 = createHash("sha256").update(image).digest("hex")
    if (dir) {
      writeFileSync(
        resolve(dir, `${String(index).padStart(2, "0")}.json`),
        JSON.stringify({ id: cell.id, values: cell.values, sha256 }, null, 2) + "\n",
      )
    }
    expect(errors).toEqual([])
  })
}
