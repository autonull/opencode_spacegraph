import { createMemo, createSignal, For, Show } from "solid-js"
import { useI18n } from "@opencode/ui/context/i18n"
import type { GraphNode } from "@opencode/session-ui/graph"
import { diffPreview, type DiffLine } from "./node-widget-data"
import "./node-widgets.css"

export type DiffFileStat = {
  path: string
  additions?: number
  deletions?: number
}

/** A small read-only diff for an edit-like tool node. */
export type DiffNodeWidgetProps = {
  node: GraphNode
  /** Files the call wrote, with the graph's accumulated stats, when the input carries no patch. */
  files?: readonly DiffFileStat[]
}

const PREVIEW_LINES = 8

export const DiffNodeWidget = (props: DiffNodeWidgetProps) => {
  const i18n = useI18n()
  const [open, setOpen] = createSignal(false)
  const preview = createMemo(() => diffPreview(props.node))
  const files = createMemo(() => props.files ?? [])
  const additions = createMemo(
    () => preview()?.additions ?? files().reduce((sum, file) => sum + (file.additions ?? 0), 0),
  )
  const deletions = createMemo(
    () => preview()?.deletions ?? files().reduce((sum, file) => sum + (file.deletions ?? 0), 0),
  )
  const shown = createMemo(() => {
    const lines = preview()?.lines ?? []
    return open() ? lines : lines.slice(0, PREVIEW_LINES)
  })
  const title = createMemo(() => preview()?.file ?? files()[0]?.path)

  const marker = (line: DiffLine) => (line.kind === "add" ? "+" : line.kind === "remove" ? "−" : " ")

  return (
    <div
      class="node-widget"
      data-slot="diff-node-widget"
      role="group"
      aria-label={i18n.t("ui.sessionGraph.widgets.diff.label")}
    >
      <div class="node-widget-header">
        <span class="node-widget-title" title={title()}>
          {title() ?? i18n.t("ui.sessionGraph.widgets.diff.title")}
        </span>
        <span class="node-widget-meta" data-slot="diff-node-widget-stats">
          <Show when={additions() > 0}>+{additions()} </Show>
          <Show when={deletions() > 0}>−{deletions()}</Show>
        </span>
        <button
          type="button"
          class="node-widget-toggle"
          data-slot="diff-node-widget-toggle"
          aria-expanded={open()}
          aria-label={i18n.t(
            open() ? "ui.sessionGraph.widgets.collapse" : "ui.sessionGraph.widgets.expand",
          )}
          onClick={() => setOpen((value) => !value)}
        >
          {open() ? "−" : "+"}
        </button>
      </div>
      <Show
        when={preview()}
        fallback={
          <Show
            when={files().length > 0}
            fallback={<span class="node-widget-empty">{i18n.t("ui.sessionGraph.widgets.diff.empty")}</span>}
          >
            <ul class="node-widget-list">
              <For each={files()}>
                {(file) => (
                  <li class="node-widget-list-item">
                    <span class="node-widget-text" title={file.path}>
                      {file.path}
                    </span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        }
      >
        {(value) => (
          <>
            <pre class="node-widget-diff" data-slot="diff-node-widget-lines">
              <For each={shown()}>
                {(line) => (
                  <div class="node-widget-diff-line" data-kind={line.kind}>
                    {marker(line)}
                    {line.text}
                  </div>
                )}
              </For>
              <Show when={!open() && value().lines.length > PREVIEW_LINES}>…</Show>
            </pre>
            <Show when={files().length > 1}>
              <span class="node-widget-meta">
                {i18n.plural("ui.sessionGraph.widgets.diff.files", files().length)}
              </span>
            </Show>
          </>
        )}
      </Show>
    </div>
  )
}
