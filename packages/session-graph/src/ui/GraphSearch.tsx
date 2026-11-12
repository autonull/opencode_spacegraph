import type { GraphViewData, GraphNode, PaletteEntry, PaletteSources } from "@opencode/session-ui/graph"
import {
  applyFacets,
  navigationHelp,
  navigationResults,
  paletteEntries,
  PALETTE_GROUP_ORDER,
  parseNLQ,
  rankedSearch,
} from "@opencode/session-ui/graph"
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
  /** The commands, lenses, surfaces, and saved questions the palette adds to the node search. */
  palette?: PaletteSources
  onAction?: (entry: PaletteEntry) => void
  onLens?: (entry: PaletteEntry) => void
  onSurface?: (entry: PaletteEntry) => void
  onSavedQuery?: (entry: PaletteEntry) => void
}

const GROUP_KEY = {
  node: "ui.sessionGraph.search.nodes",
  action: "ui.sessionGraph.search.actions",
  lens: "ui.sessionGraph.search.lenses",
  surface: "ui.sessionGraph.search.surfaces",
  "saved-query": "ui.sessionGraph.search.saved",
} as const

type Row = { type: "header"; kind: PaletteEntry["kind"] } | { type: "item"; entry: PaletteEntry; index: number }

/**
 * Label/tool/path search (U3.12) and the graph palette. The host supplies the commands it can run,
 * so the palette lists nodes, actions, lenses, surfaces, and saved questions over the same ranked
 * search the `/` key opens. It never executes a graph action itself.
 */
export const GraphSearch = (props: GraphSearchProps) => {
  const i18n = useI18n()
  const [query, setQuery] = createSignal(props.initialQuery ?? "")
  const [active, setActive] = createSignal(0)
  // eslint-disable-next-line no-unassigned-vars -- assigned via ref in JSX
  let input!: HTMLInputElement
  // eslint-disable-next-line no-unassigned-vars -- assigned via ref in JSX
  let list!: HTMLDivElement

  const filteredNodes = (nodes: GraphNode[]) => {
    if (props.contentIDs.length === 0) return nodes
    const contentIDSet = new Set(props.contentIDs)
    return nodes.filter((node) => contentIDSet.has(node.id))
  }

  const nodeEntry = (node: GraphNode, score = 0): PaletteEntry => ({
    id: node.id,
    kind: "node",
    label: node.label,
    detail: node.summary,
    score,
    node,
  })

  const search = createMemo(() => {
    const q = query().trim()
    const { facets, queryString } = parseNLQ(q)
    const hasFacetFilters = facets.kinds.size > 0 || facets.statuses.size > 0 || facets.domains.size > 1

    if (hasFacetFilters) {
      const scoped = applyFacets(props.model, facets)
      const entries = filteredNodes(scoped.nodes.filter((node) => node.id !== scoped.root)).map((node) =>
        nodeEntry(node),
      )
      return { compiled: queryString, entries }
    }

    if (props.palette) {
      const entries = paletteEntries(props.model, q, props.palette).filter(
        (entry) => entry.kind !== "node" || filteredNodes([entry.node!]).length > 0,
      )
      return { compiled: "", entries }
    }

    if (!q) return { compiled: "", entries: [] }

    const entries = filteredNodes(navigationResults(props.model, q) ?? rankedSearch(props.model, q)).map((node) =>
      nodeEntry(node),
    )
    return { compiled: "", entries }
  })

  const entries = () => search().entries
  const compiledQuery = () => search().compiled

  const rows = createMemo<Row[]>(() => {
    const rows: Row[] = []
    let index = 0
    let last: PaletteEntry["kind"] | undefined
    const ordered = [...entries()].sort(
      (a, b) => PALETTE_GROUP_ORDER.indexOf(a.kind) - PALETTE_GROUP_ORDER.indexOf(b.kind) || b.score - a.score,
    )

    for (const entry of ordered) {
      if (entry.kind !== last) {
        rows.push({ type: "header", kind: entry.kind })
        last = entry.kind
      }
      rows.push({ type: "item", entry, index: index++ })
    }

    return rows
  })

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
    const max = entries().length - 1
    if (max < 0) return
    setActive((current) => Math.min(max, Math.max(0, current + delta)))
  }

  const choose = (entry: PaletteEntry | undefined) => {
    if (!entry) return
    if (entry.kind === "node" && entry.node) {
      // Add search hit ring animation to the selected node
      if ((entry.node as GraphNode & { className?: string }).className === undefined) {
        const nodeWithClass = entry.node as GraphNode & { className?: string }
        nodeWithClass.className = "graph-search-hit"
        setTimeout(() => {
          delete nodeWithClass.className
        }, 200)
      }
      props.onSelect(entry.node)
      return
    }
    if (entry.kind === "action") props.onAction?.(entry)
    if (entry.kind === "lens") props.onLens?.(entry)
    if (entry.kind === "surface") props.onSurface?.(entry)
    if (entry.kind === "saved-query") props.onSavedQuery?.(entry)
    props.onClose()
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
      setActive(event.key === "Home" ? 0 : entries().length - 1)
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      choose(entries()[active()])
    }
  }

  const navigationHint = createMemo(() => (query().trim().toLowerCase() === "g" ? navigationHelp() : []))

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
          aria-expanded={entries().length > 0}
          aria-controls="graph-search-results"
          aria-activedescendant={entries().length > 0 ? `graph-search-option-${active()}` : undefined}
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

      <Show when={entries().length > 0 || query().trim().length > 0}>
        <div ref={list} class="max-h-72 overflow-y-auto border-t border-border-weaker-base">
          <Show
            when={entries().length > 0}
            fallback={
              <div class="px-3 py-2 text-12-regular text-text-weaker">{i18n.t("ui.sessionGraph.search.noResults")}</div>
            }
          >
            <div class="px-3 py-1 text-12-regular text-text-weaker">
              {i18n.plural("ui.sessionGraph.search.results", entries().length)}
            </div>
            <ul id="graph-search-results" role="listbox" aria-label={i18n.t("ui.sessionGraph.toolbar.search")}>
              <For each={rows()}>
                {(row) =>
                  row.type === "header" ? (
                    <li role="presentation" class="px-3 py-1 text-11-medium uppercase tracking-wide text-text-weak">
                      {i18n.t(GROUP_KEY[row.kind])}
                    </li>
                  ) : (
                    <li>
                      <button
                        type="button"
                        id={`graph-search-option-${row.index}`}
                        data-index={row.index}
                        data-kind={row.entry.kind}
                        data-node-id={row.entry.node?.id}
                        data-active={row.index === active()}
                        role="option"
                        aria-selected={row.index === active()}
                        class="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left hover:bg-surface-base-hover"
                        classList={{ "bg-surface-base-hover": row.index === active() }}
                        onMouseEnter={() => setActive(row.index)}
                        onClick={() => choose(row.entry)}
                      >
                        <span class="truncate text-12-regular text-text-strong">{row.entry.label}</span>
                        <Show when={row.entry.detail}>
                          <span class="truncate text-12-regular text-text-weak">{row.entry.detail}</span>
                        </Show>
                      </button>
                    </li>
                  )
                }
              </For>
            </ul>
          </Show>
        </div>
      </Show>
    </div>
  )
}
