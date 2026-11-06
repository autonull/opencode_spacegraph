import type { ChangedFile } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { For, Show } from "solid-js"

export type GraphFileRailProps = {
  files: readonly ChangedFile[]
  selection?: readonly string[]
  /** Selecting a file node inverts the question: its writers light up at execution. */
  onSelect: (id: string) => void
}

/**
 * LE.12 — the changed-files rail: a persistent, file-first lens over the graph. It lists the session's
 * written files in first-write order; selecting one selects the file node, whose inspector detail names
 * the writers. It owns no state and reads the model only through `changedFiles`.
 */
export const GraphFileRail = (props: GraphFileRailProps) => {
  const i18n = useI18n()

  return (
    <aside
      data-component="session-graph-file-rail"
      data-slot="graph-file-rail"
      aria-label={i18n.t("ui.sessionGraph.fileRail.label")}
      class="flex w-52 shrink-0 flex-col overflow-y-auto border-e border-border-weaker-base"
    >
      <div class="px-2 py-1.5 text-12-medium text-text-weak">{i18n.t("ui.sessionGraph.fileRail.label")}</div>
      <Show
        when={props.files.length > 0}
        fallback={<div class="px-2 py-1 text-12-regular text-text-weaker">{i18n.t("ui.sessionGraph.fileRail.empty")}</div>}
      >
        <ul class="flex flex-col">
          <For each={props.files}>
            {(file) => (
              <li>
                <button
                  type="button"
                  data-slot="graph-file-rail-item"
                  data-file={file.id}
                  aria-pressed={props.selection?.includes(file.id) ? "true" : "false"}
                  class="flex w-full flex-col gap-0.5 px-2 py-1.5 text-start hover:bg-surface-base-hover"
                  onClick={() => props.onSelect(file.id)}
                >
                  <span class="truncate font-mono text-12-regular text-text-base" title={file.path}>
                    {file.path}
                  </span>
                  <span class="text-12-regular text-text-weak">
                    {i18n.plural("ui.sessionGraph.fileRail.changes", file.writers.length)}
                  </span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </aside>
  )
}
