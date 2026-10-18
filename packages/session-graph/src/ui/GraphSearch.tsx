import type { GraphModel, GraphNode } from "@opencode/session-ui/graph"
import { search } from "@opencode/session-ui/graph"
import { IconButton } from "@opencode/ui/icon-button"
import { Icon } from "@opencode/ui/icon"
import { useI18n } from "@opencode/ui/context/i18n"
import { createMemo, createSignal, For, onMount, Show } from "solid-js"

export type GraphSearchProps = {
  model: GraphModel
  onSelect: (node: GraphNode) => void
  onClose: () => void
}

/**
 * Label/tool/path search (U3.12). It reuses the model selector, so results are the same nodes the
 * inspector can describe; selecting one jumps the graph to it.
 */
export const GraphSearch = (props: GraphSearchProps) => {
  const i18n = useI18n()
  const [query, setQuery] = createSignal("")
  const results = createMemo(() => search(props.model, query()))
  let input!: HTMLInputElement

  onMount(() => input.focus())

  return (
    <div
      data-component="session-graph-search"
      data-slot="graph-search"
      class="absolute left-2 top-2 z-10 flex w-72 max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-md border border-border-base bg-background-base shadow-md"
      role="dialog"
      aria-label={i18n.t("ui.sessionGraph.toolbar.search")}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation()
          props.onClose()
        }
      }}
    >
      <div class="flex items-center gap-2 px-2 py-1.5">
        <Icon name="magnifying-glass" size="small" class="shrink-0 text-text-weak" />
        <input
          ref={input}
          value={query()}
          class="min-w-0 flex-1 bg-transparent text-14-regular text-text-strong outline-none placeholder:text-text-weaker"
          placeholder={i18n.t("ui.sessionGraph.search.placeholder")}
          aria-label={i18n.t("ui.sessionGraph.search.placeholder")}
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
        <IconButton
          size="small"
          variant="ghost"
          aria-label={i18n.t("ui.sessionGraph.search.close")}
          title={i18n.t("ui.sessionGraph.search.close")}
          onClick={props.onClose}
          icon={<Icon name="close-small" size="small" />}
        />
      </div>

      <Show when={query().trim().length > 0}>
        <div class="max-h-72 overflow-y-auto border-t border-border-weaker-base">
          <Show
            when={results().length > 0}
            fallback={
              <div class="px-3 py-2 text-12-regular text-text-weaker">{i18n.t("ui.sessionGraph.search.noResults")}</div>
            }
          >
            <div class="px-3 py-1 text-12-regular text-text-weaker">
              {i18n.plural("ui.sessionGraph.search.results", results().length)}
            </div>
            <ul>
              <For each={results()}>
                {(node) => (
                  <li>
                    <button
                      type="button"
                      class="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left hover:bg-surface-base-hover"
                      onClick={() => props.onSelect(node)}
                    >
                      <span class="truncate text-12-regular text-text-strong">{node.label}</span>
                      <Show when={node.summary}>
                        <span class="truncate text-12-regular text-text-weak">{node.summary}</span>
                      </Show>
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>
      </Show>
    </div>
  )
}
