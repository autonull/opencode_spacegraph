// Vite's config loads `.ts` modules through Node's loader, which cannot resolve this repo's TypeScript-only exports.
// Run the build through Bun so the config and `@opencode/plugin/gui/vite` load as written.

import path from "node:path"

const repo = path.resolve(import.meta.dirname, "..")
const glob = new Bun.Glob("node_modules/.bun/vite@7.*/node_modules/vite/bin/vite.js")
const candidates = [...glob.scanSync({ cwd: repo, absolute: true })]

const vite = candidates.sort().at(-1)

if (!vite) throw new Error("No Vite installation found under node_modules/.bun")

const result = Bun.spawnSync({
  cmd: ["bun", vite, "build", "--config", path.join(import.meta.dirname, "vite.config.ts")],
  cwd: repo,
  stdout: "inherit",
  stderr: "inherit",
})

process.exit(result.exitCode)
