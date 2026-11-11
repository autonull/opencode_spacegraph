/**
 * Regenerates the bundled graph copy at `src/spacegraph/internal/graph` from
 * `packages/session-ui/src/graph`, which is the only editable source.
 *
 * The copy exists because the story and plugin browser bundles cannot load the workspace
 * package directly. It bundles the graph modules plus the timeline and message modules the
 * graph builders import. Import paths are rewritten for the flattened layout.
 *
 * Run `bun script/sync-graph.ts` to regenerate. Run with `--check` (as `bun run check:graph`)
 * to fail when the copy drifts; `bun test` runs the check first.
 */
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

const PACKAGE = path.dirname(import.meta.dir)

const SOURCE = path.resolve(PACKAGE, "../session-ui/src")

const SOURCE_GRAPH = path.join(SOURCE, "graph")

const TARGET = path.join(PACKAGE, "src/spacegraph/internal/graph")

/** Modules outside `graph/` that the builders and their dependencies import. */
const BUNDLED_MODULES = [
  "timeline/detail.ts",
  "timeline/projection.ts",
  "timeline/timeline-row.ts",
  "timeline/turn-phase-machine.ts",
  "message/current-tool-state.ts",
]

/** Graph sources that are not part of the bundle: tests and the CLI-only exporter. */
const EXCLUDED = new Set(["export-cli.ts"])

const REWRITES: Array<[string, string]> = [
  ['from "../timeline/', 'from "./timeline/'],
  ['from "../message/', 'from "./message/'],
]

function flatten(contents: string) {
  return REWRITES.reduce((text, [from, to]) => text.replaceAll(from, to), contents)
}

async function generate() {
  const files = new Map<string, string>()

  for (const name of await readdir(SOURCE_GRAPH))
    if (name.endsWith(".ts") && !name.endsWith(".test.ts") && !EXCLUDED.has(name))
      files.set(name, flatten(await readFile(path.join(SOURCE_GRAPH, name), "utf8")))

  for (const name of BUNDLED_MODULES) files.set(name, await readFile(path.join(SOURCE, name), "utf8"))

  return files
}

async function targetFiles(dir = "", base = TARGET): Promise<string[]> {
  const entries = await readdir(path.join(base, dir), { withFileTypes: true }).catch(() => undefined)

  if (!entries) return []

  const nested = await Promise.all(
    entries.map((entry) => {
      const relative = path.join(dir, entry.name)

      return entry.isDirectory() ? targetFiles(relative, base) : [relative]
    }),
  )

  return nested.flat()
}

async function write(files: Map<string, string>) {
  const stale = (await targetFiles()).filter((name) => !files.has(name))
  await Promise.all(stale.map((name) => rm(path.join(TARGET, name))))

  for (const [name, contents] of files) {
    const file = path.join(TARGET, name)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, contents)
  }

  console.log(`synced ${files.size} graph modules into ${path.relative(PACKAGE, TARGET)}`)
}

async function check(files: Map<string, string>) {
  const drift: string[] = []

  for (const [name, contents] of files) {
    const actual = await readFile(path.join(TARGET, name), "utf8").catch(() => undefined)

    if (actual === undefined) drift.push(`missing ${name}`)
    else if (actual !== contents) drift.push(`stale ${name}`)
  }

  for (const name of await targetFiles())
    if (!files.has(name)) drift.push(`unexpected ${name}`)

  if (drift.length === 0) return

  console.error(
    [
      "The bundled graph copy drifted from packages/session-ui/src/graph.",
      "Edit the session-ui source, then run `bun run sync:graph` in packages/gui-plugins.",
      "",
      ...drift.map((line) => `  ${line}`),
    ].join("\n"),
  )
  process.exit(1)
}

const files = await generate()

if (process.argv.includes("--check")) await check(files)
else await write(files)
