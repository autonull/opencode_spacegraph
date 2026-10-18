import type { GraphModel, GraphNode } from "@opencode/session-ui/graph"
import { search } from "@opencode/session-ui/graph"
import { IconButton } from "@opencode/ui/icon-button"
import { Icon } from "@opencode/ui/icon"
import { useI18n } from "@opencode/ui/context/i18n"
import { createEffect, createMemo, createSignal, For, onMount, Show } from "solid-js"

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
  const [active, setActive] = createSignal(0)
  const results = createMemo(() => search(props.model, query()))
  let input!: HTMLInputElement
  let list!: HTMLDivElement

  createEffect(() => {
    query()
    setActive(0)
  })
  // Keep the highlighted row in view as the arrows move it through a long result list.
  createEffect(() => {
    const index = active()
    queueMicrotask(() => list?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" }))
  })

  const move = (delta: number) => {
    const max = results().length - 1
    if (max < 0) return
    setActive((current) => Math.min(max, Math.max(0, current + delta)))
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation()
      props.onClose()
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      move(1)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      move(-1)
      return
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault()
      setActive(event.key === "Home" ? 0 : results().length - 1)
      return
    }

    if (event.key === "Enter") {
      const node = results()[active()]
      if (node) props.onSelect(node)
    }
  }

  onMount(() => input.focus())

  return (
    <div
      data-component="session-graph-search"
      data-slot="graph-search"
      class="absolute left-2 top-2 z-10 flex w-72 max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-md border border-border-base bg-background-base shadow-md"
      role="dialog"
      aria-label={i18n.t("ui.sessionGraph.toolbar.search")}
      onKeyDown={onKeyDown}
    >
      <div class="flex items-center gap-2 px-2 py-1.5">
        <Icon name="magnifying-glass" size="small" class="shrink-0 text-text-weak" />
        <input
          ref={input}
          value={query()}
          class="min-w-0 flex-1 bg-transparent text-14-regular text-text-strong outline-none placeholder:text-text-weaker"
          placeholder={i18n.t("ui.sessionGraph.search.placeholder")}
          aria-label={i18n.t("ui.sessionGraph.search.placeholder")}
          role="combobox"
          aria-expanded={results().length > 0}
          aria-controls="graph-search-results"
          aria-activedescendant={results().length > 0 ? `graph-search-option-${active()}` : undefined}
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
        <div ref={list} class="max-h-72 overflow-y-auto border-t border-border-weaker-base">
          <Show
            when={results().length > 0}
            fallback={
              <div class="px-3 py-2 text-12-regular text-text-weaker">{i18n.t("ui.sessionGraph.search.noResults")}</div>
            }
          >
            <div class="px-3 py-1 text-12-regular text-text-weaker">
              {i18n.plural("ui.sessionGraph.search.results", results().length)}
            </div>
            <ul id="graph-search-results" role="listbox" aria-label={i18n.t("ui.sessionGraph.toolbar.search")}>
              <For each={results()}>
                {(node, index) => (
                  <li>
                    <button
                      type="button"
                      id={`graph-search-option-${index()}`}
                      data-index={index()}
                      data-node-id={node.id}
                      data-active={index() === active()}
                      role="option"
                      aria-selected={index() === active()}
                      class="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left hover:bg-surface-base-hover"
                      classList={{ "bg-surface-base-hover": index() === active() }}
                      onMouseEnter={() => setActive(index())}
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
