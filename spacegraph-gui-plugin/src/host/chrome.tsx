import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import { createMemo, createSignal, For, Show, type Accessor } from "solid-js"
import {
  GRAPH_ARRANGEMENTS,
  LAYOUTS,
  NODE_KINDS,
  NODE_STATUSES,
  paletteEntries,
  savedQueryFacets,
  type GraphViewData,
} from "../model"
import type { SpacegraphModel } from "../plugin/model"
import { nextValue } from "./chrome-helpers"
import { kindAccent, statusAccent } from "./ui/cardTemplate"
import { createGraphDetailMode } from "./ui/useGraphDetailMode"
import { DARK_THEME } from "./canvas/fixtures"

export type ChromeInput = {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  graph: Accessor<GraphViewData>
  onOpenWindow: (nodeID: string) => void
}

/** The interactive graph toolbar: view presets, palette, time travel and export. */
export function GraphToolbar(input: ChromeInput) {
  const ctx = input.model.ctx
  const [paletteQuery, setPaletteQuery] = createSignal("")
  const [paletteOpen, setPaletteOpen] = createSignal(false)
  const model = input.model
  const session = input.session
  const detailChanges = createGraphDetailMode({
    setDetailMode: (value) => model.setDetailMode(session, value),
    setDepth: (value) => model.setDepth(session, value),
    setLayout: (value) => model.setLayout(session, value),
  })
  const turnCount = () => input.graph().turns.length
  const parked = () => model.parked(session)
  const checkpoint = () => model.checkpointIndex(session, input.graph()) ?? 0
  const palette = createMemo(() => {
    const query = paletteQuery().trim()
    if (!query) return []
    return paletteEntries(input.graph(), query, model.paletteSources(session))
  })

  const runEntry = (entry: ReturnType<typeof paletteEntries>[number]) => {
    if (entry.node) model.focus(session, entry.node.id)
    if (entry.action) model.runPaletteAction(session, entry.action.id)
    if (entry.lens) model.applyLensById(session, entry.lens.id)
    if (entry.surface) model.select(session, entry.surface.id)
    if (entry.savedQuery) model.saveFacets(session, savedQueryFacets(entry.savedQuery))
    setPaletteQuery("")
    setPaletteOpen(false)
  }

  const toggleTimeTravel = () => {
    if (parked()) model.setCheckpoint(session, turnCount(), turnCount())
    else model.setCheckpoint(session, Math.max(0, turnCount() - 2), turnCount())
  }

  return (
    <div class="sg-toolbar" role="toolbar" aria-label={ctx.t("chrome.toolbar")}>
      <div class="sg-toolbar__group">
        <select
          aria-label={ctx.t("chrome.lens")}
          value={model.lens(session)}
          onChange={(event) => model.applyLensById(session, event.currentTarget.value)}
        >
          <For each={["reader", "navigator", "cartographer", "investigator", "orchestrator", "reviewer", "archivist", "composer", "auditor"]}>
            {(id) => <option value={id}>{ctx.t(`lens.${id}`)}</option>}
          </For>
        </select>
        <button type="button" onClick={() => model.cycleLevel(session)} title={ctx.t("chrome.level")}>
          {ctx.t(`level.${model.level(session)}`)}
        </button>
        <button type="button" onClick={() => detailChanges.changeLayout(nextValue(LAYOUTS, model.layout(session)))} title={ctx.t("chrome.layout")}>
          {ctx.t(`layout.${model.layout(session)}`)}
        </button>
        <button
          type="button"
          title={ctx.t("chrome.depth")}
          onClick={() => detailChanges.changeDepth(DEPTH_ORDER[(DEPTH_ORDER.indexOf(model.depth(session)) + 1) % DEPTH_ORDER.length])}
        >
          {ctx.t(`depth.${model.depth(session)}`)}
        </button>
        <button
          type="button"
          title={ctx.t("chrome.arrangement")}
          onClick={() => model.setArrangement(session, nextValue(GRAPH_ARRANGEMENTS, model.arrangement(session)))}
        >
          {ctx.t(`arrangement.${model.arrangement(session)}`)}
        </button>
        <button type="button" title={ctx.t("chrome.side")} onClick={() => model.toggleSide(session)}>
          {ctx.t(`side.${model.side(session)}`)}
        </button>
      </div>

      <div class="sg-toolbar__group sg-toolbar__group--palette">
        <input
          type="search"
          placeholder={ctx.t("chrome.palette")}
          value={paletteQuery()}
          onInput={(event) => {
            setPaletteQuery(event.currentTarget.value)
            setPaletteOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setPaletteOpen(false)
              setPaletteQuery("")
            }
            if (event.key === "Enter" && palette()[0]) runEntry(palette()[0])
          }}
        />
        <Show when={paletteOpen() && paletteQuery().length > 0}>
          <ul class="sg-toolbar__palette" role="listbox">
            <For each={palette()}>
              {(entry) => (
                <li>
                  <button type="button" role="option" onClick={() => runEntry(entry)}>
                    <span>{entry.label}</span>
                    <Show when={entry.detail}>
                      <small>{entry.detail}</small>
                    </Show>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>

      <div class="sg-toolbar__group">
        <button
          type="button"
          title={ctx.t("chrome.focus")}
          aria-pressed={model.neighborhoodMode(session)}
          onClick={() => model.toggleNeighborhoodMode(session)}
        >
          {ctx.t("chrome.focus")}
        </button>
        <button type="button" title={ctx.t("chrome.turnMap")} onClick={() => model.toggleTurnMap(session)}>
          {ctx.t("chrome.turnMap")}
        </button>
        <button
          type="button"
          title={ctx.t("chrome.inspector")}
          onClick={() => {
            const focused = model.focused(session) ?? input.graph().nodes[0]?.id
            if (focused) input.onOpenWindow(focused)
          }}
        >
          {ctx.t("chrome.inspector")}
        </button>
        <select
          aria-label={ctx.t("chrome.follow")}
          value={model.followMode(session)}
          onChange={(event) => model.setFollowMode(session, event.currentTarget.value as "off" | "turn" | "node" | "node+focus")}
        >
          <For each={["off", "turn", "node", "node+focus"]}>
            {(mode) => <option value={mode}>{ctx.t(`chrome.follow.${mode}`)}</option>}
          </For>
        </select>
      </div>

      <div class="sg-toolbar__group">
        <button type="button" title={ctx.t("chrome.timeTravel")} aria-pressed={parked()} onClick={toggleTimeTravel}>
          {ctx.t("chrome.timeTravel")}
        </button>
        <Show when={parked()}>
          <input
            type="range"
            min={0}
            max={Math.max(0, turnCount() - 1)}
            value={checkpoint()}
            aria-label={ctx.t("chrome.timeTravel")}
            onInput={(event) => model.setCheckpoint(session, Number(event.currentTarget.value), turnCount())}
          />
          <span class="sg-toolbar__checkpoint">
            {checkpoint() + 1}/{turnCount()}
          </span>
        </Show>
        <button type="button" title={ctx.t("chrome.permalink")} onClick={() => model.copyPermalink(session)}>
          {ctx.t("chrome.permalink")}
        </button>
        <select
          aria-label={ctx.t("chrome.export")}
          value=""
          onChange={(event) => {
            if (event.currentTarget.value) void model.export(session, event.currentTarget.value as "svg" | "json" | "html")
            event.currentTarget.value = ""
          }}
        >
          <option value="">{ctx.t("chrome.export")}</option>
          <option value="svg">{ctx.t("command.exportSvg")}</option>
          <option value="json">{ctx.t("command.exportJson")}</option>
          <option value="html">{ctx.t("command.exportHtml")}</option>
        </select>
      </div>
    </div>
  )
}

const DEPTH_ORDER = ["flat", "layered", "depth-stack", "orbit"] as const

/** A compact key for node kinds and statuses shown on the canvas. */
export function GraphLegend() {
  return (
    <div class="sg-legend" aria-hidden="true">
      <div class="sg-legend__group">
        <For each={NODE_KINDS.slice(0, 8)}>
          {(nodeKind) => (
            <span class="sg-legend__item">
              <i style={{ background: kindAccent(nodeKind).solid }} />
              {nodeKind}
            </span>
          )}
        </For>
      </div>
      <div class="sg-legend__group">
        <For each={NODE_STATUSES}>
          {(nodeStatus) => (
            <span class="sg-legend__item">
              <i style={{ background: statusAccent(DARK_THEME, nodeStatus) }} />
              {nodeStatus}
            </span>
          )}
        </For>
      </div>
    </div>
  )
}
