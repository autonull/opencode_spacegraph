import { createMemo, createSignal, For, Show } from "solid-js"
import { useI18n } from "@opencode/ui/context/i18n"
import type { GraphNode } from "@opencode/session-ui/graph"
import { todoItems } from "./node-widget-data"
import "./node-widgets.css"

/** A compact todo list for a `todowrite` tool node. */
export type TodoNodeWidgetProps = {
  node: GraphNode
}

export const TodoNodeWidget = (props: TodoNodeWidgetProps) => {
  const i18n = useI18n()
  const [open, setOpen] = createSignal(true)
  const items = createMemo(() => todoItems(props.node))
  const completed = createMemo(() => items().filter((item) => item.status === "completed").length)

  return (
    <div
      class="node-widget"
      data-slot="todo-node-widget"
      role="group"
      aria-label={i18n.t("ui.sessionGraph.widgets.todo.label")}
    >
      <div class="node-widget-header">
        <span class="node-widget-title">{i18n.t("ui.sessionGraph.widgets.todo.title")}</span>
        <span class="node-widget-meta" data-slot="todo-node-widget-progress">
          {i18n.t("ui.sessionGraph.widgets.todo.progress", { done: completed(), total: items().length })}
        </span>
        <button
          type="button"
          class="node-widget-toggle"
          data-slot="todo-node-widget-toggle"
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
        when={open()}
        fallback={<span class="node-widget-empty">{i18n.t("ui.sessionGraph.widgets.todo.folded")}</span>}
      >
        <Show
          when={items().length > 0}
          fallback={<span class="node-widget-empty">{i18n.t("ui.sessionGraph.widgets.todo.empty")}</span>}
        >
          <ul class="node-widget-list">
            <For each={items()}>
              {(item) => (
                <li class="node-widget-list-item" data-status={item.status}>
                  <span class="node-widget-marker" aria-hidden="true">
                    {item.status === "completed" ? "✓" : item.status === "in_progress" ? "•" : "○"}
                  </span>
                  <span class="node-widget-text" title={item.content}>
                    {item.content}
                  </span>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  )
}
