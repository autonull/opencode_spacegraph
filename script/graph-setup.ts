#!/usr/bin/env bun
// graph:setup — Initialize spacegraphjs submodule at gitlink commit and install dependencies
// Usage: bun run graph:setup

import { $ } from "bun"
import { existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const SPACEGRAPHJS_DIR = join(ROOT, "spacegraphjs")

// Read the gitlink commit from the main repo's tree
const gitlinkCommit = await $`git -C ${ROOT} ls-tree HEAD spacegraphjs`.text()
const PINNED_COMMIT = gitlinkCommit.trim().split(/\s+/)[2]

async function main() {
  console.log("[graph:setup] Setting up spacegraphjs submodule...")
  console.log(`[graph:setup] Gitlink commit: ${PINNED_COMMIT}`)

  // Verify .gitmodules exists
  if (!existsSync(join(ROOT, ".gitmodules"))) {
    console.error("[graph:setup] ERROR: .gitmodules not found. Submodule configuration missing.")
    process.exit(1)
  }

  // Initialize and update submodule to pinned commit
  console.log("[graph:setup] Initializing submodule...")
  await $`git -C ${ROOT} submodule update --init --recursive`

  // Check if submodule is at the correct commit
  const currentCommit = await $`git -C ${SPACEGRAPHJS_DIR} rev-parse HEAD`.text()
  const current = currentCommit.trim()

  if (current !== PINNED_COMMIT) {
    console.log(`[graph:setup] Submodule at ${current}, checking out pinned commit ${PINNED_COMMIT}...`)
    await $`git -C ${SPACEGRAPHJS_DIR} checkout ${PINNED_COMMIT}`
    // Update the gitlink in the main repo
    await $`git -C ${ROOT} add spacegraphjs`
    console.log("[graph:setup] Submodule updated. Commit the gitlink change to pin the new commit.")
  } else {
    console.log("[graph:setup] Submodule already at pinned commit")
  }

  // Verify submodule is not empty
  if (!existsSync(join(SPACEGRAPHJS_DIR, "package.json"))) {
    console.error("[graph:setup] ERROR: spacegraphjs submodule appears empty. Run 'git submodule update --init' manually.")
    process.exit(1)
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