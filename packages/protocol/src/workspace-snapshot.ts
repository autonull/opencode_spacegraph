import { NonNegativeInt, optional } from "@opencode/schema/schema"
import { Schema } from "effect"

/**
 * T29.1 — the one input every derived graph kind reads. A snapshot is plain JSON, versioned, and
 * stamped per source so the map never asserts a fact it cannot date. It is assembled behind the
 * server seam (`graph.workspace`); the model build stays pure.
 */

export const SOURCES = ["tree", "vcs", "packages", "symbols", "issues", "processes", "coverage"] as const
export type Source = (typeof SOURCES)[number]

export const SYMBOL_KINDS = [
  "function",
  "method",
  "class",
  "interface",
  "type",
  "variable",
  "constant",
  "module",
  "enum",
] as const
export type SymbolKind = (typeof SYMBOL_KINDS)[number]

export const SCOPES = ["session", "directory", "workspace"] as const
export type SnapshotScope = (typeof SCOPES)[number]

export const Range = Schema.Struct({
  start: Schema.Struct({ line: NonNegativeInt, character: NonNegativeInt }),
  end: Schema.Struct({ line: NonNegativeInt, character: NonNegativeInt }),
}).annotate({ identifier: "WorkspaceSnapshot.Range" })
export interface Range extends Schema.Schema.Type<typeof Range> {}

export const Directory = Schema.Struct({
  path: Schema.String,
  parent: optional(Schema.String),
}).annotate({ identifier: "WorkspaceSnapshot.Directory" })
export interface Directory extends Schema.Schema.Type<typeof Directory> {}

export const Package = Schema.Struct({
  path: Schema.String,
  name: optional(Schema.String),
  version: optional(Schema.String),
  private: optional(Schema.Boolean),
  scripts: optional(Schema.Array(Schema.String)),
}).annotate({ identifier: "WorkspaceSnapshot.Package" })
export interface Package extends Schema.Schema.Type<typeof Package> {}

export const FileEntry = Schema.Struct({
  path: Schema.String,
  status: optional(Schema.Literals(["added", "modified", "deleted"])),
  doc: optional(Schema.Boolean),
  config: optional(Schema.Boolean),
}).annotate({ identifier: "WorkspaceSnapshot.File" })
export interface FileEntry extends Schema.Schema.Type<typeof FileEntry> {}

export const Head = Schema.Struct({
  branch: optional(Schema.String),
  sha: optional(Schema.String),
}).annotate({ identifier: "WorkspaceSnapshot.Head" })
export interface Head extends Schema.Schema.Type<typeof Head> {}

export const Base = Schema.Struct({
  sha: Schema.String,
}).annotate({ identifier: "WorkspaceSnapshot.Base" })
export interface Base extends Schema.Schema.Type<typeof Base> {}

export const Branch = Schema.Struct({
  name: Schema.String,
  sha: Schema.String,
  upstream: optional(Schema.String),
  remote: optional(Schema.Boolean),
}).annotate({ identifier: "WorkspaceSnapshot.Branch" })
export interface Branch extends Schema.Schema.Type<typeof Branch> {}

export const Commit = Schema.Struct({
  sha: Schema.String,
  short: Schema.String,
  message: Schema.String,
  author: optional(Schema.String),
  time: optional(Schema.Finite),
  files: optional(Schema.Array(Schema.String)),
}).annotate({ identifier: "WorkspaceSnapshot.Commit" })
export interface Commit extends Schema.Schema.Type<typeof Commit> {}

export const SymbolEntry = Schema.Struct({
  path: Schema.String,
  name: Schema.String,
  qualified: Schema.String,
  kind: Schema.Literals(SYMBOL_KINDS),
  range: Range,
  signature: optional(Schema.String),
  origin: Schema.Literals(["parser", "hunk"]),
}).annotate({ identifier: "WorkspaceSnapshot.Symbol" })
export interface SymbolEntry extends Schema.Schema.Type<typeof SymbolEntry> {}

export const Process = Schema.Struct({
  id: Schema.String,
  pid: optional(NonNegativeInt),
  command: Schema.String,
  cwd: optional(Schema.String),
  ports: Schema.Array(NonNegativeInt),
  startedAt: optional(Schema.Finite),
}).annotate({ identifier: "WorkspaceSnapshot.Process" })
export interface Process extends Schema.Schema.Type<typeof Process> {}

export const Issue = Schema.Struct({
  provider: Schema.String,
  repo: optional(Schema.String),
  number: Schema.String,
  title: optional(Schema.String),
  state: optional(Schema.String),
  url: optional(Schema.String),
}).annotate({ identifier: "WorkspaceSnapshot.Issue" })
export interface Issue extends Schema.Schema.Type<typeof Issue> {}

export const Missing = Schema.Struct({
  source: Schema.Literals(SOURCES),
  reason: Schema.String,
}).annotate({ identifier: "WorkspaceSnapshot.Missing" })
export interface Missing extends Schema.Schema.Type<typeof Missing> {}

export const Snapshot = Schema.Struct({
  version: Schema.Literal(1),
  /** Head sha plus a status digest; monotone per location. */
  revision: Schema.String,
  /** Project directory. Every path below is root-relative. */
  root: Schema.String,
  scope: Schema.Literals(SCOPES),
  asOf: Schema.Struct({
    tree: optional(Schema.Finite),
    vcs: optional(Schema.Finite),
    packages: optional(Schema.Finite),
    symbols: optional(Schema.Finite),
  }),
  truncated: Schema.Boolean,
  workspace: Schema.Struct({ name: Schema.String, path: Schema.String }),
  directories: Schema.Array(Directory),
  packages: Schema.Array(Package),
  files: Schema.Array(FileEntry),
  head: optional(Head),
  base: optional(Base),
  branches: Schema.Array(Branch),
  commits: Schema.Array(Commit),
  symbols: Schema.Array(SymbolEntry),
  processes: Schema.Array(Process),
  issues: Schema.Array(Issue),
  missing: Schema.Array(Missing),
  capabilities: Schema.Array(Schema.String),
}).annotate({ identifier: "WorkspaceSnapshot" })

export interface Snapshot extends Schema.Schema.Type<typeof Snapshot> {}

export type WorkspaceSnapshot = Snapshot
