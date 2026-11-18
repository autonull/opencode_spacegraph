import { childIndex, nodeByID, type GraphNode, type GraphViewData } from "../../model"
import { createMemo, createSignal, For, Show, type JSX } from "solid-js"
import { fileCount, isTouched, touchedCount } from "./node-data"

export type FilesystemLabels = {
  root: string
  session: string
  touched: string
  loading: string
}

/** The workspace directory tree, expanded state local, with node selection driven by the host. */
export function GraphFilesystemWindow(props: {
  model: GraphViewData
  workspaceRoot: string
  labels: FilesystemLabels
  onSelect: (id: string) => void
  onOpen?: (file: GraphNode) => void
  selection?: string
}) {
  const [expandedDirs, setExpandedDirs] = createSignal<Set<string>>(new Set([""]))
  const children = createMemo(() => childIndex(props.model))
  const workspaceNode = createMemo(() => nodeByID(props.model, props.workspaceRoot))
  const rootDirs = createMemo(() => {
    const workspace = workspaceNode()
    if (!workspace) return []
    return (children().get(workspace.id) ?? [])
      .map((id) => nodeByID(props.model, id))
      .filter((node): node is GraphNode => !!node && node.kind === "directory")
  })

  const toggleDir = (id: string) => setExpandedDirs((current) => {
    const next = new Set(current)
    if (!next.delete(id)) next.add(id)
    return next
  })

  const renderDir = (dir: GraphNode, depth = 0): JSX.Element => {
    const expanded = expandedDirs().has(dir.id)
    const nodes = (children().get(dir.id) ?? [])
      .map((id) => nodeByID(props.model, id))
      .filter((node): node is GraphNode => !!node)
    const dirs = nodes.filter((node) => node.kind === "directory").sort((a, b) => a.label.localeCompare(b.label))
    const files = nodes.filter((node) => node.kind === "file").sort((a, b) => a.label.localeCompare(b.label))

    return (
      <div class="sg-files__branch" style={{ "margin-left": `${depth * 16}px` }}>
        <button type="button" class="sg-files__dir" aria-expanded={expanded} onClick={() => toggleDir(dir.id)}>
          <span class="sg-files__chevron" classList={{ "sg-files__chevron--open": expanded }}>›</span>
          <span class="sg-files__dir-label">{dir.label}</span>
          <small>{fileCount(dir)} files</small>
          <Show when={touchedCount(dir) > 0}><small>({touchedCount(dir)} touched)</small></Show>
        </button>
        <Show when={expanded}>
          <For each={dirs}>{(child) => renderDir(child, depth + 1)}</For>
          <For each={files}>{(file) => (
            <button
              type="button"
              class="sg-files__file"
              data-selected={props.selection === file.id}
              onClick={() => props.onSelect(file.id)}
              onDblClick={() => props.onOpen?.(file)}
            >
              <span aria-hidden="true">◇</span>
              <span class="sg-files__file-label">{file.label}</span>
              <Show when={file.domain === "session"}><small>{props.labels.session}</small></Show>
              <Show when={isTouched(file)}><small>{props.labels.touched}</small></Show>
            </button>
          )}</For>
        </Show>
      </div>
    )
  }

  return (
    <div class="sg-files" data-component="session-graph-filesystem">
      <div class="sg-files__root">
        <span>{props.labels.root}:</span>
        <code>{props.workspaceRoot}</code>
      </div>
      <Show when={workspaceNode()} fallback={<div class="sg-files__empty">{props.labels.loading}</div>}>
        <For each={rootDirs().sort((a, b) => a.label.localeCompare(b.label))}>{(dir) => renderDir(dir)}</For>
      </Show>
    </div>
  )
}
