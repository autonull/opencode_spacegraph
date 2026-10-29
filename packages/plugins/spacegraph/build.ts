// Vite's config loads `.ts` modules through Node's loader, which cannot resolve this repo's TypeScript-only exports.
// Run the build through Bun so the config and `@opencode/plugin/gui/vite` load as written.

import path from "node:path"

const repo = path.resolve(import.meta.dirname, "../../..")
const vite = path.join(path.dirname(Bun.resolveSync("vite/package.json", import.meta.dirname)), "bin/vite.js")

const result = Bun.spawnSync({
  cmd: ["bun", vite, "build", "--config", path.join(import.meta.dirname, "vite.config.ts")],
  cwd: repo,
  stdout: "inherit",
  stderr: "inherit",
})

if (result.exitCode === 0) {
  // The stylesheet ships inside the JS string through `?inline`; Vite's side file is a second, stale artifact.
  await Bun.file(path.join(import.meta.dirname, "dist/opencode-plugin-spacegraph.css")).delete()
}

process.exit(result.exitCode)
