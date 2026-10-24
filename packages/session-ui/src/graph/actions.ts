import type { GraphModel, GraphNode, Range } from "./model"
import type { NodeKind } from "./vocabulary"

/**
 * T31.1 — actions are data, resolved by the host. The model never executes.
 * `navigate`, `reveal` and `copy` are local and free. `run` is the only one with side effects.
 */
export type ActionKind = "navigate" | "reveal" | "copy" | "run"

export type ActionSpec = {
  id: string
  kind: ActionKind
  labelKey: string
  target?: { node?: string; file?: string; range?: Range; url?: string; text?: string }
  operation?: { id: string; params: Record<string, unknown> }
}

type ActionFactory = (node: GraphNode) => ActionSpec[]

/** T31.2 — closed registry: the table is the only place actions are named. */
export const actionRegistry: Partial<Record<NodeKind, ActionFactory>> = {
  directory: (node) => [
    { id: "directory.reveal", kind: "reveal", labelKey: "ui.graph.actions.reveal", target: { file: node.data?.path as string } },
    { id: "directory.open", kind: "navigate", labelKey: "ui.graph.actions.openInEditor", target: { file: node.data?.path as string } },
    { id: "directory.newFile", kind: "run", labelKey: "ui.graph.actions.newFileHere", operation: { id: "fs.newFile", params: { path: node.data?.path as string } } },
  ],

  file: (node) => {
    const path = node.data?.path as string | undefined
    const range = node.data?.range as Range | undefined
    return [
      { id: "file.open", kind: "navigate", labelKey: "ui.graph.actions.openAtRange", target: { file: path, range } },
      { id: "file.history", kind: "navigate", labelKey: "ui.graph.actions.showHistory", target: { node: node.id } },
      { id: "file.callers", kind: "navigate", labelKey: "ui.graph.actions.showCallers", target: { node: node.id } },
      { id: "file.blame", kind: "run", labelKey: "ui.graph.actions.showBlame", operation: { id: "vcs.blame", params: { path } } },
      { id: "file.compareBase", kind: "run", labelKey: "ui.graph.actions.compareToBase", operation: { id: "vcs.diff", params: { path, mode: "branch" } } },
      { id: "file.runTests", kind: "run", labelKey: "ui.graph.actions.runTests", operation: { id: "agent.prompt", params: { prompt: `Run tests for ${path}` } } },
      { id: "file.copyPath", kind: "copy", labelKey: "ui.graph.actions.copyPath", target: { text: path } },
    ]
  },

  package: (node) => {
    const path = node.data?.path as string | undefined
    return [
      { id: "package.open", kind: "navigate", labelKey: "ui.graph.actions.openPackageJson", target: { file: path } },
      { id: "package.runScript", kind: "run", labelKey: "ui.graph.actions.runScript", operation: { id: "agent.prompt", params: { prompt: `Run a package script in ${path}` } } },
      { id: "package.dependencies", kind: "navigate", labelKey: "ui.graph.actions.showDependencies", target: { node: node.id } },
    ]
  },

  commit: (node) => {
    const sha = node.id.replace("commit:", "")
    return [
      { id: "commit.viewDiff", kind: "run", labelKey: "ui.graph.actions.viewDiff", operation: { id: "vcs.diff", params: { base: sha, mode: "committed" } } },
      { id: "commit.copySha", kind: "copy", labelKey: "ui.graph.actions.copySha", target: { text: sha } },
      { id: "commit.openHost", kind: "navigate", labelKey: "ui.graph.actions.openOnHost", target: { url: `https://github.com/commit/${sha}` } },
      { id: "commit.cherryPick", kind: "run", labelKey: "ui.graph.actions.cherryPick", operation: { id: "agent.prompt", params: { prompt: `Cherry-pick commit ${sha}` } } },
    ]
  },

  branch: (node) => {
    const name = node.id.replace("branch:", "")
    return [
      { id: "branch.checkout", kind: "run", labelKey: "ui.graph.actions.checkout", operation: { id: "vcs.checkout", params: { branch: name } } },
      { id: "branch.copyName", kind: "copy", labelKey: "ui.graph.actions.copyName", target: { text: name } },
      { id: "branch.createPR", kind: "run", labelKey: "ui.graph.actions.createPR", operation: { id: "agent.prompt", params: { prompt: `Create a PR for branch ${name}` } } },
    ]
  },

  symbol: (node) => {
    const path = node.data?.path as string | undefined
    const range = node.data?.range as Range | undefined
    return [
      { id: "symbol.open", kind: "navigate", labelKey: "ui.graph.actions.openAtRange", target: { file: path, range } },
      { id: "symbol.findReferences", kind: "navigate", labelKey: "ui.graph.actions.findReferences", target: { node: node.id } },
      { id: "symbol.showCallers", kind: "navigate", labelKey: "ui.graph.actions.showCallers", target: { node: node.id } },
      { id: "symbol.rename", kind: "run", labelKey: "ui.graph.actions.rename", operation: { id: "agent.prompt", params: { prompt: `Rename symbol ${node.label}` } } },
    ]
  },

  test: (node) => {
    const path = node.data?.path as string | undefined
    const name = node.data?.name as string | undefined
    return [
      { id: "test.rerun", kind: "run", labelKey: "ui.graph.actions.rerun", operation: { id: "agent.prompt", params: { prompt: `Re-run test ${name} in ${path}` } } },
      { id: "test.debug", kind: "run", labelKey: "ui.graph.actions.debug", operation: { id: "agent.prompt", params: { prompt: `Debug test ${name} in ${path}` } } },
      { id: "test.openFile", kind: "navigate", labelKey: "ui.graph.actions.openFile", target: { file: path } },
    ]
  },

  "test-run": (node) => [
    { id: "testRun.rerunFailed", kind: "run", labelKey: "ui.graph.actions.rerunFailed", operation: { id: "agent.prompt", params: { prompt: `Re-run failed tests` } } },
    { id: "testRun.copySummary", kind: "copy", labelKey: "ui.graph.actions.copySummary", target: { text: node.summary } },
  ],

  process: (node) => {
    const id = node.id.replace("proc:", "").replace("pty:", "")
    return [
      { id: "process.viewLogs", kind: "navigate", labelKey: "ui.graph.actions.viewLogs", target: { node: node.id } },
      { id: "process.restart", kind: "run", labelKey: "ui.graph.actions.restart", operation: { id: "agent.prompt", params: { prompt: `Restart process ${id}` } } },
      { id: "process.stop", kind: "run", labelKey: "ui.graph.actions.stop", operation: { id: "agent.prompt", params: { prompt: `Stop process ${id}` } } },
      { id: "process.attachDebugger", kind: "run", labelKey: "ui.graph.actions.attachDebugger", operation: { id: "agent.prompt", params: { prompt: `Attach debugger to process ${id}` } } },
    ]
  },

  port: (node) => {
    const port = node.id.replace("port:", "")
    const url = `http://localhost:${port}`
    return [
      { id: "port.openBrowser", kind: "navigate", labelKey: "ui.graph.actions.openInBrowser", target: { url } },
      { id: "port.copyUrl", kind: "copy", labelKey: "ui.graph.actions.copyUrl", target: { text: url } },
      { id: "port.proxy", kind: "run", labelKey: "ui.graph.actions.proxyToLocalhost", operation: { id: "proxy.open", params: { port: Number(port) } } },
    ]
  },

  issue: (node) => {
    const url = node.data?.url as string | undefined
    const ref = node.id
    return [
      { id: "issue.open", kind: "navigate", labelKey: "ui.graph.actions.openInBrowser", target: { url } },
      { id: "issue.startWork", kind: "run", labelKey: "ui.graph.actions.startWork", operation: { id: "agent.prompt", params: { prompt: `Start work on ${ref}` } } },
      { id: "issue.copyRef", kind: "copy", labelKey: "ui.graph.actions.copyReference", target: { text: ref } },
      { id: "issue.createBranch", kind: "run", labelKey: "ui.graph.actions.createBranch", operation: { id: "agent.prompt", params: { prompt: `Create a branch for ${ref}` } } },
    ]
  },
}

export function actionsFor(node: GraphNode, _model?: GraphModel): ActionSpec[] {
  return actionRegistry[node.kind]?.(node) ?? []
}

/**
 * T31.3 — filter actions by the capabilities the snapshot/server advertises.
 * Returns actions the host can actually honour.
 */
export function filterActionsByCapabilities(
  actions: ActionSpec[],
  capabilities: ReadonlySet<string>,
): ActionSpec[] {
  return actions.filter((action) => {
    if (action.kind !== "run" || !action.operation) return true
    const opId = action.operation.id
    if (opId === "vcs.checkout") return capabilities.has("vcs.checkout")
    if (opId === "vcs.diff") return capabilities.has("vcs.diff") || capabilities.has("vcs.status")
    if (opId === "vcs.blame") return capabilities.has("vcs.blame")
    if (opId.startsWith("agent.")) return capabilities.has("agent")
    if (opId === "proxy.open") return capabilities.has("proxy")
    if (opId === "fs.newFile") return capabilities.has("fs.write")
    return true
  })
}

/** Convenience: build the capability set from a snapshot. */
export function capabilitiesFromSnapshot(snapshot?: { capabilities?: string[] }): ReadonlySet<string> {
  return new Set(snapshot?.capabilities ?? [])
}
