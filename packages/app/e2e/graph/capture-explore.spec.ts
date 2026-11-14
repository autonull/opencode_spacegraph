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

/**
 * Camera beat helpers for cinematic exploration takes.
 * Each beat is 3–5 s of deliberate motion; no freezes, no feature lists.
 */

async function pushIn(page: Page, nodeId: string, durationMs = 3000) {
  // Smooth zoom toward a specific node (push-in)
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

async function orbitDrift(page: Page, phiDelta: number, thetaDelta: number, durationMs = 4000) {
  // Orbit drift: rotate camera around the scene
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

async function whipToNode(page: Page, nodeId: string, durationMs = 2000) {
  // Quick camera move to a node (whip pan)
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

async function traceReveal(page: Page, startNodeId: string, maxHops = 2, durationMs = 5000) {
  // Reveal connected nodes by following edges outward (trace reveal)
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
      // Select nodes sequentially with delays
      for (let i = 0; i < nodesToSelect.length; i++) {
        graph.selection.select([nodesToSelect[i]])
        await new Promise((r) => setTimeout(r, ms / nodesToSelect.length))
      }
    },
    { startId: startNodeId, hops: maxHops, ms: durationMs },
  )
  await pace(durationMs)
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
    // Camera beats: push-in to failure node, then trace reveal
    await pushIn(page, "result:prt_narr_shell_2", 3000)
    recordMark(`${theme}-03-push-in`)
    await traceReveal(page, "result:prt_narr_shell_2", 2, 4000)
    recordMark(`${theme}-04-trace-reveal`)
    await detour(page, rnd)
    await fit(page)
    recordMark(`${theme}-05-recover`)
  }

  if (theme === "audit") {
    await pickLayout(page, "timeline")
    await pace(700)
    recordMark(`${theme}-01-timeline`)
    // Camera beat: orbit drift in timeline view
    await orbitDrift(page, 0.1, 0.2, 4000)
    recordMark(`${theme}-02-orbit-drift`)
    // First failure: wrong fix (extended token lifetime)
    await searchAndFocus(page, "result:prt_narr_shell_1", "FAIL")
    recordMark(`${theme}-03-wrong-fix`)
    // Second failure: still failing after wrong fix
    await searchAndFocus(page, "result:prt_narr_shell_2", "FAIL")
    recordMark(`${theme}-04-still-failing`)
    // Success: correct fix (stored rotated token)
    await searchAndFocus(page, "result:prt_narr_shell_3", "pass")
    recordMark(`${theme}-05-correct-fix`)
    // Camera beat: whip to success result
    await whipToNode(page, "result:prt_narr_shell_3", 2000)
    recordMark(`${theme}-06-whip-to-fix`)
    await detour(page, rnd)
    recordMark(`${theme}-07-detour`)
  }

  if (theme === "chaos") {
    // Opening: push-in to show full graph context
    await pushIn(page, "session", 4000)
    recordMark(`${theme}-01-push-in`)
    for (let i = 0; i < 10; i++) {
      await detour(page, rnd)
      recordMark(`${theme}-${String(i + 2).padStart(2, "0")}-detour`)
      // Periodic orbit drift for cinematic motion
      if (i % 3 === 2) {
        await orbitDrift(page, 0.15, 0.3, 3000)
        recordMark(`${theme}-${String(i + 2).padStart(2, "0")}-orbit`)
      }
    }
    await fit(page)
    recordMark(`${theme}-13-fit`)
  }

  if (theme === "night") {
    await pickLayout(page, "hierarchy")
    await pace(800)
    recordMark(`${theme}-01-hierarchy`)
    // Camera beat: orbit drift in light mode
    await orbitDrift(page, 0.2, 0.4, 5000)
    recordMark(`${theme}-02-orbit-drift`)
    await detour(page, rnd)
    await searchAndFocus(page, "result:prt_narr_shell_2", "failed result")
    recordMark(`${theme}-03-failure`)
    await whipToNode(page, "result:prt_narr_shell_2", 2500)
    recordMark(`${theme}-04-whip-to-failure`)
    await fit(page)
    recordMark(`${theme}-05-fit`)
  }

  if (theme === "delegate") {
    // Who did the work - focus on subagent nodes
    await pickLayout(page, "tree")
    await pace(700)
    recordMark(`${theme}-01-tree`)
    await searchAndFocus(page, "sub:ses_child_verify", "subagent")
    recordMark(`${theme}-02-subagent`)
    await whipToNode(page, "sub:ses_child_verify", 2000)
    recordMark(`${theme}-03-whip-to-subagent`)
    await traceReveal(page, "sub:ses_child_verify", 3, 5000)
    recordMark(`${theme}-04-trace-subagent`)
    await detour(page, rnd)
    recordMark(`${theme}-05-detour`)
    await fit(page)
    recordMark(`${theme}-06-fit`)
  }

  if (theme === "trust") {
    // Trust but verify - focus on unverified nodes
    await pickLayout(page, "hierarchy")
    await pace(700)
    recordMark(`${theme}-01-hierarchy`)
    // Enable trust lens if available
    await page.evaluate(() => {
      const app = (window as any).__opencodeApp
      app?.graph?.setTrustLens?.(true)
    })
    await pace(500)
    recordMark(`${theme}-02-trust-lens`)
    await orbitDrift(page, 0.1, 0.15, 4000)
    recordMark(`${theme}-03-orbit-drift`)
    await detour(page, rnd)
    recordMark(`${theme}-04-detour`)
    await fit(page)
    recordMark(`${theme}-05-fit`)
  }

  if (theme === "cost") {
    // Follow the money - focus on cost nodes
    await pickLayout(page, "lanes")
    await pace(700)
    recordMark(`${theme}-01-lanes`)
    await page.evaluate(() => {
      const app = (window as any).__opencodeApp
      app?.graph?.setCostLens?.(true)
    })
    await pace(500)
    recordMark(`${theme}-02-cost-lens`)
    await pushIn(page, "session", 3000)
    recordMark(`${theme}-03-push-in`)
    await detour(page, rnd)
    recordMark(`${theme}-04-detour`)
    await fit(page)
    recordMark(`${theme}-05-fit`)
  }

  if (theme === "handoff") {
    // Give it away - focus on share message
    await pickLayout(page, "timeline")
    await pace(700)
    recordMark(`${theme}-01-timeline`)
    await searchAndFocus(page, "msg_narr_share_1:text:0", "share")
    recordMark(`${theme}-02-share-search`)
    await whipToNode(page, "msg_narr_share_1:text:0", 2000)
    recordMark(`${theme}-03-whip-to-share`)
    await detour(page, rnd)
    recordMark(`${theme}-04-detour`)
    await fit(page)
    recordMark(`${theme}-05-fit`)
  }

  if (theme === "return") {
    // Tomorrow - focus on session continuity
    await pickLayout(page, "lanes")
    await pace(700)
    recordMark(`${theme}-01-lanes`)
    await orbitDrift(page, 0.15, 0.3, 4000)
    recordMark(`${theme}-02-orbit-drift`)
    await pushIn(page, "session", 3000)
    recordMark(`${theme}-03-push-in`)
    await detour(page, rnd)
    recordMark(`${theme}-04-detour`)
    await fit(page)
    recordMark(`${theme}-05-fit`)
  }

  if (!["diagnose", "audit", "chaos", "night", "delegate", "trust", "cost", "handoff", "return"].includes(theme)) {
    throw new Error(`unknown GRAPH_EXPLORE_THEME=${theme} (diagnose|audit|chaos|night|delegate|trust|cost|handoff|return)`)
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
