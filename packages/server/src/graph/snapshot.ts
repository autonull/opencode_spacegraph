import path from "path"
import type { Snapshot, SnapshotScope } from "@opencode/protocol/workspace-snapshot"
import { Effect, Option, Stream } from "effect"
import { FileSystem } from "@opencode/core/filesystem"
import { Vcs } from "@opencode/core/vcs"
import { RelativePath } from "@opencode/core/schema"

/**
 * T29.2 — the workspace read model. `collectWorkspaceSnapshot` gathers facts from the services the
 * server already owns; `assembleSnapshot` is the pure, deterministic shape the graph consumes.
 *
 * The VCS surface exposes info, base, branches, status and diff, but not commit ids, so branches and
 * commits stay empty and `missing` says why. Inventing a sha from a ref name would be a fact the map
 * cannot attribute.
 */

export const MAX_WORKSPACE_ENTRIES = 50_000
const MAX_MANIFESTS = 500

export type SnapshotEntry = { path: string; type: "file" | "directory" }

export type PackageManifest = {
  path: string
  name?: string
  version?: string
  private?: boolean
  scripts?: string[]
}

export type AssembleInput = {
  root: string
  workspaceName: string
  scope: SnapshotScope
  entries: readonly SnapshotEntry[]
  statuses: readonly Vcs.FileStatus[]
  manifests: readonly PackageManifest[]
  head?: { branch?: string; sha?: string }
  base?: { sha: string }
  branches?: readonly { name: string; sha: string; upstream?: string; remote?: boolean }[]
  commits?: readonly { sha: string; short: string; message: string; author?: string; time?: number; files?: string[] }[]
  symbols?: Snapshot["symbols"]
  processes?: Snapshot["processes"]
  issues?: Snapshot["issues"]
  missing: Snapshot["missing"]
  capabilities: readonly string[]
  truncated: boolean
  now: number
}

export function assembleSnapshot(input: AssembleInput): Snapshot {
  const statusByPath = new Map(input.statuses.map((item) => [normalize(item.file), item.status]))
  const files = new Map<string, Snapshot["files"][number]>()
  const directories = new Map<string, Snapshot["directories"][number]>()

  for (const entry of input.entries) {
    const item = normalize(entry.path)

    if (entry.type === "directory") {
      addDirectory(directories, item)
      continue
    }

    files.set(item, {
      path: item,
      ...(statusByPath.has(item) ? { status: statusByPath.get(item) } : {}),
      ...(isDoc(item) ? { doc: true } : {}),
      ...(isConfig(item) ? { config: true } : {}),
    })

    for (const directory of ancestors(item)) addDirectory(directories, directory)
  }

  return {
    version: 1,
    revision: revisionOf(input),
    root: normalize(input.root),
    scope: input.scope,
    asOf: {
      tree: input.now,
      ...(input.statuses.length > 0 || input.head ? { vcs: input.now } : {}),
      ...(input.manifests.length > 0 ? { packages: input.now } : {}),
    },
    truncated: input.truncated,
    workspace: { name: input.workspaceName, path: normalize(input.root) },
    directories: [...directories.values()].sort((a, b) => a.path.localeCompare(b.path)),
    packages: [...input.manifests]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((manifest) => ({
        path: manifest.path,
        ...(manifest.name === undefined ? {} : { name: manifest.name }),
        ...(manifest.version === undefined ? {} : { version: manifest.version }),
        ...(manifest.private === undefined ? {} : { private: manifest.private }),
        ...(manifest.scripts === undefined ? {} : { scripts: manifest.scripts }),
      })),
    files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)),
    ...(input.head === undefined ? {} : { head: input.head }),
    ...(input.base === undefined ? {} : { base: input.base }),
    branches: [...(input.branches ?? [])],
    commits: [...(input.commits ?? [])],
    symbols: [...(input.symbols ?? [])],
    processes: [...(input.processes ?? [])],
    issues: [...(input.issues ?? [])],
    missing: [...input.missing],
    capabilities: [...input.capabilities],
  }
}

export function collectWorkspaceSnapshot(input: {
  fs: FileSystem.Interface
  vcs: Vcs.Interface
  root: string
  workspaceName: string
  scope: SnapshotScope
  paths: readonly string[]
}) {
  return Effect.gen(function* () {
    const now = Date.now()
    const paths = input.paths.map(normalize).filter(Boolean)

    const tree = yield* readTree(input.fs, input.scope, paths)
    const vcs = yield* readVcs(input.vcs)
    const manifests = yield* readManifests(
      input.fs,
      tree.entries.filter((entry) => entry.type === "file" && path.basename(entry.path) === "package.json"),
    )

    return assembleSnapshot({
      root: input.root,
      workspaceName: input.workspaceName,
      scope: input.scope,
      entries: tree.entries,
      statuses: vcs.statuses,
      manifests,
      ...(vcs.current === undefined ? {} : { head: { branch: vcs.current } }),
      missing: [
        ...vcs.missing,
        { source: "symbols", reason: "no server symbol index is enabled yet" },
        { source: "processes", reason: "no host process index is available" },
        { source: "issues", reason: "no issue provider is configured" },
        ...(tree.truncated && input.scope === "workspace"
          ? [{ source: "tree" as const, reason: `showing ${MAX_WORKSPACE_ENTRIES} of more files` }]
          : []),
      ],
      capabilities: ["fs.tree", "vcs.status", "vcs.branches", "vcs.diff", "packages.read"],
      truncated: tree.truncated,
      now,
    })
  })
}

function readTree(fs: FileSystem.Interface, scope: SnapshotScope, paths: readonly string[]) {
  return Effect.gen(function* () {
    if (scope === "workspace") {
      const limit = MAX_WORKSPACE_ENTRIES + 1
      const entries = yield* fs.find({ query: "", limit }).pipe(Effect.orElseSucceed(() => []))
      return {
        entries: entries.slice(0, MAX_WORKSPACE_ENTRIES).map((entry) => ({
          path: normalize(entry.path),
          type: entry.type,
        })),
        truncated: entries.length > MAX_WORKSPACE_ENTRIES,
      }
    }

    if (scope === "directory") {
      const directory = paths[0] ?? "."
      const entries = yield* fs.list({ path: directory }).pipe(Effect.orElseSucceed(() => []))
      return {
        entries: entries.map((entry) => ({ path: normalize(entry.path), type: entry.type })),
        truncated: false,
      }
    }

    return {
      entries: paths.map((item) => ({ path: item, type: "file" as const })),
      truncated: false,
    }
  })
}

function readVcs(vcs: Vcs.Interface) {
  return Effect.gen(function* () {
    const info = yield* vcs.info()
    if (info.provider === undefined)
      return { statuses: [], current: undefined, missing: [{ source: "vcs" as const, reason: "not a version-controlled repository" }] }

    const statuses = yield* vcs.status()
    return {
      statuses,
      current: info.branch.current,
      missing: [
        {
          source: "vcs" as const,
          reason: "branch commit ids and commit history are not exposed by the VCS surface",
        },
      ],
    }
  })
}

function readManifests(fs: FileSystem.Interface, entries: readonly SnapshotEntry[]) {
  return Effect.gen(function* () {
    const manifests: PackageManifest[] = []

    for (const entry of entries.slice(0, MAX_MANIFESTS)) {
      const file = yield* fs.read({ path: RelativePath.make(entry.path) }).pipe(Effect.option)
      if (Option.isNone(file)) continue
      const bytes = yield* Stream.mkUint8Array(file.value.stream()).pipe(Effect.orElseSucceed(() => undefined))
      if (bytes === undefined) continue
      const manifest = parseManifest(entry.path, new TextDecoder().decode(bytes))
      if (manifest) manifests.push(manifest)
    }

    return manifests
  })
}

function parseManifest(file: string, content: string): PackageManifest | undefined {
  try {
    const value: unknown = JSON.parse(content)
    if (typeof value !== "object" || value === null) return undefined
    const record = value as Record<string, unknown>
    return {
      path: file,
      ...(typeof record.name === "string" ? { name: record.name } : {}),
      ...(typeof record.version === "string" ? { version: record.version } : {}),
      ...(typeof record.private === "boolean" ? { private: record.private } : {}),
      ...(isStringRecord(record.scripts) ? { scripts: Object.keys(record.scripts) } : {}),
    }
  } catch {
    return undefined
  }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every((item) => typeof item === "string")
  )
}

function addDirectory(
  directories: Map<string, Snapshot["directories"][number]>,
  directory: string,
) {
  if (directory === "" || directory === "." || directories.has(directory)) return
  const parent = path.posix.dirname(directory)
  directories.set(directory, {
    path: directory,
    ...(parent === "." || parent === "" ? {} : { parent }),
  })
}

function ancestors(file: string) {
  const parts = file.split("/")
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join("/"))
}

function normalize(value: string) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "")
}

function isDoc(file: string) {
  return file.endsWith(".md") || file.startsWith("docs/") || /(^|\/)README[^/]*$/i.test(file)
}

function isConfig(file: string) {
  const base = path.posix.basename(file)
  return (
    base === "tsconfig.json" ||
    base === "package.json" ||
    /^eslint\.config\./.test(base) ||
    /^vite\.config\./.test(base) ||
    /^vitest\.config\./.test(base) ||
    /^bunfig\.toml$/.test(base) ||
    /^\.github\//.test(file) ||
    /^\.gitlab-ci\.ya?ml$/.test(base)
  )
}

function revisionOf(input: AssembleInput) {
  const status = input.statuses.map((item) => `${normalize(item.file)}:${item.status}`).sort().join(",")
  const tree = input.entries.length.toString(36)
  return `r${hash(`${input.root}\u0000${input.scope}\u0000${tree}\u0000${status}`).toString(36)}`
}

function hash(value: string) {
  let result = 0x811c9dc5
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 0x01000193)
  }
  return result >>> 0
}
