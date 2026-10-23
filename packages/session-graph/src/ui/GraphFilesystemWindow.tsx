import type { GraphModel, GraphNode } from "@opencode/session-ui/graph"
import { nodeByID, childIndex } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { For, Show, createMemo, createSignal, type JSX } from "solid-js"

export type GraphFilesystemWindowProps = {
  model: GraphModel
  workspaceRoot: string
  onSelect: (id: string) => void
  onOpen?: (file: GraphNode) => void
  selection?: string
}

function fileStatus(file: GraphNode): "touched" | "untouched" | "session" {
  if (file.domain === "session") return "session"
  if (file.data?.touched === true) return "touched"
  return "untouched"
}

export const GraphFilesystemWindow = (props: GraphFilesystemWindowProps) => {
  const i18n = useI18n()
  const [expandedDirs, setExpandedDirs] = createSignal<Set<string>>(new Set([""]))

  const children = createMemo(() => childIndex(props.model))
  const workspaceNode = createMemo(() => nodeByID(props.model, props.workspaceRoot))

  const rootDirs = createMemo(() => {
    const workspace = workspaceNode()
    if (!workspace) return []
    const kids = children().get(workspace.id) ?? []
    return kids
      .map((id: string) => nodeByID(props.model, id))
      .filter((n): n is GraphNode => !!n && n.kind === "directory")
  })

  const toggleDir = (dirId: string) => {
    setExpandedDirs((current) => {
      const next = new Set(current)
      if (next.has(dirId)) next.delete(dirId)
      else next.add(dirId)
      return next
    })
  }

  const isDirExpanded = (dirId: string) => expandedDirs().has(dirId)

  const renderDir = (dir: GraphNode, depth = 0): JSX.Element => {
    const dirId = dir.id
    const isExpanded = isDirExpanded(dirId)
    const kids = children().get(dirId) ?? []
    const dirChildren = kids
      .map((id: string) => nodeByID(props.model, id))
      .filter((n): n is GraphNode => !!n)

    const dirs = dirChildren.filter((n: GraphNode) => n.kind === "directory")
    const files = dirChildren.filter((n: GraphNode) => n.kind === "file")

    return (
      <div class="flex flex-col" style={{ "margin-left": `${depth * 16}px` }}>
        <div
          class="flex items-center gap-1.5 px-2 py-1 rounded-sm hover:bg-surface-base-hover cursor-pointer"
          onClick={() => toggleDir(dirId)}
        >
          <span
            class="flex shrink-0 items-center justify-center w-4 h-4 text-text-weak"
            style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 120ms ease" }}
          >
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 6l3 3 3-3" />
            </svg>
          </span>
          <span class="text-12-regular text-text-base truncate">{dir.label}</span>
          <span class="text-10-regular text-text-weaker">
            {typeof dir.data?.fileCount === "number" ? dir.data.fileCount : 0} files
            {typeof dir.data?.touchedCount === "number" && dir.data.touchedCount > 0 && (
              <span class="ml-1 text-text-base">({dir.data.touchedCount} touched)</span>
            )}
          </span>
        </div>
        <Show when={isExpanded}>
          <div class="flex flex-col gap-0.5 mt-0.5">
            <For each={dirs.sort((a: GraphNode, b: GraphNode) => a.label.localeCompare(b.label))}>
              {(dir) => renderDir(dir, depth + 1)}
            </For>
            <For each={files.sort((a: GraphNode, b: GraphNode) => a.label.localeCompare(b.label))}>
              {(file) => (
                <div
                  class="flex items-center gap-1.5 px-2 py-1 rounded-sm hover:bg-surface-base-hover cursor-pointer"
                  data-selected={props.selection === file.id}
                  style={{ background: props.selection === file.id ? "var(--theme-selection, #3b82f6)20" : "transparent" }}
                  onClick={() => props.onSelect(file.id)}
                  onDblClick={() => props.onOpen?.(file)}
                >
                  <span class="flex shrink-0 w-4 h-4" aria-hidden="true" />
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 1.5h5l3 3v10H4zM9 1.5V5h3" />
                  </svg>
                  <span class="text-12-mono text-text-base truncate">{file.label}</span>
                  <Show when={fileStatus(file) === "session"}>
                    <span class="text-8-medium text-text-on-success-base px-1 rounded">{i18n.t("ui.sessionGraph.filesystem.session")}</span>
                  </Show>
                  <Show when={fileStatus(file) === "touched"}>
                    <span class="text-8-medium text-text-on-warning-base px-1 rounded">{i18n.t("ui.sessionGraph.filesystem.touched")}</span>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    )
  }

  return (
    <div class="flex flex-col h-full p-2 overflow-y-auto">
      <div class="mb-2 flex items-center gap-2 text-11-regular text-text-weak">
        <span class="text-text-base">{i18n.t("ui.sessionGraph.filesystem.root")}:</span>
        <span class="font-mono truncate">{props.workspaceRoot}</span>
      </div>
      <Show when={workspaceNode()}>
        <div class="flex flex-col gap-0.5">
          <For each={rootDirs().sort((a: GraphNode, b: GraphNode) => a.label.localeCompare(b.label))}>
            {(dir) => renderDir(dir)}
          </For>
        </div>
      </Show>
      <Show when={!workspaceNode()}>
        <div class="flex h-full items-center justify-center text-text-weak">
          {i18n.t("ui.sessionGraph.filesystem.loading")}
        </div>
      </Show>
    </div>
  )
}