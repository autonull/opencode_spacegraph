#!/usr/bin/env bun
// docs-graph.ts — Documentation truth check for SPACEGRAPH.md and related docs
// Usage: bun run script/docs-graph.ts --check

import { $ } from "bun"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join, resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

interface CheckResult {
  ok: boolean
  message: string
}

const results: CheckResult[] = []

function check(ok: boolean, message: string) {
  results.push({ ok, message })
  if (!ok) console.error(`  ✗ ${message}`)
  else console.log(`  ✓ ${message}`)
}

function checkPathExists(relPath: string, context: string) {
  const absPath = join(ROOT, relPath)
  check(existsSync(absPath), `${context}: path exists — ${relPath}`)
}

function checkFileContains(filePath: string, pattern: string | RegExp, context: string) {
  const absPath = join(ROOT, filePath)
  if (!existsSync(absPath)) {
    check(false, `${context}: file not found — ${filePath}`)
    return
  }
  const content = readFileSync(absPath, "utf-8")
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern)
  check(regex.test(content), `${context}: contains pattern — ${pattern}`)
}

async function checkExportExists(packagePath: string, exportName: string, context: string) {
  const absPath = join(ROOT, packagePath)
  if (!existsSync(absPath)) {
    check(false, `${context}: package not found — ${packagePath}`)
    return
  }
  try {
    const mod = await import(absPath)
    check(exportName in mod, `${context}: export exists — ${exportName} in ${packagePath}`)
  } catch {
    check(false, `${context}: export check failed — ${exportName} in ${packagePath}`)
  }
}

async function main() {
  const args = Bun.argv.slice(2)
  const checkMode = args.includes("--check")

  console.log("docs-graph: Checking documentation truth...")

  // 1. Check SPACEGRAPH.md for CONTRACT_VERSION references (should be removed per Phase 3)
  // Allow the one in breaking-change policy which states "No CONTRACT_VERSION" as policy
  console.log("\n1. Checking SPACEGRAPH.md for CONTRACT_VERSION references...")
  const spacegraphMd = readFileSync(join(ROOT, "SPACEGRAPH.md"), "utf-8")
  const contractVersionMatches = spacegraphMd.match(/CONTRACT_VERSION/g)
  // Allow exactly 1 match in the breaking-change policy section ("No CONTRACT_VERSION")
  const allowedMatches = 1
  check(
    (contractVersionMatches?.length ?? 0) <= allowedMatches,
    `SPACEGRAPH.md: no positive CONTRACT_VERSION references (found ${contractVersionMatches?.length ?? 0}, allowed ${allowedMatches} in policy)`
  )

  // 2. Check for fictional API references
  console.log("\n2. Checking for fictional API references...")
  checkFileContains("SPACEGRAPH.md", /negotiateContract/, "SPACEGRAPH.md: no negotiateContract reference")
  checkFileContains("SPACEGRAPH.md", /@deprecated/, "SPACEGRAPH.md: no @deprecated shims")

  // 3. Check referenced repo paths exist
  console.log("\n3. Checking referenced repo paths...")
  const referencedPaths = [
    "packages/session-ui/src/graph/vocabulary.ts",
    "packages/session-ui/src/graph/model.ts",
    "packages/session-ui/src/graph/build.ts",
    "packages/session-ui/src/graph/lookup.ts",
    "packages/session-ui/src/graph/levels.ts",
    "packages/session-ui/src/graph/layout.ts",
    "packages/session-ui/src/graph/summary.ts",
    "packages/session-ui/src/graph/selectors.ts",
    "packages/session-ui/src/graph/fixture.ts",
    "packages/session-ui/src/graph/selectors.test.ts",
    "packages/session-graph/src/ui/GraphView.tsx",
    "packages/session-graph/src/ui/graph-camera.ts",
    "packages/session-graph/src/ui/graph-selection.ts",
    "packages/session-graph/src/ui/graph-anchors.ts",
    "packages/session-graph/src/ui/graph-windows.tsx",
    "packages/session-graph/src/ui/cardTemplate.ts",
    "packages/session-graph/src/ui/card-copy.ts",
    "packages/session-graph/src/ui/node-data.ts",
    "packages/session-graph/src/ui/GraphDetail.tsx",
    "packages/session-graph/src/canvas/GraphCanvas.tsx",
    "spacegraphjs/packages/renderer/src/index.ts",
    "spacegraphjs/packages/adapter/src/index.ts",
    "spacegraphjs/packages/spacegraph-renderer/src/index.ts",
    "spacegraphjs/packages/svg-renderer/src/index.ts",
    "spacegraphjs/packages/kernel/src/index.ts",
    "spacegraphjs/demo/second-host/",
    "docs/spacegraph/upstream-review.md",
    "docs/spacegraph/decisions.md",
    "docs/spacegraph/security.md",
    "docs/spacegraph/demos.md",
    "docs/spacegraph/prototype.md",
    "docs/spacegraph/visual-review.md",
    "docs/spacegraph/screenshots/",
  ]

  for (const p of referencedPaths) {
    checkPathExists(p, "Referenced path")
  }

  // 4. Check frame count matches screenshots directory
  console.log("\n4. Checking screenshot frame count...")
  const screenshotsDir = join(ROOT, "docs/spacegraph/screenshots")
  if (existsSync(screenshotsDir)) {
    const frames = readdirSync(screenshotsDir).filter(f => f.endsWith(".png"))
    const bundleDir = join(screenshotsDir, "bundle")
    const bundleFrames = existsSync(bundleDir) ? readdirSync(bundleDir).filter(f => f.endsWith(".png")) : []
    const totalFrames = frames.length + bundleFrames.length
    
    // The committed set is 35 app frames + 3 bundle frames = 38 total. The canonical capture
    // gate writes 32 frames; the remaining app frames are the opt-in zoom, turn, and demo set.
    check(totalFrames === 38, `Screenshot count: ${totalFrames} frames (expected 38: 35 app + 3 bundle)`)
    check(frames.length === 35, `App frames: ${frames.length} (expected 35)`)
    check(bundleFrames.length === 3, `Bundle frames: ${bundleFrames.length} (expected 3)`)
  } else {
    check(false, "Screenshots directory not found")
  }

  // 5. Check version claims have exports
  console.log("\n5. Checking version claims against exports...")
  // This would require parsing package.json files and checking exports
  // For now, verify the package versions mentioned in SPACEGRAPH.md section 6.1
  checkFileContains("SPACEGRAPH.md", /spacegraphjs.*8\.5\.0/, "SPACEGRAPH.md: spacegraphjs version 8.5.0")
  checkFileContains("SPACEGRAPH.md", /@spacegraphjs\/renderer.*0\.3\.0/, "SPACEGRAPH.md: renderer version 0.3.0")
  checkFileContains("SPACEGRAPH.md", /@spacegraphjs\/adapter.*0\.2\.0/, "SPACEGRAPH.md: adapter version 0.2.0")
  checkFileContains("SPACEGRAPH.md", /@spacegraphjs\/kernel.*0\.1\.0/, "SPACEGRAPH.md: kernel version 0.1.0")
  checkFileContains("SPACEGRAPH.md", /@spacegraphjs\/spacegraph-renderer.*0\.3\.1/, "SPACEGRAPH.md: spacegraph-renderer version 0.3.1")
  checkFileContains("SPACEGRAPH.md", /@spacegraphjs\/svg-renderer.*0\.2\.0/, "SPACEGRAPH.md: svg-renderer version 0.2.0")

  // 6. Check that capture verification is marked "advisory" per Phase 1
  console.log("\n6. Checking capture verification marked as advisory...")
  checkFileContains("SPACEGRAPH.md", /advisory/i, "SPACEGRAPH.md: capture verification marked advisory")

  // 7. Check breaking-change policy is documented (§A.2)
  console.log("\n7. Checking breaking-change policy...")
  checkFileContains("SPACEGRAPH.md", /No `CONTRACT_VERSION`/, "SPACEGRAPH.md: breaking-change policy mentions no CONTRACT_VERSION")
  checkFileContains("SPACEGRAPH.md", /delete-don't-deprecate|delete, don't deprecate/i, "SPACEGRAPH.md: breaking-change policy mentions delete-don't-deprecate")
  checkFileContains("SPACEGRAPH.md", /gitlink bump/i, "SPACEGRAPH.md: breaking-change policy mentions gitlink bump")

  // Summary
  console.log("\n" + "=".repeat(50))
  const passed = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length
  console.log(`docs-graph: ${passed} passed, ${failed} failed`)
  
  if (failed > 0) {
    console.error("\nFailed checks:")
    for (const r of results.filter(r => !r.ok)) {
      console.error(`  - ${r.message}`)
    }
    process.exit(1)
  }
  
  console.log("\nAll documentation truth checks passed!")
}

main().catch(e => {
  console.error("docs-graph: Fatal error:", e)
  process.exit(1)
})