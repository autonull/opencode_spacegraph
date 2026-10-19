#!/usr/bin/env bun
// Phase 5 screenshot capture (V5.1–V5.4). One command produces the reproducible images in
// docs/spacegraph/screenshots/ from the canonical fixture (§7), with no model provider.
//
//   bun run graph:capture --mode=baseline   transcript only
//   bun run graph:capture --mode=demo       transcript + graph levels + selection + 3D (SpaceGraph)
//   bun run graph:capture --mode=compare    demo + the Cytoscape backend over the same model
//   bun run graph:capture --mode=verify     capture into a temp dir, assert the committed set exists
//
// The SpaceGraph frames come from the app's own mocked-server harness; the Cytoscape frames come from
// its Storybook story, because the app has no renderer switch yet (see the plan's V5.4 note).
import { $ } from "bun"
import { existsSync } from "node:fs"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { parseArgs } from "node:util"

const root = resolve(import.meta.dir, "..")
const screenshots = join(root, "docs/spacegraph/screenshots")
const app = join(root, "packages/app")
const sessionGraph = join(root, "packages/session-graph")

const modes = ["baseline", "demo", "compare", "verify"] as const
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

await $`bun run test:e2e -- e2e/graph/capture.spec.ts --reporter=line --workers=1`
  .cwd(app)
  .env({ ...process.env, GRAPH_CAPTURE_DIR: dir, GRAPH_CAPTURE_MODE: captureMode })

if (mode === "compare" || mode === "verify") {
  await $`bun run test:components -- graph-capture.spec.ts --reporter=line --workers=1`
    .cwd(sessionGraph)
    .env({ ...process.env, GRAPH_CAPTURE_DIR: dir })
}

if (mode === "verify") {
  const expected = [
    "01-log.png",
    "02-graph-overview.png",
    "03-graph-execution.png",
    "04-graph-selected.png",
    "05-return-to-log.png",
    "06-graph-3d.png",
    "07-cytoscape-overview.png",
    "08-cytoscape-selected.png",
    "11-graph-timeline.png",
    "12-graph-hierarchy.png",
    "13-graph-narrow.png",
    "14-graph-light.png",
    "15-graph-ribbon.png",
    "16-graph-matrix.png",
  ]
  const missing = expected.filter((name) => !existsSync(join(screenshots, name)))

  if (missing.length) {
    console.error(`graph:capture: committed screenshots missing: ${missing.join(", ")}`)
    process.exit(1)
  }

  console.log(`graph:capture: verify passed; fresh captures in ${dir}`)
} else {
  console.log(`graph:capture: wrote ${mode} screenshots to ${dir}`)
}
