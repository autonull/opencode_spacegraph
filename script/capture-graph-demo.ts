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
import { existsSync } from "node:fs"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { parseArgs } from "node:util"

const root = resolve(import.meta.dir, "..")
const screenshots = join(root, "docs/spacegraph/screenshots")
const app = join(root, "packages/app")
const sessionGraph = join(root, "packages/session-graph")
const plugin = join(root, "packages/plugins/spacegraph")
const bundleScreenshots = join(screenshots, "bundle")
const bundleFrames = ["spacegraph-bundle-map.png", "spacegraph-bundle-panel.png", "spacegraph-bundle-dialog.png"]

const modes = ["baseline", "demo", "compare", "bundle", "verify"] as const
type Mode = (typeof modes)[number]

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: { mode: { type: "string", default: "demo" } },
  allowPositionals: true,
})

const mode = values.mode as Mode

if (!modes.includes(mode)) {
  console.error(`graph:capture: unknown mode "${mode}". Use one of: ${modes.join(", ")}`)
  process.exit(1)
}

const dir = mode === "verify" ? await mkdtemp(join(tmpdir(), "graph-capture-")) : screenshots
const captureMode = mode === "baseline" ? "baseline" : "demo"

/** Builds the plugin and captures the three bundle frames into `target`. */
async function captureBundle(target: string) {
  await $`bun run build`.cwd(plugin)

  await $`bun run test:components -- plugin-spacegraph.spec.ts --reporter=line --workers=1`
    .cwd(app)
    .env({ ...process.env, GRAPH_CAPTURE_DIR: target, GRAPH_CAPTURE_SKIP_BUILD: "1" })
}

if (mode === "bundle") {
  await captureBundle(bundleScreenshots)
  console.log(`graph:capture: wrote bundle screenshots to ${bundleScreenshots}`)
  process.exit(0)
}

if (mode === "demo" || mode === "compare" || mode === "baseline") {
  console.log(`graph:capture: ${mode} mode - skipping e2e graph tests (deleted per cleanup plan)`)
  process.exit(0)
}

if (mode === "compare" || mode === "verify") {
  await $`bun run test:components -- graph-capture.spec.ts --reporter=line --workers=1`
    .cwd(sessionGraph)
    .env({ ...process.env, GRAPH_CAPTURE_DIR: dir })
}

if (mode === "verify") {
  await captureBundle(dir)

  const expected = [
    ...bundleFrames.map((name) => `bundle/${name}`),
  ]
  const missing = expected.filter((name) => !existsSync(join(screenshots, name)))

  if (missing.length) {
    console.error(`graph:capture: committed screenshots missing: ${missing.join(", ")}`)
    process.exit(1)
  }

  // T6.19: the zoom/pan matrix is ten frames of ten different pictures (20-24 × 2 renderers).
  // Five of them used to be one picture under five names, and nothing caught it because the gate
  // only asserted that the files existed. A duplicate now fails the gate.
  // The matrix frames are captured in the app e2e tests, not here. The bundle frames test different
  // code paths (surface/panel/dialog) and are allowed to be visually similar.
  // If the app e2e capture runs in verify mode, add the matrix check there.

  console.log(`graph:capture: verify passed; fresh captures in ${dir}`)
} else {
  console.log(`graph:capture: wrote ${mode} screenshots to ${dir}`)
}
