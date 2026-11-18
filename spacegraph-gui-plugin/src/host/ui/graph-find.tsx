import type { MountedSession } from "@opencode/plugin/gui"
import {
  DOMAINS,
  NODE_KINDS,
  NODE_STATUSES,
  sessionOutline,
  type Domain,
  type GraphFacets,
  type GraphNode,
  type GraphViewData,
  type NodeKind,
  type NodeStatus,
  type ZoomLevel,
} from "../../model"
import type { SpacegraphModel } from "../../plugin/model"
import { For, Show, createMemo, createSignal, type Accessor } from "solid-js"
import {
  clampActive,
  emptyFacets,
  facetCountLabel,
  findResults,
  toggleFacet,
  withFacets,
} from "./find-helpers"
import { createGraphViewModel } from "./useGraphViewModel"

export type GraphFindProps = {
  model: SpacegraphModel
  session: MountedSession
  graph: Accessor<GraphViewData>
  onClose?: () => void
}

type Tab = "search" | "filters" | "outline"
type QuickFacet = "failedTools" | "fileWrites" | "subagentCalls" | "errors" | "retries" | "costlyNodes"

const QUICK_FACETS: readonly QuickFacet[] = ["failedTools", "fileWrites", "subagentCalls", "errors", "retries", "costlyNodes"]
const LEVELS: readonly ZoomLevel[] = ["overview", "execution", "detail"]

/** The unified find panel: ranked search, composable facets, and the session outline in one place. */
export function GraphFind(props: GraphFindProps) {
  const ctx = props.model.ctx
  const [tab, setTab] = createSignal<Tab>("search")
  const [facets, setFacets] = createSignal<GraphFacets>(emptyFacets())
  const [level, setLevel] = createSignal<ZoomLevel | "">("")
  const [turnID, setTurnID] = createSignal("")
  const [active, setActive] = createSignal(0)

  const viewModel = createGraphViewModel({
    model: props.graph,
    facets,
    selection: () => {
      const id = props.model.focused(props.session)
      return id ? [id] : []
    },
    collapsedGroups: () => props.model.explicitlyCollapsedGroups(props.session),
    comparedTurns: () => null,
  })

  const results = createMemo(() =>
    findResults(viewModel.scoped(), facets(), { level: level() || undefined, turnID: turnID() || undefined }),
  )
  const counts = viewModel.counts
  const outline = createMemo(() => sessionOutline(props.graph()))
  const saved = createMemo(() => props.model.savedQueries(props.session))

  const patch = (next: Partial<GraphFacets>) => setFacets((current) => withFacets(current, next))

  const select = (node: GraphNode) => {
    props.model.focus(props.session, node.id)
    props.onClose?.()
  }

  const move = (delta: number) => setActive((index) => clampActive(index + delta, results().length))

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation()
      props.onClose?.()
    } else if (event.key === "ArrowDown") {
      event.preventDefault()
      move(1)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      move(-1)
    } else if (event.key === "Home") {
      event.preventDefault()
      setActive(0)
    } else if (event.key === "End") {
      event.preventDefault()
      setActive(results().length - 1)
    } else if (event.key === "Enter" && results()[active()]) {
      select(results()[active()])
    }
  }

  const chip = (value: string, selected: boolean, label: string, count: string, onClick: () => void) => (
    <button type="button" class="sg-find__chip" classList={{ "sg-find__chip--on": selected }} aria-pressed={selected} onClick={onClick}>
      <span>{label}</span>
      <small>{count}</small>
    </button>
  )

  return (
    <div class="sg-find-panel" role="dialog" aria-label={ctx.t("find.title")}>
      <div class="sg-find-panel__tabs" role="tablist">
        <For each={["search", "filters", "outline"] as const}>
          {(name) => (
            <button type="button" role="tab" aria-selected={tab() === name} classList={{ "sg-find-panel__tab--on": tab() === name }} onClick={() => setTab(name)}>
              {ctx.t(`find.${name}`)}
            </button>
          )}
        </For>
        <button type="button" class="sg-find-panel__close" aria-label={ctx.t("find.close")} onClick={() => props.onClose?.()}>
          ×
        </button>
      </div>

      <Show when={tab() === "search"}>
        <div class="sg-find-panel__search">
          <input
            type="search"
            placeholder={ctx.t("command.search")}
            value={facets().query}
            onInput={(event) => {
              patch({ query: event.currentTarget.value })
              setActive(0)
            }}
            onKeyDown={onKeyDown}
          />
          <button type="button" onClick={() => props.model.saveFacets(props.session, facets())}>
            {ctx.t("find.save")}
          </button>
        </div>
        <Show when={saved().length > 0}>
          <div class="sg-find-panel__saved">
            <For each={saved()}>
              {(query) => (
                <span class="sg-find-panel__saved-item">
                  <button type="button" onClick={() => patch({ query: query.query })}>{query.label}</button>
                  <button type="button" aria-label={ctx.t("find.removeSaved")} onClick={() => props.model.removeSavedQuery(props.session, query.query)}>×</button>
                </span>
              )}
            </For>
          </div>
        </Show>
        <div class="sg-find-panel__results" role="listbox" aria-label={ctx.t("find.results")}>
          <For each={results().slice(0, 80)}>
            {(node, index) => (
              <button
                type="button"
                role="option"
                aria-selected={index() === active()}
                class="sg-find-panel__result"
                classList={{ "sg-find-panel__result--active": index() === active() }}
                onMouseEnter={() => setActive(index())}
                onClick={() => select(node)}
              >
                <span class="sg-find-panel__result-label">{node.label}</span>
                <Show when={node.summary}><small class="sg-find-panel__result-summary">{node.summary}</small></Show>
              </button>
            )}
          </For>
          <Show when={results().length === 0 && facets().query.trim().length > 0}>
            <p class="sg-find-panel__empty">{ctx.t("find.noResults")}</p>
          </Show>
        </div>
      </Show>

      <Show when={tab() === "filters"}>
        <div class="sg-find-panel__filters">
          <div class="sg-find-panel__filter-row">
            <span class="sg-find-panel__filter-label">{ctx.t("find.kind")}</span>
            <For each={NODE_KINDS}>
              {(kind: NodeKind) => chip(kind, facets().kinds.has(kind), kind, facetCountLabel(counts(), "kinds", kind), () =>
                patch({ kinds: toggleFacet(facets().kinds, kind) }))}
            </For>
          </div>
          <div class="sg-find-panel__filter-row">
            <span class="sg-find-panel__filter-label">{ctx.t("find.status")}</span>
            <For each={NODE_STATUSES}>
              {(status: NodeStatus) => chip(status, facets().statuses.has(status), status, facetCountLabel(counts(), "statuses", status), () =>
                patch({ statuses: toggleFacet(facets().statuses, status) }))}
            </For>
          </div>
          <div class="sg-find-panel__filter-row">
            <span class="sg-find-panel__filter-label">{ctx.t("find.domain")}</span>
            <For each={DOMAINS}>
              {(domain: Domain) => chip(domain, facets().domains.has(domain), domain, facetCountLabel(counts(), "domains", domain), () =>
                patch({ domains: toggleFacet(facets().domains, domain, "session") }))}
            </For>
          </div>
          <div class="sg-find-panel__filter-row">
            <span class="sg-find-panel__filter-label">{ctx.t("find.quick")}</span>
            <For each={QUICK_FACETS}>
              {(key) => chip(key, facets()[key] === true, ctx.t(`find.${key}`), "", () => patch({ [key]: !facets()[key] }))}
            </For>
          </div>
          <div class="sg-find-panel__filter-row">
            <label class="sg-find-panel__filter-label">
              {ctx.t("find.level")}
              <select value={level()} onChange={(event) => setLevel(event.currentTarget.value as ZoomLevel | "")}>
                <option value="">{ctx.t("find.allLevels")}</option>
                <For each={LEVELS}>{(item) => <option value={item}>{ctx.t(`level.${item}`)}</option>}</For>
              </select>
            </label>
            <label class="sg-find-panel__filter-label">
              {ctx.t("find.turn")}
              <select value={turnID()} onChange={(event) => setTurnID(event.currentTarget.value)}>
                <option value="">{ctx.t("find.allTurns")}</option>
                <For each={props.graph().turns}>
                  {(id, index) => <option value={id}>{ctx.t("find.turnNumber", { index: index() + 1 })}</option>}
                </For>
              </select>
            </label>
            <button type="button" onClick={() => { setFacets(emptyFacets()); setLevel(""); setTurnID("") }}>
              {ctx.t("find.clear")}
            </button>
          </div>
        </div>
      </Show>

      <Show when={tab() === "outline"}>
        <div class="sg-find-panel__outline">
          <For each={outline()}>
            {(item) => (
              <div class="sg-find-panel__outline-turn">
                <button type="button" onClick={() => select(props.graph().nodes.find((node) => node.id === item.turnID)!)}>
                  {item.turnLabel}
                </button>
                <For each={item.phases}>
                  {(phase) => (
                    <button type="button" class="sg-find-panel__outline-phase" onClick={() => select(props.graph().nodes.find((node) => node.id === phase.id)!)}>
                      {phase.label}
                    </button>
                  )}
                </For>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
