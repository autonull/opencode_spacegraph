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
//
// Runs the library steps with its own toolchain (`vitest`), the OpenCode steps with `bun`.
import { $ } from "bun"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const spacegraphjs = join(root, "spacegraphjs")
const vitest = join(spacegraphjs, "node_modules/.bin/vitest")

const steps: { label: string; cwd: string; cmd: string[] }[] = [
  {
    label: "library build (the published artifacts the host consumes)",
    cwd: spacegraphjs,
    cmd: ["pnpm", "run", "build:lib"],
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
  { label: "contract package", cwd: join(spacegraphjs, "packages/renderer"), cmd: ["bun", "test"] },
  {
    label: "model adapter",
    cwd: spacegraphjs,
    cmd: [vitest, "run", "packages/adapter/test/adapter.test.ts"],
  },
  { label: "SpaceGraph adapter", cwd: join(spacegraphjs, "packages/spacegraph-renderer"), cmd: ["bun", "test"] },
  { label: "Cytoscape adapter", cwd: join(spacegraphjs, "packages/cytoscape-renderer"), cmd: ["bun", "test"] },
  { label: "SVG renderer", cwd: join(spacegraphjs, "packages/svg-renderer"), cmd: ["bun", "test"] },
  { label: "session-graph unit tests", cwd: join(root, "packages/session-graph"), cmd: ["bun", "test", "src"] },
  { label: "session-graph component contract", cwd: join(root, "packages/session-graph"), cmd: ["bun", "run", "test:components"] },
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
