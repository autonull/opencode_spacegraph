import type { GraphViewData, GraphNode } from "@opencode/session-ui/graph"
import {
  applyFacets,
  navigationHelp,
  navigationResults,
  rankedSearch,
} from "@opencode/session-ui/graph"
import { parseNLQ } from "@opencode/session-ui/graph"
import { Icon } from "@opencode/ui/icon"
import { useI18n } from "@opencode/ui/context/i18n"
import { createEffect, createMemo, createSignal, For, onMount, Show } from "solid-js"
import { GraphIconButton } from "./GraphIconButton"

export type GraphSearchProps = {
  model: GraphViewData
  contentIDs: string[]
  onSelect: (node: GraphNode) => void
  onClose: () => void
  initialQuery?: string
}

/**
 * Label/tool/path search (U3.12). It reuses the model selector, so results are the same nodes the
 * inspector can describe; selecting one jumps the graph to it.
 * Also supports natural language queries (NLQ) that compile to facet grammar.
 */
export const GraphSearch = (props: GraphSearchProps) => {
  const i18n = useI18n()
  const [query, setQuery] = createSignal(props.initialQuery ?? "")
  const [active, setActive] = createSignal(0)
  const [compiledQuery, setCompiledQuery] = createSignal<string>("")

  const results = createMemo(() => {
    const q = query().trim()

    // Try NLQ compilation first - if it produces facet filters, use facet-based search
    const { facets, queryString } = parseNLQ(q)
    const hasFacetFilters = facets.kinds.size > 0 || facets.statuses.size > 0 || facets.domains.size > 1 // >1 because "session" is default

    if (hasFacetFilters) {
      setCompiledQuery(queryString)
      const scopedModel = applyFacets(props.model, facets)
      const filteredNodes = scopedModel.nodes.filter((node) => node.id !== scopedModel.root)
      if (props.contentIDs.length === 0) return filteredNodes
      const contentIDSet = new Set(props.contentIDs)
      return filteredNodes.filter((node) => contentIDSet.has(node.id))
    }

    // No facet filters from NLQ - fall back to existing search
    setCompiledQuery("")
    const fullResults = navigationResults(props.model, q) ?? rankedSearch(props.model, q)
    if (props.contentIDs.length === 0) return fullResults
    const contentIDSet = new Set(props.contentIDs)
    return fullResults.filter((node) => contentIDSet.has(node.id))
  })
  const navigationHint = createMemo(() =>
    query().trim().toLowerCase() === "g" ? navigationHelp() : [],
  )
  // eslint-disable-next-line no-unassigned-vars -- assigned via ref in JSX
  let input!: HTMLInputElement
  // eslint-disable-next-line no-unassigned-vars -- assigned via ref in JSX
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
      if (node) {
        // Add search hit ring animation to the selected node
        if ((node as GraphNode & { className?: string }).className === undefined) {
          const nodeWithClass = node as GraphNode & { className?: string }
          nodeWithClass.className = "graph-search-hit"
          setTimeout(() => {
            delete nodeWithClass.className
          }, 200)
        }
        props.onSelect(node)
      }
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
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.search.close")}
          icon="close-small"
          onClick={props.onClose}
        />
      </div>

      <Show when={compiledQuery()}>
        <div class="px-3 py-1.5 bg-accent-subtle border-b border-border-weaker-base text-11-regular text-text-weak">
          <kbd class="rounded border border-border-weaker-base px-1">{compiledQuery()}</kbd>
        </div>
      </Show>

      <Show when={navigationHint().length > 0}>
        <div class="grid grid-cols-3 gap-x-3 gap-y-1 border-t border-border-weaker-base px-3 py-2">
          <For each={navigationHint()}>
            {(entry) => (
              <button
                type="button"
                class="flex items-center gap-1 text-left text-12-regular text-text-weak hover:text-text-strong"
                onClick={() => setQuery(`g ${entry.key}`)}
              >
                <kbd class="rounded border border-border-weaker-base px-1 text-11-regular">g {entry.key}</kbd>
                <span class="truncate">{i18n.t(entry.labelKey)}</span>
              </button>
            )}
          </For>
        </div>
      </Show>

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
