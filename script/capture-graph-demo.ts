#!/usr/bin/env bun
// Phase 5 screenshot capture (V5.1–V5.4). One command produces the reproducible images in
// docs/spacegraph/screenshots/ from the canonical fixture (§7), with no model provider.
//
//   bun run graph:capture --mode=baseline   transcript only
//   bun run graph:capture --mode=demo       transcript + graph levels + selection + 3D (SpaceGraph)
//   bun run graph:capture --mode=compare    demo + the Cytoscape backend over the same model
//   bun run graph:capture --mode=bundle     the shipped plugin bundle: map surface, side panel, dialog fallback
//   bun run graph:capture --mode=verify     capture into a temp dir, assert the committed set exists
//
// The SpaceGraph frames come from the app's own mocked-server harness; the Cytoscape frames come from
// its Storybook story, because the app has no renderer switch yet (see the plan's V5.4 note).
import { $ } from "bun"
import { createHash } from "node:crypto"
import { existsSync, readdirSync } from "node:fs"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { parseArgs } from "node:util"
import { compareDirectories, compareImages, formatDiffResult, type PixelDiffOptions } from "./pixel-diff.ts"

const root = resolve(import.meta.dir, "..")
const screenshots = join(root, "docs/spacegraph/screenshots")
const app = join(root, "packages/app")
const sessionGraph = join(root, "packages/session-graph")
const plugin = join(root, "packages/plugins/spacegraph")
const bundleScreenshots = join(screenshots, "bundle")
const bundleFrames = ["spacegraph-bundle-map.png", "spacegraph-bundle-panel.png", "spacegraph-bundle-dialog.png"]

const modes = ["baseline", "demo", "bundle", "verify", "frame", "bless"] as const
type Mode = (typeof modes)[number]

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    mode: { type: "string", default: "demo" },
    name: { type: "string" },
    only: { type: "string" },
  },
  allowPositionals: true,
})

const mode = values.mode as Mode
const frameName = values.name
const frameOnly = values.only

if (!modes.includes(mode)) {
  console.error(`graph:capture: unknown mode "${mode}". Use one of: ${modes.join(", ")}`)
  process.exit(1)
}

const dir = mode === "verify" ? await mkdtemp(join(tmpdir(), "graph-capture-")) : screenshots

const startTime = Date.now()

/** Builds the plugin and captures the three bundle frames into `target/bundle/`. */
async function captureBundle(target: string) {
  await $`bun run build`.cwd(plugin)

  const bundleDir = join(target, "bundle")
  await $`mkdir -p ${bundleDir}`

  await $`bun run test:components -- plugin-spacegraph.spec.ts --reporter=line --workers=1`
    .cwd(app)
    .env({ ...process.env, GRAPH_CAPTURE_DIR: bundleDir, GRAPH_CAPTURE_SKIP_BUILD: "1" })
}

/** Runs the app e2e capture suite with the given filter. */
async function runAppCapture(filter?: string, extraEnv: Record<string, string> = {}) {
  const args = ["e2e/graph/capture.spec.ts"]
  if (filter) {
    args.push("-g", filter)
  }
  await $`bun run test:e2e:built -- ${args}`.cwd(app).env({
    ...process.env,
    GRAPH_CAPTURE_DIR: dir,
    PLAYWRIGHT_BUILD: "0",
    ...extraEnv,
  })
}

if (mode === "bundle") {
  await captureBundle(bundleScreenshots)
  console.log(`graph:capture: wrote bundle screenshots to ${bundleScreenshots}`)
  process.exit(0)
}

if (mode === "baseline") {
  // Frame 01: transcript only (log)
  await runAppCapture("01 log")
  console.log(`graph:capture: baseline completed in ${Date.now() - startTime}ms`)
  process.exit(0)
}

if (mode === "demo") {
  // All SpaceGraph frames (02-06, 11-24, 28-31, 34, 36-38)
  await runAppCapture()
  console.log(`graph:capture: demo completed in ${Date.now() - startTime}ms`)
  process.exit(0)
}

if (mode === "frame") {
  if (!frameName && !frameOnly) {
    console.error(`graph:capture: frame mode requires --name=<frame-name> or --only=<frame-numbers>`)
    process.exit(1)
  }
  const captureDir = screenshots
  const onlyFrames = frameOnly?.split(",").flatMap((part) => {
    const range = part.split("-").map(Number)
    if (range.length === 2) {
      const [start, end] = range
      return Array.from({ length: end - start + 1 }, (_, i) => start + i)
    }
    return range
  })
  const env: Record<string, string> = {
    ...process.env,
    GRAPH_CAPTURE_DIR: captureDir,
    PLAYWRIGHT_BUILD: "0",
  }
  if (onlyFrames && onlyFrames.length > 0) {
    env.GRAPH_CAPTURE_ONLY = onlyFrames.join(",")
  }
  const testPattern = frameName ? `e2e/graph/capture.spec.ts -g "${frameName.replace(/"/g, '\\"')}"` : "e2e/graph/capture.spec.ts"
  await $`bun run test:e2e:built -- ${testPattern}`.cwd(app).env(env)
  console.log(`graph:capture: frame capture completed in ${Date.now() - startTime}ms`)
  process.exit(0)
}

if (mode === "verify" || mode === "bless") {
  const diffOptions: PixelDiffOptions = {
    threshold: 0.1,
    maxDiffPercent: 0.1,
    includeAA: 0.1,
    alpha: 16,
  }

  const isBless = mode === "bless"
  if (isBless && !process.env.GRAPH_CAPTURE_BLESS) {
    console.error(`graph:capture: bless mode requires GRAPH_CAPTURE_BLESS=1`)
    process.exit(1)
  }

  console.log(`\ngraph:capture: ${isBless ? "blessing" : "verifying"} screenshots...`)

  // Capture fresh frames into temp dir
  const freshDir = await mkdtemp(join(tmpdir(), "graph-capture-"))
  console.log(`  Capturing fresh frames to ${freshDir}...`)

  // Run the demo capture into the temp dir
  await runAppCapture(undefined, { GRAPH_CAPTURE_DIR: freshDir })

  // Also capture bundle frames
  const bundleFreshDir = join(freshDir, "bundle")
  await $`mkdir -p ${bundleFreshDir}`
  await $`bun run test:components -- plugin-spacegraph.spec.ts --reporter=line --workers=1`
    .cwd(app)
    .env({ ...process.env, GRAPH_CAPTURE_DIR: bundleFreshDir, GRAPH_CAPTURE_SKIP_BUILD: "1" })

  // Compare fresh captures against committed
  console.log(`\n  Comparing against committed set in ${screenshots}...`)
  
  const results = compareDirectories(freshDir, screenshots, diffOptions)
  let hasFailures = false

  for (const { frame, result } of results) {
    console.log(formatDiffResult(frame, result))
    if (!result.identical) {
      hasFailures = true
    }
  }

  // Also check bundle frames
  const bundleResults = compareDirectories(bundleFreshDir, bundleScreenshots, diffOptions)
  for (const { frame, result } of bundleResults) {
    console.log(formatDiffResult(`bundle/${frame}`, result))
    if (!result.identical) {
      hasFailures = true
    }
  }

  if (hasFailures) {
    if (isBless) {
      // Bless mode: overwrite committed frames with fresh ones
      console.log(`\n  Blessing: overwriting committed frames with fresh captures...`)
      
      // Copy fresh frames to committed location
      const { cpSync } = require("node:fs")
      cpSync(freshDir, screenshots, { recursive: true })
      
      // Log the blessing
      const { appendFileSync } = require("node:fs")
      const timestamp = new Date().toISOString().split("T")[0]
      const author = process.env.USER || process.env.USERNAME || "unknown"
      const reason = process.env.GRAPH_BLESS_REASON || "Manual blessing"
      const frameList = [...results.filter(r => !r.result.identical).map(r => r.frame), 
        ...bundleResults.filter(r => !r.result.identical).map(r => `bundle/${r.frame}`)]
      
      const logEntry = `\n## ${timestamp} — ${author}\nReason: ${reason}\nFrames: ${frameList.join(", ") || "none"}\n`
      appendFileSync(join(root, "docs/spacegraph/visual-review.md"), logEntry)
      
      console.log(`  Blessing complete. Logged to docs/spacegraph/visual-review.md`)
      process.exit(0)
    } else {
      console.error(`\ngraph:capture: verification FAILED (${results.filter(r => !r.result.identical).length + bundleResults.filter(r => !r.result.identical).length} frame(s) differ)`)
      console.error(`  Fresh captures in: ${freshDir}`)
      console.error(`  Committed set in: ${screenshots}`)
      console.error(`  Run 'GRAPH_CAPTURE_BLESS=1 GRAPH_BLESS_REASON="..." bun run graph:capture --mode=bless' to bless`)
      process.exit(1)
    }
  }

  console.log(`\ngraph:capture: verify passed (all committed screenshots match fresh captures)`)
  process.exit(0)
}
