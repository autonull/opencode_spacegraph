import type { GraphViewData, GraphNode, GraphFacets, NodeKind, NodeStatus, Domain } from "@opencode/session-ui/graph"
import { rankedSearch, sessionOutline, facetCounts } from "@opencode/session-ui/graph"
import { NODE_KINDS, NODE_STATUSES, DOMAINS } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { createSignal, createMemo, Show, For } from "solid-js"
import { GraphIconButton } from "./GraphIconButton"
import { KIND_KEY, STATUS_KEY, DOMAIN_KEY } from "./vocabulary"

export type GraphFindProps = {
  model: GraphViewData
  facets: GraphFacets
  onFacetsChange: (facets: GraphFacets) => void
  onSelect: (node: GraphNode) => void
  onClose: () => void
  initialTab?: "search" | "filters" | "outline"
}

/**
 * Unified Find panel (Slice 7).
 * One window combining search, filters, and session outline.
 * Opened from toolbar search (Shift+F) or command palette.
 */
export const GraphFind = (props: GraphFindProps) => {
  const i18n = useI18n()
  const [query, setQuery] = createSignal("")
  const [activeIndex, setActiveIndex] = createSignal(0)
  const [activeTab, setActiveTab] = createSignal<"search" | "filters" | "outline">(props.initialTab ?? "search")

  const searchResults = createMemo(() => {
    const q = query().trim()
    if (!q) return []
    return rankedSearch(props.model, q)
  })

  const outline = createMemo(() => sessionOutline(props.model))
  const counts = createMemo(() => facetCounts(props.model, props.facets))

  const handleSelectResult = (node: GraphNode) => {
    props.onSelect(node)
    props.onClose()
  }

  const handleOutlineSelect = (turnID: string) => {
    const turnNode = props.model.nodes.find((n) => n.id === turnID)
    if (turnNode) {
      props.onSelect(turnNode)
      props.onClose()
    }
  }

  const changeFacets = (next: Partial<GraphFacets>) => {
    const current = props.facets
    props.onFacetsChange({
      query: next.query ?? current.query,
      kinds: next.kinds ?? current.kinds,
      statuses: next.statuses ?? current.statuses,
      domains: next.domains ?? current.domains,
    })
  }

  const toggleKind = (kind: NodeKind) => {
    const current = new Set(props.facets.kinds)
    if (current.has(kind)) current.delete(kind)
    else current.add(kind)
    changeFacets({ kinds: current })
  }

  const toggleStatus = (status: NodeStatus) => {
    const current = new Set(props.facets.statuses)
    if (current.has(status)) current.delete(status)
    else current.add(status)
    changeFacets({ statuses: current })
  }

  const toggleDomain = (domain: Domain) => {
    const current = new Set(props.facets.domains)
    if (current.has(domain)) {
      if (domain === "session") return
      current.delete(domain)
    } else {
      current.add(domain)
    }
    changeFacets({ domains: current })
  }

  const clearFacets = () => {
    changeFacets({ query: "", kinds: new Set(), statuses: new Set() })
  }

  const countLabel = (value: string, counts: readonly { value: string; kept: number; total: number }[]) => {
    const count = counts.find((entry) => entry.value === value)
    return count ? `${count.kept}/${count.total}` : "0/0"
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation()
      props.onClose()
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      if (activeTab() === "search") {
        setActiveIndex((prev) => Math.min(searchResults().length - 1, prev + 1))
      }
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      if (activeTab() === "search") {
        setActiveIndex((prev) => Math.max(0, prev - 1))
      }
      return
    }

    if (event.key === "Home") {
      event.preventDefault()
      if (activeTab() === "search") setActiveIndex(0)
      return
    }

    if (event.key === "End") {
      event.preventDefault()
      if (activeTab() === "search") setActiveIndex(searchResults().length - 1)
      return
    }

    if (event.key === "Enter") {
      if (activeTab() === "search") {
        const node = searchResults()[activeIndex()]
        if (node) handleSelectResult(node)
      }
      return
    }

    // Tab switching: Shift+O for outline, Alt+F for filters
    if (event.key === "o" && event.shiftKey) {
      event.preventDefault()
      setActiveTab("outline")
      return
    }
    if (event.key === "f" && event.altKey) {
      event.preventDefault()
      setActiveTab("filters")
      return
    }
    if (event.key === "s" && event.shiftKey) {
      event.preventDefault()
      setActiveTab("search")
      return
    }
  }

  return (
    <div
      data-component="session-graph-find"
      data-slot="graph-find"
      class="flex flex-col h-full overflow-hidden"
      role="dialog"
      aria-label={i18n.t("ui.sessionGraph.find.title")}
      onKeyDown={handleKeyDown}
    >
      {/* Tab bar */}
      <div class="flex shrink-0 border-b border-border-weaker-base" role="tablist" aria-label={i18n.t("ui.sessionGraph.find.tabs")}>
        <button
          role="tab"
          aria-selected={activeTab() === "search"}
          class={`flex-1 px-3 py-2 text-12-medium text-center border-b-2 transition-colors ${
            activeTab() === "search"
              ? "border-primary-base text-primary-base"
              : "border-transparent text-text-weak hover:text-text-base"
          }`}
          onClick={() => setActiveTab("search")}
        >
          {i18n.t("ui.sessionGraph.find.tabSearch")}
          <kbd class="ml-1.5 rounded border border-border-weaker-base px-1 text-10-regular text-text-weaker">
            Shift+S
          </kbd>
        </button>
        <button
          role="tab"
          aria-selected={activeTab() === "filters"}
          class={`flex-1 px-3 py-2 text-12-medium text-center border-b-2 transition-colors ${
            activeTab() === "filters"
              ? "border-primary-base text-primary-base"
              : "border-transparent text-text-weak hover:text-text-base"
          }`}
          onClick={() => setActiveTab("filters")}
        >
          {i18n.t("ui.sessionGraph.find.tabFilters")}
          <kbd class="ml-1.5 rounded border border-border-weaker-base px-1 text-10-regular text-text-weaker">
            Alt+F
          </kbd>
        </button>
        <button
          role="tab"
          aria-selected={activeTab() === "outline"}
          class={`flex-1 px-3 py-2 text-12-medium text-center border-b-2 transition-colors ${
            activeTab() === "outline"
              ? "border-primary-base text-primary-base"
              : "border-transparent text-text-weak hover:text-text-base"
          }`}
          onClick={() => setActiveTab("outline")}
        >
          {i18n.t("ui.sessionGraph.find.tabOutline")}
          <kbd class="ml-1.5 rounded border border-border-weaker-base px-1 text-10-regular text-text-weaker">
            Shift+O
          </kbd>
        </button>
      </div>

      {/* Search input (always visible) */}
      <div class="flex items-center gap-2 border-b border-border-weaker-base p-2">
        <svg
          class="shrink-0 w-5 h-5 text-text-weak"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="8" cy="8" r="6" />
          <path d="M11 11l4 4" />
        </svg>
        <input
          type="text"
          value={query()}
          class="flex-1 bg-transparent text-13-regular text-text-base outline-none placeholder:text-text-weaker"
          placeholder={i18n.t("ui.sessionGraph.find.searchPlaceholder")}
          aria-label={i18n.t("ui.sessionGraph.find.searchPlaceholder")}
          onInput={(event) => {
            setQuery(event.currentTarget.value)
            setActiveIndex(0)
          }}
        />
        <Show when={query()}>
          <GraphIconButton
            label={i18n.t("ui.sessionGraph.find.clear")}
            icon="close-small"
            onClick={() => setQuery("")}
          />
        </Show>
      </div>

      {/* Content panels */}
      <div class="flex-1 overflow-y-auto">
        <Show when={activeTab() === "search"}>
          <div class="p-3">
            <Show when={query().trim().length > 0}>
              <Show
                when={searchResults().length > 0}
                fallback={<div class="text-12-regular text-text-weaker py-4">{i18n.t("ui.sessionGraph.find.noResults")}</div>}
              >
                <div class="mb-2 text-12-regular text-text-weaker">
                  {searchResults().length} {i18n.t("ui.sessionGraph.find.results")}
                </div>
                <ul role="listbox" aria-label={i18n.t("ui.sessionGraph.find.searchResults")} class="flex flex-col gap-1">
                  <For each={searchResults()}>
                    {(node, index) => (
                      <li>
                        <button
                          type="button"
                          role="option"
                          aria-selected={index() === activeIndex()}
                          class={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition-colors ${
                            index() === activeIndex() ? "bg-surface-base-hover" : "hover:bg-surface-base-hover"
                          }`}
                          onMouseEnter={() => setActiveIndex(index())}
                          onClick={() => handleSelectResult(node)}
                        >
                          <span class="shrink-0 text-12-regular text-text-weak">
                            {i18n.t(KIND_KEY[node.kind])}
                          </span>
                          <span class="truncate text-13-regular text-text-base">{node.label}</span>
                          <Show when={node.summary}>
                            <span class="shrink-0 truncate text-12-regular text-text-weak max-w-[120px]">{node.summary}</span>
                          </Show>
                        </button>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </Show>
            <Show when={!query().trim()}>
              <div class="text-12-regular text-text-weaker py-4 text-center">
                {i18n.t("ui.sessionGraph.find.enterQuery")}
              </div>
            </Show>
          </div>
        </Show>

        <Show when={activeTab() === "filters"}>
          <div class="p-3 space-y-4">
            {/* Query filter */}
            <div>
              <label class="text-11-medium uppercase tracking-wide text-text-weak block mb-1">
                {i18n.t("ui.sessionGraph.facets.query")}
              </label>
              <input
                type="text"
                value={props.facets.query ?? ""}
                class="w-full h-8 rounded-sm border border-border-weaker-base bg-surface-base px-2 text-12-regular text-text-base outline-none placeholder:text-text-weaker"
                placeholder={i18n.t("ui.sessionGraph.facets.placeholder")}
                onInput={(event) => changeFacets({ query: event.currentTarget.value })}
              />
            </div>

            {/* Kinds */}
            <div>
              <label class="text-11-medium uppercase tracking-wide text-text-weak block mb-1">
                {i18n.t("ui.sessionGraph.facets.kinds")}
              </label>
              <div class="flex flex-wrap gap-1">
                <For each={NODE_KINDS as readonly NodeKind[]}>
                  {(kind: NodeKind) => (
                    <button
                      type="button"
                      class={`flex items-center gap-1 rounded-sm px-2 py-1 text-11-regular transition-colors ${
                        props.facets.kinds.has(kind)
                          ? "bg-primary-weaker text-primary-base"
                          : "text-text-base hover:bg-surface-base-hover"
                      }`}
                      onClick={() => toggleKind(kind)}
                      aria-pressed={props.facets.kinds.has(kind)}
                    >
                      {i18n.t(KIND_KEY[kind])}
                      <span class="text-text-weaker">({countLabel(kind, counts().kinds)})</span>
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* Statuses */}
            <div>
              <label class="text-11-medium uppercase tracking-wide text-text-weak block mb-1">
                {i18n.t("ui.sessionGraph.facets.statuses")}
              </label>
              <div class="flex flex-wrap gap-1">
                <For each={NODE_STATUSES as readonly NodeStatus[]}>
                  {(status: NodeStatus) => (
                    <button
                      type="button"
                      class={`flex items-center gap-1 rounded-sm px-2 py-1 text-11-regular transition-colors ${
                        props.facets.statuses.has(status)
                          ? "bg-primary-weaker text-primary-base"
                          : "text-text-base hover:bg-surface-base-hover"
                      }`}
                      onClick={() => toggleStatus(status)}
                      aria-pressed={props.facets.statuses.has(status)}
                    >
                      {i18n.t(STATUS_KEY[status])}
                      <span class="text-text-weaker">({countLabel(status, counts().statuses)})</span>
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* Domains */}
            <div>
              <label class="text-11-medium uppercase tracking-wide text-text-weak block mb-1">
                {i18n.t("ui.sessionGraph.facets.domains")}
              </label>
              <div class="flex flex-wrap gap-1">
                <For each={DOMAINS as readonly Domain[]}>
                  {(domain: Domain) => (
                    <button
                      type="button"
                      class={`flex items-center gap-1 rounded-sm px-2 py-1 text-11-regular transition-colors ${
                        props.facets.domains.has(domain)
                          ? "bg-primary-weaker text-primary-base"
                          : "text-text-base hover:bg-surface-base-hover"
                      }`}
                      onClick={() => toggleDomain(domain)}
                      aria-pressed={props.facets.domains.has(domain)}
                      disabled={domain === "session"}
                    >
                      {i18n.t(DOMAIN_KEY[domain])}
                      <span class="text-text-weaker">({countLabel(domain, counts().domains)})</span>
                    </button>
                  )}
                </For>
              </div>
            </div>

            <button
              type="button"
              class="w-full rounded-sm px-3 py-1.5 text-12-regular text-text-base hover:bg-surface-base-hover transition-colors"
              onClick={clearFacets}
            >
              {i18n.t("ui.sessionGraph.facets.clear")}
            </button>
          </div>
        </Show>

        <Show when={activeTab() === "outline"}>
          <div class="p-3">
            <ul class="flex flex-col gap-1" role="tree" aria-label={i18n.t("ui.sessionGraph.find.outlineLabel")}>
              <For each={outline()}>
                {(turn) => (
                  <li class="flex flex-col" role="treeitem">
                    <button
                      type="button"
                      class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-surface-base-hover transition-colors"
                      onClick={() => handleOutlineSelect(turn.turnID)}
                    >
                      <svg
                        class="shrink-0 w-4 h-4 text-text-weak"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M4 4h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                        <path d="M4 10h8" />
                      </svg>
                      <span class="flex-1 truncate text-13-medium text-text-base">{turn.turnLabel}</span>
                      <span class="shrink-0 text-11-regular text-text-weaker">{turn.phases.length} phases</span>
                    </button>
                    <Show when={turn.phases.length > 0}>
                      <ul class="ml-6 mt-1 flex flex-col gap-0.5 border-s border-border-weaker-base ps-2" role="group">
                        <For each={turn.phases}>
                          {(phase) => (
                            <li role="treeitem">
                              <button
                                type="button"
                                class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-surface-base-hover transition-colors"
                                onClick={() => {
                                  const phaseNode = props.model.nodes.find((n) => n.id === phase.id)
                                  if (phaseNode) {
                                    props.onSelect(phaseNode)
                                    props.onClose()
                                  }
                                }}
                              >
                                <span
                                  class="shrink-0 w-2 h-2 rounded-full"
                                  style={{
                                    "background-color":
                                      phase.category === "explore"
                                        ? "var(--color-info)"
                                        : phase.category === "edit"
                                        ? "var(--color-warning)"
                                        : phase.category === "verify"
                                        ? "var(--color-success)"
                                        : phase.category === "delegate"
                                        ? "var(--color-purple)"
                                        : "var(--color-text-weak)",
                                  }}
                                />
                                <span class="truncate text-12-regular text-text-base">{phase.label}</span>
                                <span class="shrink-0 text-10-regular text-text-weaker uppercase">
                                  {phase.category}
                                </span>
                              </button>
                            </li>
                          )}
                        </For>
                      </ul>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
            <Show when={outline().length === 0}>
              <div class="text-12-regular text-text-weaker py-4 text-center">
                {i18n.t("ui.sessionGraph.find.noOutline")}
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  )
}