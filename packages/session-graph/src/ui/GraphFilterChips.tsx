import { createMemo, createSignal, For } from "solid-js"
import { useI18n } from "@opencode/ui/context/i18n"
import { Icon } from "@opencode/ui/icon"
import type { GraphFacets, FacetCounts } from "@opencode/session-ui/graph"
import { GraphIconButton } from "./GraphIconButton"

export type SemanticFilterKey = "failedTools" | "fileWrites" | "subagentCalls" | "errors" | "retries" | "costlyNodes"

interface SemanticFilterConfig {
  key: SemanticFilterKey
  labelKey: string
  ariaKey: string
  iconName: string
}

const SEMANTIC_FILTERS: SemanticFilterConfig[] = [
  {
    key: "failedTools",
    labelKey: "ui.sessionGraph.toolbar.filter.failed",
    ariaKey: "ui.sessionGraph.toolbar.filter.failedAria",
    iconName: "outline-x-circle",
  },
  {
    key: "fileWrites",
    labelKey: "ui.sessionGraph.toolbar.filter.writes",
    ariaKey: "ui.sessionGraph.toolbar.filter.writesAria",
    iconName: "outline-file-text",
  },
  {
    key: "subagentCalls",
    labelKey: "ui.sessionGraph.toolbar.filter.subagents",
    ariaKey: "ui.sessionGraph.toolbar.filter.subagentsAria",
    iconName: "outline-terminal",
  },
  {
    key: "errors",
    labelKey: "ui.sessionGraph.toolbar.filter.errors",
    ariaKey: "ui.sessionGraph.toolbar.filter.errorsAria",
    iconName: "outline-alert-circle",
  },
  {
    key: "retries",
    labelKey: "ui.sessionGraph.toolbar.filter.retries",
    ariaKey: "ui.sessionGraph.toolbar.filter.retriesAria",
    iconName: "outline-refresh-cw",
  },
  {
    key: "costlyNodes",
    labelKey: "ui.sessionGraph.toolbar.filter.costly",
    ariaKey: "ui.sessionGraph.toolbar.filter.costlyAria",
    iconName: "outline-dollar-sign",
  },
]

export type GraphFilterChipsProps = {
  /** Current facets state */
  facets: GraphFacets
  /** Callback when facets change */
  onFacetsChange: (facets: GraphFacets) => void
  /** Facet counts for badges */
  counts?: FacetCounts
  /** Whether to show in compact mode */
  compact?: boolean
  /** Current composition mode: "or" | "and" */
  composeMode?: "or" | "and"
  /** Callback when composition mode changes */
  onComposeModeChange?: (mode: "or" | "and") => void
}

export const GraphFilterChips = (props: GraphFilterChipsProps) => {
  const i18n = useI18n()
  const [composeMode, setComposeMode] = createSignal(props.composeMode ?? "or")

  const activeFilters = createMemo(() => {
    const f = props.facets
    return SEMANTIC_FILTERS.filter((filter) => f[filter.key] === true)
  })

  const hasActiveFilters = createMemo(() => activeFilters().length > 0)

  const toggleFilter = (key: SemanticFilterKey) => {
    const current = props.facets
    const next = { ...current, [key]: !current[key] } as GraphFacets
    props.onFacetsChange(next)
  }

  const clearFilters = () => {
    const current = props.facets
    const next = {
      ...current,
      failedTools: false,
      fileWrites: false,
      subagentCalls: false,
      errors: false,
      retries: false,
      costlyNodes: false,
    } as GraphFacets
    props.onFacetsChange(next)
  }

  const handleComposeModeChange = (mode: "or" | "and") => {
    setComposeMode(mode)
    props.onComposeModeChange?.(mode)
  }

  const getCount = (key: SemanticFilterKey): { total: number; kept: number } | undefined => {
    switch (key) {
      case "failedTools": return props.counts?.failedTools
      case "fileWrites": return props.counts?.fileWrites
      case "subagentCalls": return props.counts?.subagentCalls
      case "errors": return props.counts?.errors
      case "retries": return props.counts?.retries
      case "costlyNodes": return props.counts?.costlyNodes
    }
  }

  if (props.compact) {
    return (
      <div data-slot="graph-toolbar-filter-chips-compact" class="flex items-center gap-1">
        {hasActiveFilters() && (
          <button
            type="button"
            class="flex items-center gap-1 rounded-lg px-2 py-1 text-11-regular text-primary-base bg-primary-weaker hover:bg-primary-base hover:text-primary-contrast transition-colors"
            onClick={clearFilters}
            aria-label={i18n.t("ui.sessionGraph.toolbar.filter.clear")}
          >
            <span class="flex items-center gap-0.5">
              <For each={activeFilters()}>
                {(filter, index) => (
                  <span class="flex items-center gap-0.5">
                    <Icon name={filter.iconName} size="small" />
                    {index() < activeFilters().length - 1 && <span class="text-text-weak">|</span>}
                  </span>
                )}
              </For>
            </span>
            <span class="ml-1">
              <GraphIconButton
                label={i18n.t("ui.sessionGraph.toolbar.filter.clear")}
                icon="close-small"
                onClick={() => clearFilters()}
              />
            </span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div data-slot="graph-toolbar-filter-chips" class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <span class="px-2 py-1 text-11-medium uppercase tracking-wide text-text-weak">
          {i18n.t("ui.sessionGraph.toolbar.filter")}
        </span>
        {hasActiveFilters() && (
          <span class="ms-auto">
            <GraphIconButton
              label={i18n.t("ui.sessionGraph.toolbar.filter.clear")}
              icon="close-small"
              onClick={clearFilters}
            />
          </span>
        )}
      </div>

      <div class="flex flex-wrap gap-1.5" role="group" aria-label={i18n.t("ui.sessionGraph.toolbar.filterAria")}>
        <For each={SEMANTIC_FILTERS}>
          {(filter) => {
            // Read through the props proxy in JSX: a captured boolean freezes the pressed state.
            const isActive = () => props.facets[filter.key] === true
            const count = getCount(filter.key)
            return (
              <button
                type="button"
                data-slot="graph-facet-semantic"
                data-value={filter.key}
                class={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-12-regular transition-colors whitespace-nowrap ${
                  isActive()
                    ? "bg-primary-base text-primary-contrast font-medium"
                    : "text-text-base hover:bg-surface-base-hover"
                }`}
                onClick={() => toggleFilter(filter.key)}
                onMouseDown={(e: MouseEvent) => {
                  if (e.shiftKey) {
                    e.preventDefault()
                    handleComposeModeChange(composeMode() === "or" ? "and" : "or")
                  }
                }}
                aria-pressed={isActive()}
                aria-label={i18n.t(filter.ariaKey)}
                title={i18n.t(filter.ariaKey)}
              >
                <span class="flex items-center">
                  <Icon name={filter.iconName} size="small" />
                </span>
                <span>{i18n.t(filter.labelKey)}</span>
                {count && count.total > 0 && (
                  <span class={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-10-medium ${
                    isActive() ? "bg-primary-contrast/20 text-primary-contrast" : "bg-surface-base-hover text-text-weak"
                  }`}>
                    {count.kept}/{count.total}
                  </span>
                )}
              </button>
            )
          }}
        </For>

        {/* Composition mode toggle */}
        <div class="flex items-center gap-1 ms-auto">
          <button
            type="button"
            class={`flex items-center gap-1 rounded-sm px-2 py-1 text-10-medium uppercase transition-colors ${
              composeMode() === "or" ? "bg-primary-weaker text-primary-base" : "text-text-weak hover:bg-surface-base-hover"
            }`}
            onClick={() => handleComposeModeChange("or")}
            aria-pressed={composeMode() === "or"}
            aria-label={i18n.t("ui.sessionGraph.toolbar.filter.or")}
            title={i18n.t("ui.sessionGraph.toolbar.filter.or")}
          >
            {i18n.t("ui.sessionGraph.toolbar.filter.or")}
          </button>
          <button
            type="button"
            class={`flex items-center gap-1 rounded-sm px-2 py-1 text-10-medium uppercase transition-colors ${
              composeMode() === "and" ? "bg-primary-weaker text-primary-base" : "text-text-weak hover:bg-surface-base-hover"
            }`}
            onClick={() => handleComposeModeChange("and")}
            aria-pressed={composeMode() === "and"}
            aria-label={i18n.t("ui.sessionGraph.toolbar.filter.and")}
            title={i18n.t("ui.sessionGraph.toolbar.filter.and")}
          >
            {i18n.t("ui.sessionGraph.toolbar.filter.and")}
          </button>
        </div>
      </div>
    </div>
  )
}