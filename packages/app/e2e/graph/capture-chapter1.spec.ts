import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test as base, type Page } from "@playwright/test"
import { buildNarrativeFixtureMessages, buildNarrativeSnapshot } from "@opencode/session-ui/graph"
import { trackPageErrors } from "../utils/errors"
import { seedSessionGraph } from "../utils/graph"
import { openSession } from "../utils/workspace"
import {
  event,
  inboxEnqueued,
  inboxDelivered,
  userMessage,
  assistantMessage,
  messageUpdated,
  partUpdated,
  textPart,
  toolPart,
  installSseTransport,
  setupTimeline,
} from "../utils/timeline"
import { waitForGraphContent, graphCanvasHost } from "../utils/waits"

const KNOWN_FLAKY_ERRORS = ["Maximum call stack size exceeded"]

const test = base.extend({
  page: async ({ page }, use) => {
    await seedSessionGraph(page)
    await use(page)
  },
})

test.skip(!process.env.GRAPH_CAPTURE_DEMO, "Chapter 1 live-open recording; set GRAPH_CAPTURE_DEMO=1")

const directory = "C:/OpenCode/SessionGraphChapter1"
const sessionID = "ses_chapter1_live"
const projectID = "proj_chapter1"
const toolbar = '[data-slot="graph-toolbar"]'
const inspector = '[data-slot="graph-inspector"]'

const captureDir = process.env.GRAPH_CAPTURE_DIR
const videoDir = fileURLToPath(new URL("../../../../docs/spacegraph/video", import.meta.url))

function filterKnownErrors(errs: string[]): string[] {
  return errs.filter((e) => !KNOWN_FLAKY_ERRORS.some((k) => e.includes(k)))
}

function graphFixture() {
  const narrativeMessages = buildNarrativeFixtureMessages()
  // Start with only the first user message — the session is "mid-run" when we open
  const initialMessages = [narrativeMessages[0] as any]
  return {
    name: "SessionGraphChapter1",
    directory,
    sessions: [{ id: sessionID, title: "Session graph (live)" }],
    pageMessages: () => ({ items: initialMessages }),
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

async function capture(page: Page, name: string) {
  if (!captureDir) return
  await page.evaluate(() => {
    document.querySelectorAll<HTMLDetailsElement>("details[data-slot^='graph-toolbar-']").forEach((menu) => {
      menu.open = false
    })
    window.scrollTo(0, 0)
  })
  mkdirSync(captureDir, { recursive: true })
  await page.screenshot({ path: resolve(captureDir, name), fullPage: false })
  if (name === "chapter1-01-live-open.png") {
    await removeFirstFrameMarker(page)
  }
}

const frameMarks: { frame: string; elapsed: number }[] = []
let flowWallStart = 0

function recordMark(name: string) {
  if (!flowWallStart) return
  frameMarks.push({ frame: name, elapsed: (Date.now() - flowWallStart) / 1000 })
  mkdirSync(videoDir, { recursive: true })
  writeFileSync(resolve(videoDir, "marks-chapter1.json"), JSON.stringify(frameMarks, null, 2))
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

async function fit(page: Page) {
  const overflow = page.locator('[data-slot="graph-toolbar-overflow"]')
  const compact = (await overflow.count()) > 0
  if (compact) await overflow.getByLabel("More controls").click()
  await page.locator(toolbar).getByRole("button", { name: "Fit", exact: true }).click()
  if (compact) await overflow.getByLabel("More controls").click()
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

test.describe.configure({ retries: 0, mode: "serial" })

test("Chapter 1 — Live: watch the session build with nodes streaming in", async ({ page }) => {
  console.log("[TEST] Starting Chapter 1 test")
  test.setTimeout(600_000)
  const errors = trackPageErrors(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await addFirstFrameMarker(page)
  flowWallStart = Date.now()

  const narrativeMessages = buildNarrativeFixtureMessages()
  const initialMessages = narrativeMessages // Use all messages like capture-live

  // Install SSE transport first (navigates to session)
  console.log("[TEST] Calling setupTimeline")
  const { send, sendAll } = await setupTimeline(page, {
    sessionMessages: narrativeMessages,
    sessionStatus: { [sessionID]: { type: "busy" } },
    pageMessages: () => ({ items: initialMessages }),
    sessions: [{ id: sessionID, projectID, location: { directory }, title: "Session graph (live)", cost: 0, tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, time: { created: 1700000000000, updated: 1700000000000 } }],
    title: "Session graph (live)",
    tabs: [sessionID],
    skipSessionTitleCheck: true,
    settings: { experimental: { sessionGraph: true } },
    projectID,
  })

  // Sync beacon for video timeline anchoring
  await syncBeacon(page)

  // ── FRAME 01: Live open on a running session ──
  await page.keyboard.press("Control+Shift+M")
  await waitForGraphContent(page)
  await expect(graphCanvasHost(page)).toHaveAttribute("data-graph-renderer", "spacegraph")
  await fit(page)
  await waitForStillCanvas(page)
  await capture(page, "chapter1-01-live-open.png")
  recordMark("chapter1-01-live-open")

  // Stream the assistant plan
  await send(event("session.status", { sessionID, status: { type: "busy" } }))
  await sendAll(
    [
      { event: inboxEnqueued({ sessionID, inboxID: "msg_narr_plan_1", item: { type: "user", payload: { text: "I will reproduce the failure, then trace where the refresh token is stored." }, delivery: "steer" } }), delay: 200 },
      { event: inboxDelivered({ sessionID, inboxID: "msg_narr_plan_1" }), delay: 100 },
    ],
    { delay: 0 },
  )
  await sendAll(partUpdated(textPart("prt_narr_plan_1:text:0", "I will reproduce the failure, then trace where the refresh token is stored.")).map(e => ({ event: e, delay: 0 })))
  await send(messageUpdated(buildNarrativeFixtureMessages()[1] as any))

  // ── FRAME 02: Plan arrives, graph grows ──
  await waitForStillCanvas(page, 10000)
  await capture(page, "chapter1-02-plan.png")
  recordMark("chapter1-02-plan")

  // Stream the failing test shell
  await sendAll(
    partUpdated(
      toolPart(
        "prt_narr_shell_1",
        "shell",
        "completed",
        { command: "bun test src/auth/session.test.ts" },
        { output: "FAIL expected refresh token to be stored", title: "bun test src/auth/session.test.ts", time: { start: Date.now() - 5000, end: Date.now() } },
      ),
    ),
  )
  await send(messageUpdated(buildNarrativeFixtureMessages()[2] as any))

  // ── FRAME 03: First failure arrives ──
  await waitForStillCanvas(page, 10000)
  await capture(page, "chapter1-03-first-failure.png")
  recordMark("chapter1-03-first-failure")

  // Stream the wrong fix
  await sendAll(
    partUpdated(
      toolPart(
        "prt_narr_edit_1",
        "edit",
        "completed",
        { path: "src/auth/token.ts" },
        { output: "extended token lifetime", title: "src/auth/token.ts", time: { start: Date.now() - 5000, end: Date.now() } },
      ),
    ),
  )
  await send(messageUpdated(buildNarrativeFixtureMessages()[3] as any))

  // ── FRAME 04: Wrong fix lands ──
  await waitForStillCanvas(page, 10000)
  await capture(page, "chapter1-04-wrong-fix.png")
  recordMark("chapter1-04-wrong-fix")

  // Stream the second failure
  await sendAll(
    partUpdated(
      toolPart(
        "prt_narr_shell_2",
        "shell",
        "completed",
        { command: "bun test src/auth/session.test.ts" },
        { output: "FAIL expected refresh token to be stored", title: "bun test src/auth/session.test.ts", time: { start: Date.now() - 5000, end: Date.now() } },
      ),
    ),
  )
  await send(messageUpdated(buildNarrativeFixtureMessages()[4] as any))

  // ── FRAME 05: Still failing — the wrong fix didn't work ──
  await waitForStillCanvas(page, 10000)
  await capture(page, "chapter1-05-still-failing.png")
  recordMark("chapter1-05-still-failing")

  // Stream the auto compaction
  await send(event("session.compaction.started", { sessionID, reason: "auto" }))
  await send(event("session.compaction.ended", {
    sessionID,
    reason: "auto",
    text: "Summarized the failed attempts before the root-cause trace",
  }))
  await send(messageUpdated(buildNarrativeFixtureMessages()[5] as any))

  // ── FRAME 06: Compaction summarizes the dead ends ──
  await waitForStillCanvas(page, 10000)
  await capture(page, "chapter1-06-compaction.png")
  recordMark("chapter1-06-compaction")

  // Stream the root cause diagnosis
  await sendAll(
    partUpdated(
      toolPart(
        "prt_narr_read_1",
        "read",
        "completed",
        { path: "src/auth/session.ts" },
        { output: "export function refresh() {}", title: "src/auth/session.ts", time: { start: Date.now() - 5000, end: Date.now() } },
      ),
      toolPart(
        "prt_narr_read_2",
        "read",
        "completed",
        { path: "src/auth/store.ts" },
        { output: "export function store(token) {}", title: "src/auth/store.ts", time: { start: Date.now() - 5000, end: Date.now() } },
      ),
      textPart("msg_narr_cause_1:text:0", "Root cause: refresh() rotates the token but never writes it back to the store."),
    ),
  )
  await send(messageUpdated(buildNarrativeFixtureMessages()[6] as any))

  // ── FRAME 07: Root cause found ──
  await waitForStillCanvas(page, 10000)
  await capture(page, "chapter1-07-root-cause.png")
  recordMark("chapter1-07-root-cause")

  // Stream the correct fix
  await sendAll(
    partUpdated(
      toolPart(
        "prt_narr_edit_2",
        "edit",
        "completed",
        { path: "src/auth/session.ts" },
        { output: "stored the rotated refresh token", title: "src/auth/session.ts", time: { start: Date.now() - 5000, end: Date.now() } },
      ),
    ),
  )
  await send(messageUpdated(buildNarrativeFixtureMessages()[7] as any))

  // ── FRAME 08: Correct fix lands ──
  await waitForStillCanvas(page, 10000)
  await capture(page, "chapter1-08-correct-fix.png")
  recordMark("chapter1-08-correct-fix")

  // Stream the passing test
  await sendAll(
    partUpdated(
      toolPart(
        "prt_narr_shell_3",
        "shell",
        "completed",
        { command: "bun test" },
        { output: "3 pass 0 fail", title: "bun test", time: { start: Date.now() - 5000, end: Date.now() } },
      ),
    ),
  )
  await send(messageUpdated(buildNarrativeFixtureMessages()[8] as any))

  // ── FRAME 09: Suite passes ──
  await waitForStillCanvas(page, 10000)
  await capture(page, "chapter1-09-passes.png")
  recordMark("chapter1-09-passes")

  // Stream the subagent verification
  await sendAll(
    partUpdated(
      toolPart(
        "prt_narr_subagent_1",
        "subagent",
        "completed",
        { agent: "review", description: "Verify refresh rotation" },
        { output: "Reviewer confirmed refresh rotation; the token is stored before expiry.", title: "subagent: review", time: { start: Date.now() - 5000, end: Date.now() } },
      ),
    ),
  )
  await send(messageUpdated(buildNarrativeFixtureMessages()[9] as any))
  await sendAll(
    partUpdated(
      toolPart(
        "prt_narr_synthetic_1",
        "subagent",
        "completed",
        { source: "subagent", childID: "ses_child_verify", state: "completed" },
        { output: "Subagent finished: Verify refresh rotation", title: "subagent completion", time: { start: Date.now() - 5000, end: Date.now() } },
      ),
    ),
  )

  // ── FRAME 10: Subagent verifies ──
  await waitForStillCanvas(page, 10000)
  await capture(page, "chapter1-10-verification.png")
  recordMark("chapter1-10-verification")

  // Stream the share
  await send(messageUpdated(buildNarrativeFixtureMessages()[11] as any))
  await send(event("session.status", { sessionID, status: { type: "idle" } }))

  // ── FRAME 11: Session idle, story complete ──
  await waitForStillCanvas(page, 10000)
  await capture(page, "chapter1-11-idle.png")
  recordMark("chapter1-11-idle")

  expect(filterKnownErrors(errors)).toEqual([])
})

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  locale: "en-US",
  video: { mode: "on", size: { width: 1440, height: 900 } },
})