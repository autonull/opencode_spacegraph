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

// Scenario captures are opt-in. The take is the artifact; marks name the beats so
// stills and commentary can be cut from the same recording.
test.skip(!process.env.GRAPH_EXPLORE_DEMO, "Scenario capture; set GRAPH_EXPLORE_DEMO=1")

const scenario = Number(process.env.GRAPH_EXPLORE_SCENARIO ?? "1")
const seed = Number(process.env.GRAPH_EXPLORE_SEED ?? "1")
const directory = `C:/OpenCode/Explore/scenario-${scenario}`
const sessionID = `ses_explore_scenario_${scenario}`
const toolbar = '[data-slot="graph-toolbar"]'
const inspector = '[data-slot="graph-inspector"]'
const canvasHost = '[data-slot="graph-canvas-host"]'

const videoDir = fileURLToPath(new URL("../../../../docs/spacegraph/video", import.meta.url))

function filterKnownErrors(errs: string[]): string[] {
  return errs.filter((e) => !KNOWN_FLAKY_ERRORS.some((k) => e.includes(k)))
}

function graphFixture() {
  return {
    name: `SessionGraphScenario-${scenario}`,
    directory,
    sessions: [{ id: sessionID, title: `Scenario ${scenario}` }],
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
  writeFileSync(resolve(videoDir, `marks-scenario-${scenario}.json`), JSON.stringify(frameMarks, null, 2))
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

function canvasBox(page: Page) {
  return page.locator(canvasHost).boundingBox()
}

function pointIn(box: { x: number; y: number; width: number; height: number }, rnd: () => number) {
  return {
    x: box.x + box.width * (0.15 + rnd() * 0.7),
    y: box.y + box.height * (0.15 + rnd() * 0.7),
  }
}

/**
 * Camera beat helpers for scenario captures.
 * Each beat is deliberate motion between evidence; stillness holds on the answer.
 */

async function pushIn(page: Page, nodeId: string, durationMs = 3000) {
  await page.evaluate(
    async ({ id, ms }) => {
      const app = (window as any).__opencodeApp
      const graph = app?.graph
      const node = graph?.model?.nodes?.find((n: any) => n.id === id)
      if (!node) return
      const camera = graph?.renderer?.cameraControls
      if (!camera) return
      const target = new (await import("three")).Vector3(...node.position)
      const distance = camera.camera.position.length() * 0.3
      camera.flyTo(target, distance, ms / 1000)
    },
    { id: nodeId, ms: durationMs },
  )
  await pace(durationMs)
}

async function whipToNode(page: Page, nodeId: string, durationMs = 2000) {
  await page.evaluate(
    async ({ id, ms }) => {
      const app = (window as any).__opencodeApp
      const graph = app?.graph
      const node = graph?.model?.nodes?.find((n: any) => n.id === id)
      if (!node) return
      const camera = graph?.renderer?.cameraControls
      if (!camera) return
      const target = new (await import("three")).Vector3(...node.position)
      const distance = camera.camera.position.length()
      camera.flyTo(target, distance, ms / 1000)
    },
    { id: nodeId, ms: durationMs },
  )
  await pace(durationMs)
}

async function orbitDrift(page: Page, phiDelta: number, thetaDelta: number, durationMs = 4000) {
  await page.evaluate(
    async ({ phi, theta, ms }) => {
      const app = (window as any).__opencodeApp
      const graph = app?.graph
      const camera = graph?.renderer?.cameraControls
      if (!camera) return
      const currentPhi = camera.spherical.phi
      const currentTheta = camera.spherical.theta
      camera.setPolar(
        Math.max(0.01, Math.min(Math.PI - 0.01, currentPhi + phi)),
        currentTheta + theta,
        ms / 1000,
      )
    },
    { phi: phiDelta, theta: thetaDelta, ms: durationMs },
  )
  await pace(durationMs)
}

async function traceReveal(page: Page, startNodeId: string, maxHops = 2, durationMs = 5000) {
  await page.evaluate(
    async ({ startId, hops, ms }) => {
      const app = (window as any).__opencodeApp
      const graph = app?.graph
      if (!graph) return
      const visited = new Set<string>()
      const queue = [{ id: startId, depth: 0 }]
      const nodesToSelect: string[] = []
      while (queue.length > 0) {
        const { id, depth } = queue.shift()!
        if (visited.has(id) || depth > hops) continue
        visited.add(id)
        nodesToSelect.push(id)
        const node = graph.model.nodes.find((n: any) => n.id === id)
        if (!node) continue
        const edges = graph.model.edges.filter(
          (e: any) => e.source === id || e.target === id,
        )
        for (const edge of edges) {
          const nextId = edge.source === id ? edge.target : edge.source
          if (!visited.has(nextId)) queue.push({ id: nextId, depth: depth + 1 })
        }
      }
      for (let i = 0; i < nodesToSelect.length; i++) {
        graph.selection.select([nodesToSelect[i]])
        await new Promise((r) => setTimeout(r, ms / nodesToSelect.length))
      }
    },
    { startId: startNodeId, hops: maxHops, ms: durationMs },
  )
  await pace(durationMs)
}

async function clickWhyButton(page: Page) {
  await page.locator(inspector).getByRole("button", { name: "Why" }).click()
  await pace(900)
}

async function selectFilesRailFile(page: Page, filePath: string) {
  // Files rail is in the panel; click the file item
  await page.locator('[data-slot="graph-files-rail"]').getByRole("button", { name: filePath }).click()
  await pace(500)
}

async function openDiff(page: Page) {
  // Click the diff button/tool in inspector
  await page.locator(inspector).getByRole("button", { name: "Diff" }).click()
  await pace(800)
}

async function copyPermalink(page: Page) {
  await page.locator('[data-slot="graph-toolbar"]').getByRole("button", { name: "Copy link" }).click()
  await pace(500)
}

async function toggleCostLens(page: Page) {
  await page.evaluate(() => {
    const app = (window as any).__opencodeApp
    app?.graph?.setCostLens?.(true)
  })
  await pace(500)
}

async function toggleAuditorLens(page: Page) {
  await page.evaluate(() => {
    const app = (window as any).__opencodeApp
    app?.graph?.setAuditorLens?.(true)
  })
  await pace(500)
}

async function enableMatrixLayout(page: Page) {
  await page.evaluate(() => {
    const app = (window as any).__opencodeApp
    app?.graph?.setFlag?.("graph_layout_breadth", true)
  })
  await pace(500)
}

async function pickLayoutByName(page: Page, layout: string) {
  await pickLayout(page, layout)
  await pace(500)
}

test.describe.configure({ retries: 0, mode: "serial" })

test(`Scenario ${scenario} capture (seed ${seed})`, async ({ page }) => {
  test.setTimeout(900_000)
  const errors = trackPageErrors(page)
  const rnd = random(seed)
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: "dark" })

  await openSession(page, graphFixture())
  await openGraph(page)
  await fit(page)
  await syncBeacon(page)
  flowWallStart = Date.now()
  recordMark(`scenario-${scenario}-00-open`)

  // Scenario 1: "I need to know why the build broke."
  // Start: attention badge → Why → readable failed `bun test` error
  if (scenario === 1) {
    await searchAndFocus(page, "result:prt_narr_shell_2", "failed result")
    recordMark(`scenario-1-01-failure-focused`)
    await expect(page.locator(inspector).getByRole("heading", { name: "failed" })).toBeVisible({ timeout: 10000 })
    await clickWhyButton(page)
    recordMark(`scenario-1-02-why-trace`)
    // Camera beat: push-in to failure node
    await pushIn(page, "result:prt_narr_shell_2", 3000)
    recordMark(`scenario-1-03-push-in`)
    // Trace reveal to show causal chain
    await traceReveal(page, "result:prt_narr_shell_2", 2, 4000)
    recordMark(`scenario-1-04-trace-reveal`)
    // Hold on the evidence
    await pace(4000)
    recordMark(`scenario-1-05-hold`)
  }

  // Scenario 2: "I need to find the call that caused the failure."
  // Start: search "failed" → focus → follow `sequence` back → the exact result node and its command input
  if (scenario === 2) {
    await searchAndFocus(page, "result:prt_narr_shell_1", "FAIL")
    recordMark(`scenario-2-01-first-failure`)
    await clickWhyButton(page)
    recordMark(`scenario-2-02-led-here-trace`)
    await whipToNode(page, "result:prt_narr_shell_1", 2000)
    recordMark(`scenario-2-03-whip-to-result`)
    // Trace reveal to show led-here chain
    await traceReveal(page, "result:prt_narr_shell_1", 3, 5000)
    recordMark(`scenario-2-04-trace-chain`)
    // Hold on the exact result node with command input visible
    await pace(4000)
    recordMark(`scenario-2-05-hold`)
  }

  // Scenario 3: "I need to see what the subagent actually did."
  // Start: tree layout → subagent node → trace=related → the subagent's reads and finding
  if (scenario === 3) {
    await pickLayoutByName(page, "tree")
    recordMark(`scenario-3-01-tree-layout`)
    await searchAndFocus(page, "sub:ses_child_verify", "subagent")
    recordMark(`scenario-3-02-subagent-focused`)
    await whipToNode(page, "sub:ses_child_verify", 2000)
    recordMark(`scenario-3-03-whip-to-subagent`)
    // Trace related to show what the subagent did
    await traceReveal(page, "sub:ses_child_verify", 3, 5000)
    recordMark(`scenario-3-04-related-trace`)
    // Hold on subagent's reads and finding
    await pace(4000)
    recordMark(`scenario-3-05-hold`)
  }

  // Scenario 4: "I need to verify the fix before I merge."
  // Start: reviewer lens (files rail visible), detail level → select changed file → open diff → toggle wrong/correct fix
  if (scenario === 4) {
    await pickLayoutByName(page, "tree")
    recordMark(`scenario-4-01-tree-layout`)
    // Files rail should be visible in reviewer lens
    await selectFilesRailFile(page, "src/auth/session.ts")
    recordMark(`scenario-4-02-file-selected`)
    await openDiff(page)
    recordMark(`scenario-4-03-diff-open`)
    // The diff should show wrong fix vs correct fix
    await pace(4000)
    recordMark(`scenario-4-04-hold-diff`)
  }

  // Scenario 5: "I need to hand this to a teammate."
  // Start: cartographer lens, any layout, target node in view → select target → copy permalink → URL visible
  if (scenario === 5) {
    await pickLayoutByName(page, "tree")
    recordMark(`scenario-5-01-tree-layout`)
    await searchAndFocus(page, "msg_narr_cause_1:text:0", "root cause")
    recordMark(`scenario-5-02-target-focused`)
    await whipToNode(page, "msg_narr_cause_1:text:0", 2000)
    recordMark(`scenario-5-03-whip-to-target`)
    await copyPermalink(page)
    recordMark(`scenario-5-04-permalink-copied`)
    // Toast/notification should show the #graph:<node-id> URL
    await pace(3000)
    recordMark(`scenario-5-05-hold-url`)
  }

  // Scenario 6: "I need to audit a long session fast."
  // Start: auditor lens, matrix layout, overview level → observe compaction drops indicator
  if (scenario === 6) {
    await toggleAuditorLens(page)
    recordMark(`scenario-6-01-auditor-lens`)
    await enableMatrixLayout(page)
    recordMark(`scenario-6-02-matrix-layout`)
    await pickLayoutByName(page, "matrix")
    recordMark(`scenario-6-03-matrix-picked`)
    await fit(page)
    recordMark(`scenario-6-04-fit-overview`)
    // Hold on full matrix view with compaction badge
    await pace(5000)
    recordMark(`scenario-6-05-hold-matrix`)
  }

  // Scenario 7: "I need to know what this run cost."
  // Start: cost lens, lanes layout, execution level → scan for highest-cost nodes
  if (scenario === 7) {
    await toggleCostLens(page)
    recordMark(`scenario-7-01-cost-lens`)
    await pickLayoutByName(page, "lanes")
    recordMark(`scenario-7-02-lanes-layout`)
    await chooseDepth(page, "flat")
    recordMark(`scenario-7-03-flat-depth`)
    // Hold on highest-cost node with tooltip
    await pace(4000)
    recordMark(`scenario-7-04-hold-cost`)
  }

  // Scenario 8: "I need to read a turn without leaving the transcript."
  // Start: reader lens, transcript surface, inline preview → hover turn row → expand
  if (scenario === 8) {
    // This requires the transcript surface with inline preview
    // For now, park this scenario as it needs the hybrid surface
    recordMark(`scenario-8-01-parked`)
    await pace(1000)
  }

  if (scenario < 1 || scenario > 8) {
    throw new Error(`unknown GRAPH_EXPLORE_SCENARIO=${scenario} (1-8)`)
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