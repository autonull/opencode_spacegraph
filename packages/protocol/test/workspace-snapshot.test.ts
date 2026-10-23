import { expect, test } from "bun:test"
import { Schema } from "effect"
import { Snapshot, type WorkspaceSnapshot } from "../src/workspace-snapshot.js"

const snapshot: WorkspaceSnapshot = {
  version: 1,
  revision: "abc123:clean",
  root: "/workspace/project",
  scope: "session",
  asOf: { tree: 1_700_000_000_000, vcs: 1_700_000_000_000, packages: 1_700_000_000_000 },
  truncated: false,
  workspace: { name: "project", path: "/workspace/project" },
  directories: [
    { path: "src" },
    { path: "src/auth", parent: "src" },
  ],
  packages: [
    { path: ".", name: "project", version: "1.0.0", private: true, scripts: ["test"] },
  ],
  files: [
    { path: "src/auth/session.ts", status: "modified", doc: false, config: false },
    { path: "README.md", doc: true },
  ],
  head: { branch: "dev", sha: "abc123" },
  base: { sha: "def456" },
  branches: [{ name: "dev", sha: "abc123", upstream: "origin/dev", remote: false }],
  commits: [{ sha: "abc123", short: "abc123", message: "feat: session", author: "me", time: 1_700_000_000_000 }],
  symbols: [
    {
      path: "src/auth/session.ts",
      name: "refresh",
      qualified: "Session.refresh",
      kind: "method",
      range: { start: { line: 10, character: 2 }, end: { line: 14, character: 3 } },
      signature: "refresh(): Promise<void>",
      origin: "parser",
    },
  ],
  processes: [{ id: "pty:1", pid: 1234, command: "bun run dev", cwd: "src", ports: [3000], startedAt: 1 }],
  issues: [{ provider: "github", repo: "acme/project", number: "12", title: "Fix", state: "open", url: "https://example.com/12" }],
  missing: [{ source: "coverage", reason: "no coverage report" }],
  capabilities: ["vcs.checkout", "symbols.parser"],
}

test("the workspace snapshot round-trips as plain JSON", () => {
  const decoded = Schema.decodeUnknownSync(Snapshot)(snapshot)

  expect(Schema.encodeSync(Snapshot)(decoded)).toEqual(snapshot)
})

test("optional facts are absent, not empty", () => {
  const { head: _head, base: _base, ...withoutHeadAndBase } = snapshot
  const encoded = Schema.encodeSync(Snapshot)(
    Schema.decodeUnknownSync(Snapshot)({
      ...withoutHeadAndBase,
      asOf: {},
    }),
  )

  expect(encoded).not.toHaveProperty("head")
  expect(encoded).not.toHaveProperty("base")
  expect(encoded.asOf).toEqual({})
})

test("the schema rejects an unknown version and an unknown source", () => {
  expect(() => Schema.decodeUnknownSync(Snapshot)({ ...snapshot, version: 2 })).toThrow()
  expect(() => Schema.decodeUnknownSync(Snapshot)({ ...snapshot, missing: [{ source: "magic", reason: "?" }] })).toThrow()
})
