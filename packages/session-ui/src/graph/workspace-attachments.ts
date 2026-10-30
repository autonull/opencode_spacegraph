import type { FileDiffInfo } from "@opencode/client/promise"
import type { JsonValue, WorkspaceSnapshot, Range } from "./model"
import type { GraphNode, GraphEdge, Provenance } from "./model"
import { normalizePath, fileNodeID, directoryNodeID } from "./model"

/** T30.1 — provenance for a workspace source. */
export function provenanceForSource(
  snapshot: WorkspaceSnapshot,
  source: "tree" | "vcs" | "packages" | "symbols" | "processes" | "issues",
): Provenance | undefined {
  const asOf = snapshot.asOf[source]
  if (asOf === undefined) return undefined
  return { source, asOf, confidence: "inferred" }
}

/** Filter out undefined values from an object for JsonValue compliance. */
export function filterDefined(obj: Record<string, unknown>): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) result[key] = value as JsonValue
  }
  return result
}

/** Build file nodes from workspace snapshot. */
export function buildFileNodes(
  snapshot: WorkspaceSnapshot,
  existingFileNodes: Map<string, string>,
): Array<{ node: GraphNode; normalized: string }> {
  const snapshotFileMeta = new Map<string, { config?: boolean; doc?: boolean }>()
  for (const file of snapshot.files) {
    const normalized = normalizePath(file.path)
    if (file.config || file.doc) {
      snapshotFileMeta.set(normalized, { config: file.config, doc: file.doc })
    }
  }

  const result: Array<{ node: GraphNode; normalized: string }> = []
  for (const file of snapshot.files) {
    const normalized = normalizePath(file.path)
    const existingId = existingFileNodes.get(normalized)
    if (existingId) {
      // Existing node - meta update handled by caller
      continue
    }
    const id = fileNodeID(normalized)
    result.push({
      normalized,
      node: {
        id,
        kind: "file",
        label: normalized,
        status: "neutral",
        domain: "directories",
        provenance: provenanceForSource(snapshot, "tree"),
        data: filterDefined({
          path: normalized,
          config: snapshotFileMeta.get(normalized)?.config,
          doc: snapshotFileMeta.get(normalized)?.doc,
        }),
      },
    })
  }
  return result
}

/** Build directory nodes from file paths. */
export function buildDirectoryNodes(
  fileNodes: Map<string, string>,
  touchedFiles: Set<string>,
  snapshot: WorkspaceSnapshot,
): Array<{ node: GraphNode; edges: GraphEdge[] }> {
  const counts = new Map<string, { fileCount: number; touchedCount: number }>()
  for (const file of fileNodes.keys()) {
    const touched = touchedFiles.has(file)
    const parts = normalizePath(file).split("/")
    for (const directory of parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join("/"))) {
      const count = counts.get(directory) ?? { fileCount: 0, touchedCount: 0 }
      count.fileCount += 1
      if (touched) count.touchedCount += 1
      counts.set(directory, count)
    }
  }

  const directories = [...counts.keys()].sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b))
  const result: Array<{ node: GraphNode; edges: GraphEdge[] }> = []

  for (const directory of directories) {
    const count = counts.get(directory)!
    result.push({
      node: {
        id: directoryNodeID(directory),
        kind: "directory",
        label: directory.slice(directory.lastIndexOf("/") + 1),
        status: "neutral",
        minLevel: "overview",
        domain: "directories",
        provenance: provenanceForSource(snapshot, "tree"),
        data: { path: directory, fileCount: count.fileCount, touchedCount: count.touchedCount },
      },
      edges: [],
    })
  }

  // File -> directory edges
  for (const [file, id] of fileNodes) {
    const normalized = normalizePath(file)
    const slash = normalized.lastIndexOf("/")
    const parent = slash === -1 ? "" : normalized.slice(0, slash)
    if (parent) {
      const targetId = directoryNodeID(parent)
      result.push({
        node: { id: "", kind: "file", label: "", status: "neutral" }, // placeholder, only edges used
        edges: [{ id: `part-of:${id}->${targetId}`, kind: "part-of", source: id, target: targetId, confidence: "structural" }],
      })
    }
  }

  // Directory -> parent directory edges
  for (const directory of directories) {
    const normalized = normalizePath(directory)
    const slash = normalized.lastIndexOf("/")
    const parent = slash === -1 ? "" : normalized.slice(0, slash)
    if (parent) {
      const sourceId = directoryNodeID(directory)
      const targetId = directoryNodeID(parent)
      result.push({
        node: { id: "", kind: "directory", label: "", status: "neutral" },
        edges: [{ id: `part-of:${sourceId}->${targetId}`, kind: "part-of", source: sourceId, target: targetId, confidence: "structural" }],
      })
    }
  }

  return result
}

/** Build package nodes from snapshot. */
export function buildPackageNodes(snapshot: WorkspaceSnapshot): GraphNode[] {
  return snapshot.packages.map((pkg) => ({
    id: `pkg:${normalizePath(pkg.path)}`,
    kind: "package" as const,
    label: pkg.name ?? pkg.path,
    status: "neutral" as const,
    minLevel: "overview" as const,
    domain: "directories" as const,
    provenance: provenanceForSource(snapshot, "packages"),
    data: filterDefined({
      path: pkg.path,
      name: pkg.name,
      version: pkg.version,
      scripts: pkg.scripts,
      dependencies: pkg.dependencies,
      devDependencies: pkg.devDependencies,
    }),
  }))
}

/** Build commit nodes and edges from snapshot. */
export function buildCommitNodesAndEdges(
  snapshot: WorkspaceSnapshot,
  fileNodes: Map<string, string>,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  for (const commit of snapshot.commits) {
    const id = `commit:${commit.sha}`
    nodes.push({
      id,
      kind: "commit",
      label: commit.short,
      status: "neutral",
      minLevel: "execution",
      domain: "history",
      provenance: provenanceForSource(snapshot, "vcs"),
      data: filterDefined({ sha: commit.sha, message: commit.message, author: commit.author, time: commit.time, files: commit.files }),
    })
    if (commit.files) {
      for (const file of commit.files) {
        const fileId = fileNodes.get(normalizePath(file))
        if (fileId) {
          edges.push({ id: `touches:${id}->${fileId}`, kind: "touches", source: id, target: fileId, confidence: "explicit" })
        }
      }
    }
  }
  if (snapshot.base?.sha) {
    const baseId = `commit:${snapshot.base.sha}`
    nodes.push({
      id: baseId,
      kind: "commit",
      label: `base (${snapshot.base.sha.slice(0, 7)})`,
      status: "neutral",
      minLevel: "execution",
      domain: "history",
      provenance: provenanceForSource(snapshot, "vcs"),
      data: { sha: snapshot.base.sha, isBase: true },
    })
  }
  return { nodes, edges }
}

/** Build branch nodes and edges from snapshot. */
export function buildBranchNodesAndEdges(
  snapshot: WorkspaceSnapshot,
  existingNodeIds: Set<string>,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  for (const branch of snapshot.branches) {
    const id = `branch:${branch.name}`
    nodes.push({
      id,
      kind: "branch",
      label: branch.name,
      status: branch.name === snapshot.head?.branch ? "running" : "neutral",
      minLevel: "execution",
      domain: "history",
      provenance: provenanceForSource(snapshot, "vcs"),
      data: filterDefined({ name: branch.name, sha: branch.sha, upstream: branch.upstream, remote: branch.remote }),
    })
    const commitId = `commit:${branch.sha}`
    if (existingNodeIds.has(commitId)) {
      edges.push({ id: `points-at:${id}->${commitId}`, kind: "points-at", source: id, target: commitId, confidence: "explicit" })
    }
  }
  return { nodes, edges }
}

/** Build symbol nodes and edges from snapshot. */
export function buildSymbolNodesAndEdges(
  snapshot: WorkspaceSnapshot,
  fileNodes: Map<string, string>,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  for (const sym of snapshot.symbols) {
    const id = `symbol:${normalizePath(sym.path)}#${sym.qualified}`
    nodes.push({
      id,
      kind: "symbol",
      label: sym.name,
      status: "neutral",
      minLevel: "execution",
      domain: "code",
      provenance: provenanceForSource(snapshot, "symbols"),
      data: filterDefined({ path: sym.path, name: sym.name, qualified: sym.qualified, kind: sym.kind, range: sym.range, signature: sym.signature, origin: sym.origin }),
    })
    const fileId = fileNodes.get(normalizePath(sym.path))
    if (fileId) {
      edges.push({ id: `part-of:${id}->${fileId}`, kind: "part-of", source: id, target: fileId, confidence: "structural" })
    }
  }
  return { nodes, edges }
}

/** Build hunk symbol nodes and edges from per-turn diffs. */
export function buildHunkSymbolNodesAndEdges(
  diffByTurn: Map<string, FileDiffInfo[]>,
  existingNodeIds: Set<string>,
  fileNodes: Map<string, string>,
  symbolsFromHunk: (patch: string, filePath: string) => Array<{
    name: string
    qualified: string
    kind: "function" | "class" | "method"
    range: Range
    signature?: string
    origin: "hunk" | "hunk:anon" | "hunk:deleted"
    deleted?: boolean
  }>,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  for (const [_turnID, diffs] of diffByTurn) {
    for (const diff of diffs) {
      const symbols = symbolsFromHunk(diff.patch, diff.file)
      for (const sym of symbols) {
        const id = `symbol:${normalizePath(diff.file)}#${sym.qualified}`
        if (existingNodeIds.has(id)) continue

        nodes.push({
          id,
          kind: "symbol",
          label: sym.name,
          status: sym.deleted ? "failed" : "neutral",
          minLevel: "execution",
          domain: "code",
          provenance: { source: "tree", confidence: "inferred" },
          data: filterDefined({
            path: diff.file,
            name: sym.name,
            qualified: sym.qualified,
            kind: sym.kind,
            range: sym.range,
            signature: sym.signature,
            origin: sym.origin,
            deleted: sym.deleted,
          }),
        })
        const fileId = fileNodes.get(normalizePath(diff.file))
        if (fileId) {
          edges.push({ id: `part-of:${id}->${fileId}`, kind: "part-of", source: id, target: fileId, confidence: "structural" })
        }
      }
    }
  }
  return { nodes, edges }
}

/** Build process nodes from snapshot. */
export function buildProcessNodes(snapshot: WorkspaceSnapshot): GraphNode[] {
  return snapshot.processes.map((proc) => {
    const procId = proc.id.startsWith("proc:") ? proc.id : `proc:${proc.id}`
    return {
      id: procId,
      kind: "process" as const,
      label: proc.command,
      status: "running" as const,
      minLevel: "detail" as const,
      domain: "runtime" as const,
      provenance: provenanceForSource(snapshot, "processes"),
      data: filterDefined({ pid: proc.pid, command: proc.command, cwd: proc.cwd, ports: proc.ports, startedAt: proc.startedAt }),
    }
  })
}

/** Build port nodes and edges from snapshot processes. */
export function buildPortNodesAndEdges(snapshot: WorkspaceSnapshot): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  for (const proc of snapshot.processes) {
    const procId = proc.id.startsWith("proc:") ? proc.id : `proc:${proc.id}`
    for (const port of proc.ports) {
      const portId = `port:${port}`
      nodes.push({
        id: portId,
        kind: "port",
        label: `Port ${port}`,
        status: "neutral",
        minLevel: "detail",
        domain: "runtime",
        provenance: provenanceForSource(snapshot, "processes"),
        data: { port, processId: procId },
      })
      edges.push({ id: `listens-on:${procId}->${portId}`, kind: "listens-on", source: procId, target: portId, confidence: "inferred" })
    }
  }
  return { nodes, edges }
}

/** Build issue nodes from snapshot. */
export function buildIssueNodes(snapshot: WorkspaceSnapshot): GraphNode[] {
  return snapshot.issues.map((issue) => ({
    id: `issue:${issue.provider}:${issue.repo ?? "unknown"}#${issue.number}`,
    kind: "issue" as const,
    label: issue.title ?? `#${issue.number}`,
    status: issue.state === "closed" ? "success" : "neutral",
    minLevel: "overview" as const,
    domain: "work" as const,
    provenance: provenanceForSource(snapshot, "issues"),
    data: filterDefined({ provider: issue.provider, repo: issue.repo, number: issue.number, title: issue.title, state: issue.state, url: issue.url }),
  }))
}