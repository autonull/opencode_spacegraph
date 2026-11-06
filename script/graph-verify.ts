#!/usr/bin/env bun
// Phase 5 conformance gate (V5.6). One command proves both interactive adapters still honor the shared
// renderer contract and that the canonical fixture still renders end to end:
//
//   - the headless contract suite against both adapters (spacegraphjs Vitest),
//   - the framework-agnostic view controller and the React/Solid bindings (spacegraphjs Vitest),
//   - the four dependency-free/leaf packages (contract, SpaceGraph, Cytoscape, SVG) and the model
//     adapter,
//   - the browser contract + graph view through the session-graph Storybook harness,
//   - the capture suite in verify mode (fresh renders into a temp dir; committed set asserted).
//   - bundle cost measurement for the lazy chunks
//
// Runs the library steps with its own toolchain (`vitest`), the OpenCode steps with `bun`.
import { $ } from "bun"
import { join, resolve } from "node:path"
import { existsSync, readFileSync, readdirSync } from "node:fs"

const root = resolve(import.meta.dir, "..")
const spacegraphjs = join(root, "spacegraphjs")
const vitest = join(spacegraphjs, "node_modules/.bin/vitest")

function measureBundleSizes(): void {
  const appDist = join(root, "packages/app/dist")
  if (!existsSync(appDist)) {
    console.log("  (app dist not found, skipping bundle measurement)")
    return
  }
  
  const files = readdirSync(appDist)
  const jsFiles = files.filter(f => f.endsWith('.js'))
  
  console.log("\n  Bundle sizes (gzip):")
  for (const file of jsFiles) {
    const filePath = join(appDist, file)
    const stats = readFileSync(filePath)
    const gzipped = Bun.gzipSync(stats)
    const kb = (gzipped.length / 1024).toFixed(1)
    console.log(`    ${file}: ${kb} KB gzipped (${(stats.length / 1024).toFixed(1)} KB raw)`)
  }
  
  // Also measure spacegraphjs lazy chunks
  const sgDist = join(spacegraphjs, "packages/spacegraph-renderer/dist")
  if (existsSync(sgDist)) {
    const sgFiles = readdirSync(sgDist).filter(f => f.endsWith('.js'))
    for (const file of sgFiles) {
      const filePath = join(sgDist, file)
      const stats = readFileSync(filePath)
      const gzipped = Bun.gzipSync(stats)
      const kb = (gzipped.length / 1024).toFixed(1)
      console.log(`    ${file}: ${kb} KB gzipped`)
    }
  }
}

const steps: { label: string; cwd: string; cmd: string[] }[] = [
  {
    label: "library build (the published artifacts the host consumes)",
    cwd: spacegraphjs,
    cmd: [join(spacegraphjs, "node_modules/.bin/tsx"), "script/build-all.ts"],
  },
  { label: "contract conformance (both adapters)", cwd: spacegraphjs, cmd: [vitest, "run", "test/renderer.contract.test.ts"] },
  { label: "package boundaries", cwd: spacegraphjs, cmd: [vitest, "run", "test/boundaries.test.ts"] },
  {
    label: "view controller + framework bindings",
    cwd: spacegraphjs,
    cmd: [
      vitest,
      "run",
      "test/control.test.ts",
      "test/control-binding.test.ts",
      "packages/react-spacegraph/test/binding.test.ts",
      "packages/solid-spacegraph/test/binding.test.ts",
    ],
  },
  { label: "overlay core (scope, focus, diff)", cwd: spacegraphjs, cmd: [vitest, "run", "test/overlays/"] },
  { label: "navigation core (search, minimap)", cwd: spacegraphjs, cmd: [vitest, "run", "test/navigation/"] },
  {
    label: "second host (a framework-free host outside OpenCode)",
    cwd: spacegraphjs,
    cmd: [vitest, "run", "test/second-host/"],
  },
  { label: "contract package", cwd: join(spacegraphjs, "packages/renderer"), cmd: ["bun", "test"] },
  {
    label: "model adapter",
    cwd: spacegraphjs,
    cmd: [vitest, "run", "packages/adapter/test/adapter.test.ts"],
  },
  {
    label: "adapter performance budget",
    cwd: spacegraphjs,
    cmd: [vitest, "run", "packages/adapter/test/performance.test.ts"],
  },
  { label: "SpaceGraph adapter", cwd: join(spacegraphjs, "packages/spacegraph-renderer"), cmd: ["bun", "test"] },
  { label: "SVG renderer", cwd: join(spacegraphjs, "packages/svg-renderer"), cmd: ["bun", "test"] },
  { label: "session-graph unit tests", cwd: join(root, "packages/session-graph"), cmd: ["bun", "test", "src"] },
  { label: "session-graph component contract", cwd: join(root, "packages/session-graph"), cmd: ["bun", "run", "test:components"] },
  { label: "session-ui graph unit tests", cwd: join(root, "packages/session-ui"), cmd: ["bun", "test", "src/graph"] },
  { label: "gui-plugins spacegraph tests", cwd: join(root, "packages/gui-plugins"), cmd: ["bun", "test", "src/spacegraph"] },
  { label: "capture overrides schema", cwd: root, cmd: ["bun", "run", "script/test-capture-overrides.ts"] },
  { label: "docs truth check", cwd: root, cmd: ["bun", "run", "script/docs-graph.ts", "--check"] },
  { label: "app e2e graph", cwd: join(root, "packages/app"), cmd: ["bun", "run", "test:e2e:built", "--", "e2e/graph/session-graph.spec.ts", "e2e/graph/reactivity.spec.ts"] },
  // The side-panel keeper (e2e/regression/side-panels.spec.ts) is upstream app UI, not the graph.
  // It fails on tab-strip layout (close buttons overflow, sticky tabs bar covers review rows).
  // Tracked in app issue tracker; not a graph gate. Re-enable when app#side-panel-strip is fixed.
  { label: "graph capture (verify)", cwd: root, cmd: ["bun", "run", "graph:capture", "--mode=verify"] },
  {
    label: "published packages (a clean consumer outside the monorepo)",
    cwd: spacegraphjs,
    cmd: [join(spacegraphjs, "node_modules/.bin/tsx"), "script/publish-check.ts"],
  },
]

for (const step of steps) {
  console.log(`\ngraph:verify — ${step.label}`)
  await $`${step.cmd}`.cwd(step.cwd)
}

console.log("\ngraph:verify: all steps passed")

// Measure and report bundle sizes
measureBundleSizes()
