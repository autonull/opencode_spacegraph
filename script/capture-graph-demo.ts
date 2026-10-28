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

// Start backend server for e2e tests
  const serverProcess = await $`nohup bun dev serve --port 4096 > /tmp/opencode-server.log 2>&1 & echo $!`
    .cwd(root)
    .env({ ...process.env, VITE_OPENCODE_TEST_FIXTURES: "1" })
    .text()
  
  const serverPid = parseInt(serverProcess.trim())

  try {
    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 5000))

    await $`bun run test:e2e -- e2e/graph/capture.spec.ts --reporter=line --workers=1 --timeout=300000`
      .cwd(app)
      .env({ ...process.env, GRAPH_CAPTURE_DIR: dir, GRAPH_CAPTURE_MODE: captureMode })
  } finally {
    try {
      process.kill(serverPid, "SIGTERM")
    } catch {}
  }

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
    "17-graph-files.png",
    "18-graph-layered.png",
    "19-graph-depth-stack.png",
    "20-graph-zoom-150.png",
    "21-graph-zoom-max.png",
    "22-graph-turn-1.png",
    "23-graph-turn-2.png",
    "24-graph-failure-chain.png",
    "25-graph-scale-window.png",
    "28-graph-tree.png",
    "29-graph-force.png",
    "30-graph-gallery.png",
    "31-graph-perspective.png",
    "32-graph-workspace-code.png",
    "33-graph-workspace-all.png",
    "34-graph-surfaces.png",
    "35-graph-scrubber.png",
    "36-graph-trace-overlay.png",
    "37-graph-collapsed-group.png",
    "20-cytoscape-zoom-150.png",
    "21-cytoscape-zoom-max.png",
    "22-cytoscape-turn-1.png",
    "23-cytoscape-turn-2.png",
    "24-cytoscape-failure-chain.png",
  ]
  const missing = expected.filter((name) => !existsSync(join(screenshots, name)))

  if (missing.length) {
    console.error(`graph:capture: committed screenshots missing: ${missing.join(", ")}`)
    process.exit(1)
  }

  // T6.19: the zoom/pan matrix is ten frames of ten different pictures. Five of them used to be one
  // picture under five names, and nothing caught it because the gate only asserted that the files
  // existed. A duplicate now fails the gate.
  const matrix = expected.filter((name) => /^(2[0-4])-/.test(name))
  const hashes = new Map<string, string[]>()
  for (const name of matrix) {
    const hash = createHash("sha256")
      .update(new Uint8Array(await Bun.file(join(screenshots, name)).arrayBuffer()))
      .digest("hex")
    hashes.set(hash, [...(hashes.get(hash) ?? []), name])
  }
  const duplicates = [...hashes.values()].filter((names) => names.length > 1)

  if (duplicates.length) {
    console.error(`graph:capture: the capture matrix repeats a frame: ${duplicates.map((names) => names.join(" = ")).join(", ")}`)
    process.exit(1)
  }

  console.log(`graph:capture: verify passed; fresh captures in ${dir}`)
} else {
  console.log(`graph:capture: wrote ${mode} screenshots to ${dir}`)
}
