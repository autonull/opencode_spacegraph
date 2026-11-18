import path from "node:path"
import { expect, test } from "bun:test"
import { Effect, Schedule } from "effect"
import { git, initRepo } from "../../../core/test/fixture/git"
import { tmpdirScoped } from "../../../core/test/fixture/tmpdir"
import { it } from "../../../core/test/lib/effect"
import { startServer } from "../../test/fixture/server"
import { assembleSnapshot } from "./snapshot"

const base = {
  root: "/workspace/project",
  workspaceName: "project",
  scope: "session" as const,
  statuses: [],
  manifests: [],
  missing: [],
  capabilities: [],
  truncated: false,
  now: 1_700_000_000_000,
}

test("files imply their ancestor directories and keep VCS status", () => {
  const snapshot = assembleSnapshot({
    ...base,
    entries: [
      { path: "src/auth/session.ts", type: "file" },
      { path: "README.md", type: "file" },
    ],
    statuses: [{ file: "src/auth/session.ts", status: "modified", additions: 1, deletions: 1 }],
  })

  expect(snapshot.directories).toEqual([
    { path: "src" },
    { path: "src/auth", parent: "src" },
  ])
  expect(snapshot.files).toEqual([
    { path: "README.md", doc: true },
    { path: "src/auth/session.ts", status: "modified" },
  ])
  expect(snapshot.missing).toEqual([])
})

test("a directory entry and its manifest become a package", () => {
  const snapshot = assembleSnapshot({
    ...base,
    entries: [
      { path: "packages/core", type: "directory" },
      { path: "packages/core/package.json", type: "file" },
    ],
    manifests: [{ path: "packages/core/package.json", name: "@acme/core", version: "1.0.0", scripts: ["test"] }],
  })

  expect(snapshot.directories).toEqual([
    { path: "packages" },
    { path: "packages/core", parent: "packages" },
  ])
  expect(snapshot.packages).toEqual([
    { path: "packages/core/package.json", name: "@acme/core", version: "1.0.0", scripts: ["test"] },
  ])
  expect(snapshot.files[0]).toEqual({ path: "packages/core/package.json", config: true })
})

test("the revision changes when the working tree changes and is stable otherwise", () => {
  const first = assembleSnapshot({ ...base, entries: [{ path: "a.ts", type: "file" }] })
  const second = assembleSnapshot({ ...base, entries: [{ path: "a.ts", type: "file" }] })
  const changed = assembleSnapshot({
    ...base,
    entries: [{ path: "a.ts", type: "file" }],
    statuses: [{ file: "a.ts", status: "modified", additions: 1, deletions: 0 }],
  })

  expect(first.revision).toBe(second.revision)
  expect(changed.revision).not.toBe(first.revision)
})

test("a source that cannot be read becomes a missing row, not a failure", () => {
  const snapshot = assembleSnapshot({
    ...base,
    entries: [],
    missing: [{ source: "vcs", reason: "not a version-controlled repository" }],
  })

  expect(snapshot.files).toEqual([])
  expect(snapshot.missing).toEqual([{ source: "vcs", reason: "not a version-controlled repository" }])
})

it.live(
  "the endpoint returns a session-scoped snapshot for a real repository",
  () =>
    Effect.gen(function* () {
      const tmp = yield* tmpdirScoped()
      yield* Effect.promise(() => Bun.write(path.join(tmp.path, "README.md"), "# project\n"))
      yield* Effect.promise(() => Bun.write(path.join(tmp.path, "src", "auth", "session.ts"), "export const a = 1\n"))
      yield* Effect.promise(() => initRepo(tmp.path))
      yield* Effect.promise(async () => {
        await git(tmp.path, "add", ".")
        await git(tmp.path, "commit", "-m", "files")
      })
      yield* Effect.promise(() => Bun.write(path.join(tmp.path, "src", "auth", "session.ts"), "export const a = 2\n"))

      const server = yield* startServer(path.join(tmp.path, "config"))
      yield* Effect.tryPromise({
        try: async () => {
          const vcsUrl = new URL("/api/vcs", server.base)
          vcsUrl.searchParams.set("location[directory]", tmp.path)
          const response = await fetch(vcsUrl, { headers: server.headers })
          const body = (await response.json()) as { data?: { provider?: string } }
          if (body.data?.provider !== "git") throw new Error("Git provider not ready")
        },
        catch: (cause) => cause,
      }).pipe(Effect.retry(Schedule.spaced("10 millis")), Effect.timeout("2 seconds"))
      const url = new URL("/api/graph/workspace", server.base)
      url.searchParams.set("location[directory]", tmp.path)
      url.searchParams.set("scope", "session")
      url.searchParams.set("paths", "src/auth/session.ts,README.md")
      const response = yield* Effect.promise(() => fetch(url, { headers: server.headers }))
      expect(response.status).toBe(200)
      const body = (yield* Effect.promise(() => response.json())) as {
        data: { files: unknown[]; directories: unknown[]; missing: unknown[]; revision: string; scope: string }
      }

      expect(body.data.scope).toBe("session")
      expect(body.data.revision).toMatch(/^r[0-9a-z]+$/)
      expect(body.data.files).toEqual([
        { path: "README.md", doc: true },
        { path: "src/auth/session.ts", status: "modified" },
      ])
      expect(body.data.directories).toEqual([
        { path: "src" },
        { path: "src/auth", parent: "src" },
      ])
      expect(body.data.missing).toEqual(
        expect.arrayContaining([expect.objectContaining({ source: "vcs" }), expect.objectContaining({ source: "symbols" })]),
      )
    }),
  15_000,
)

