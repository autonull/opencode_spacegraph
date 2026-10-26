#!/usr/bin/env bun
// graph:setup — Clone spacegraphjs at pinned commit and install dependencies
// Usage: bun run graph:setup

import { $ } from "bun"
import { existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const SPACEGRAPHJS_DIR = join(ROOT, "spacegraphjs")

// Pinned commit from docs/spacegraph/prototype.md
const PINNED_COMMIT = "9df9b92"
const REPO_URL = "https://github.com/autonull/spacegraphjs7"

async function main() {
  console.log("[graph:setup] Setting up spacegraphjs...")
  console.log(`[graph:setup] Pinned commit: ${PINNED_COMMIT}`)

  // Check if spacegraphjs already exists
  if (existsSync(SPACEGRAPHJS_DIR)) {
    console.log("[graph:setup] spacegraphjs directory already exists")
    console.log("[graph:setup] Checking current commit...")

    const currentCommit = await $`git -C ${SPACEGRAPHJS_DIR} rev-parse HEAD`.text()
    const current = currentCommit.trim()

    if (current === PINNED_COMMIT) {
      console.log("[graph:setup] Already at pinned commit, skipping clone")
    } else {
      console.log(`[graph:setup] Current commit (${current}) differs from pinned (${PINNED_COMMIT})`)
      console.log("[graph:setup] Re-cloning at pinned commit...")
      await $`rm -rf ${SPACEGRAPHJS_DIR}`
    }
  }

  // Clone spacegraphjs at pinned commit if not already there
  if (!existsSync(SPACEGRAPHJS_DIR)) {
    console.log(`[graph:setup] Cloning ${REPO_URL}...`)
    await $`git clone ${REPO_URL} ${SPACEGRAPHJS_DIR}`
    console.log(`[graph:setup] Checking out ${PINNED_COMMIT}...`)
    await $`git -C ${SPACEGRAPHJS_DIR} checkout ${PINNED_COMMIT}`
  }

  // Install spacegraphjs dependencies with pnpm (uses its own workspaces config)
  console.log("[graph:setup] Installing spacegraphjs dependencies with pnpm...")
  await $`pnpm --dir ${SPACEGRAPHJS_DIR} install --ignore-scripts`

  // Build spacegraphjs packages so they can be used as workspace dependencies
  console.log("[graph:setup] Building spacegraphjs packages...")
  await $`pnpm --dir ${SPACEGRAPHJS_DIR} run build:lib`
  await $`pnpm --dir ${SPACEGRAPHJS_DIR} run build:packages`

  // Install root dependencies with bun (includes workspace packages)
  console.log("[graph:setup] Installing root dependencies with bun...")
  await $`bun install`

  console.log("[graph:setup] Done! You can now run:")
  console.log("  bun run graph:dev    # Start mock graph dev server")
  console.log("  bun run graph:verify # Run verification gate")
}

main().catch((e) => {
  console.error("[graph:setup] Failed:", e)
  process.exit(1)
})