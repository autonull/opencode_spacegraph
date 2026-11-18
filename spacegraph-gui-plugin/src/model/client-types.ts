// Workspace snapshot types removed from `@opencode/client/promise` on upstream dev. The ported graph
// model still consumes them, so the plugin owns the shape it builds rather than depending on a vanished
// client export.

export type WorkspaceSnapshotDirectory = { path: string; parent?: string }

export type WorkspaceSnapshotPackage = {
  path: string
  name?: string
  version?: string
  private?: boolean
  scripts?: Array<string>
  dependencies?: { [x: string]: string }
  devDependencies?: { [x: string]: string }
}

export type WorkspaceSnapshotFile = {
  path: string
  status?: "added" | "modified" | "deleted"
  doc?: boolean
  config?: boolean
}

export type WorkspaceSnapshotHead = { branch?: string; sha?: string }

export type WorkspaceSnapshotBase = { sha: string }

export type WorkspaceSnapshotBranch = { name: string; sha: string; upstream?: string; remote?: boolean }

export type WorkspaceSnapshotCommit = {
  sha: string
  short: string
  message: string
  author?: string
  time?: number
  files?: Array<string>
}

export type WorkspaceSnapshotRange = {
  start: { line: number; character: number }
  end: { line: number; character: number }
}

export type WorkspaceSnapshotSymbol = {
  path: string
  name: string
  qualified: string
  kind: "function" | "method" | "class" | "interface" | "type" | "variable" | "constant" | "module" | "enum"
  range: WorkspaceSnapshotRange
  signature?: string
  origin: "parser" | "hunk"
}

export type WorkspaceSnapshotProcess = {
  id: string
  pid?: number
  command: string
  cwd?: string
  ports: Array<number>
  startedAt?: number
}

export type WorkspaceSnapshotIssue = {
  provider: string
  repo?: string
  number: string
  title?: string
  state?: string
  url?: string
}

export type WorkspaceSnapshotMissing = {
  source: "tree" | "vcs" | "packages" | "symbols" | "issues" | "processes" | "coverage"
  reason: string
}

export type WorkspaceSnapshot = {
  version: 1
  revision: string
  root: string
  scope: "session" | "directory" | "workspace"
  asOf: { tree?: number; vcs?: number; packages?: number; symbols?: number; processes?: number; issues?: number }
  truncated: boolean
  workspace: { name: string; path: string }
  directories: Array<WorkspaceSnapshotDirectory>
  packages: Array<WorkspaceSnapshotPackage>
  files: Array<WorkspaceSnapshotFile>
  head?: WorkspaceSnapshotHead
  base?: WorkspaceSnapshotBase
  branches: Array<WorkspaceSnapshotBranch>
  commits: Array<WorkspaceSnapshotCommit>
  symbols: Array<WorkspaceSnapshotSymbol>
  processes: Array<WorkspaceSnapshotProcess>
  issues: Array<WorkspaceSnapshotIssue>
  missing: Array<WorkspaceSnapshotMissing>
  capabilities: Array<string>
}
