import type { DepthMode, RendererCapabilities, RenderModel } from "@spacegraphjs/renderer"
import { DEPTH_MODES, supportsDepth } from "@spacegraphjs/renderer"
import { SegmentedControl, SegmentedControlItem } from "@opencode/ui/segmented-control"
import { Icon } from "@opencode/ui/icon"
import { useI18n } from "@opencode/ui/context/i18n"
import { createSignal, onCleanup, onMount, Show, type JSX } from "solid-js"
import "./graph-toolbar.css"
import {
  DETAIL_MODES,
  DOMAINS,
  GRAPH_ARRANGEMENTS,
  LAYOUTS,
  NODE_KINDS,
  NODE_STATUSES,
  PROFILE_PRESETS,
  ZOOM_LEVELS,
  type DetailFraming,
  type DetailMode,
  type Domain,
  type FacetCounts,
  type GraphArrangement,
  type GraphFacets,
  type GraphViewData,
  type GraphSide,
  type Layout,
  type NodeKind,
  type NodeStatus,
  type ZoomLevel,
} from "@opencode/session-ui/graph"
import { GraphIconButton } from "./GraphIconButton"
import { ARRANGEMENT_KEY, DEPTH_KEY, DETAIL_MODE_KEY, DOMAIN_KEY, KIND_KEY, LAYOUT_KEY, LEVEL_KEY, SIDE_KEY, STATUS_KEY } from "./vocabulary"

export type GraphToolbarProps = {
  capabilities?: RendererCapabilities
  renderer?: string
  /** The semantic level: one axis of what the map shows. */
  level?: ZoomLevel
  onLevel?: (level: ZoomLevel) => void
  /** The question the map answers: text, kind/status chips, and the domain lens, in one state. */
  facets?: GraphFacets
  /** Live kept/total counts for the facet chips. */
  facetCounts?: FacetCounts
  onFacetsChange?: (facets: GraphFacets) => void
  /** The projection spectrum: flat through orbit. */
  depth?: DepthMode
  onDepth?: (depth: DepthMode) => void
  depthModes?: readonly DepthMode[]
  /** The turn the map is pinned to, and how many turns the session has. */
  checkpoint?: number
  turnCount?: number
  onCheckpoint?: (index: number) => void
  onFit: () => void
  /** T1.8: camera zoom, independent of the semantic level control. */
  zoomPercent?: number
  onZoomOut?: () => void
  onZoomIn?: () => void
  zoomOutDisabled?: boolean
  zoomInDisabled?: boolean
  onSearch: () => void
  /** A2: copy the current facet question as a permalink. */
  onCopyView?: () => void
  /** A1/B1/C1: route a named question to the host; falls back to the graph:command event. */
  dispatchCommand?: (command: string) => void
  /** T17.1: the layout on screen; the host persists the choice. */
  layout?: Layout
  onLayoutChange?: (layout: Layout) => void
  /** LE.12: the file-first lens toggle (changed-files rail + bundled provenance); default off. */
  files?: boolean
  onToggleFiles?: () => void
  /**
   * How the map and the log meet in the hybrid. The host owns the geometry; the toolbar only names
   * the choice, so the reader can move the map without leaving the map.
   */
  arrangement?: GraphArrangement
  onArrangementChange?: (arrangement: GraphArrangement) => void
  /** Which side of the split the map takes. The floating arrangement has no side. */
  arrangementSide?: GraphSide
  onArrangementSideChange?: (side: GraphSide) => void
  /** Opens the equalizer's panel; absent when the host does not keep the rules. */
  onOpenEqualizer?: () => void
  /** Where a selected node's detail is shown; absent when the host does not offer the choice. */
  detailMode?: DetailMode
  onDetailModeChange?: (mode: DetailMode) => void
  /** T17.4: the camera frames the selected node (the "card" framing behavior). */
  detailFraming?: DetailFraming
  /** T17.4: callback when the framing behavior changes. */
  onDetailFramingChange?: (framing: DetailFraming) => void
  /** The transient peek at the node under the pointer; absent when the host does not offer it. */
  peek?: boolean
  onTogglePeek?: () => void
  /** Opens the hybrid turn map for the currently selected turn; absent when no turn is selected. */
  onTurnMap?: () => void
  /** LE.8/LE.9: opens the selected ribbon/matrix segment in the node-link graph; absent outside graph mode. */
  onExpandGraph?: () => void
  /** T3.4: exports the current render model as SVG, JSON, or standalone HTML. */
  onExport?: (format: "svg" | "json" | "html", model: RenderModel) => void
  /** Current render model for export; required when onExport is provided. */
  renderModel?: RenderModel
  onBack?: () => void
  /**
   * Puts the log beside the map, so the reader can have both without leaving either. The host owns
   * the arrangement; the toolbar only offers the way into it.
   */
  onSplitView?: () => void
  searching?: boolean
  /** RF.7: narrow widths collapse the secondary controls into an overflow menu. */
  compact?: boolean
  /** T6.8: the legend toggle; absent when the host does not offer it. */
  legend?: boolean
  onToggleLegend?: () => void
  /** T7.5: the layout gallery toggle; absent when the host does not offer it. */
  gallery?: boolean
  onToggleGallery?: () => void
  /** T1.19: the billboard switch — the cards face the reader, or lie in the content plane. */
  billboard?: boolean
  onToggleBillboard?: () => void
  /** T12/T14.3: opens a window over the map. The view proposes the first placement. */
  onOpenWindow?: (kind: string, nodeID?: string) => void
  /** T18.1: the map follows the active turn in the log. */
  followLog?: boolean
  onFollowLogChange?: (follow: boolean) => void
  /**
   * CSS length reserved at the inline end of the row, so a host whose floating chrome overlaps
   * the graph panel's top-right keeps the renderer label and back control clickable.
   */
  endInset?: string
  /** T27.1: the model to derive domain presence from. */
  model?: GraphViewData
}

/**
 * T14.2 — a dropdown in the toolbar. The *icon* is the affordance and the label names the current
 * value, so a reader sees what the axis is set to without opening it. A menu with no value to name
 * is the icon alone, and opens without a chevron.
 */
const ToolbarMenu = (props: {
  slot: string
  label: string
  icon: string
  value?: string
  /** The slot the current value carries, so a test can read what the axis is set to. */
  valueSlot?: string
  /** A menu at the start of the row anchors its popover to its start so it stays on screen. */
  align?: "start" | "end"
  children: JSX.Element
}) => (
  <details class="relative" data-slot={props.slot}>
    <summary
      class="flex h-6 cursor-pointer list-none items-center gap-1 rounded-sm px-1 text-12-regular text-text-base hover:bg-surface-base-hover [&::-webkit-details-marker]:hidden"
      aria-label={props.label}
      title={props.label}
    >
      <Icon name={props.icon} size="small" />
      {props.value ? <span data-slot={props.valueSlot ?? `${props.slot}-value`}>{props.value}</span> : null}
      {props.value ? <Icon name="outline-chevron-down" size="small" /> : null}
    </summary>
    <div
      class="absolute z-30 mt-1 flex min-w-[180px] flex-col items-start gap-2 rounded-sm border border-border-weaker-base bg-surface-base p-2 shadow-md"
      classList={{ "start-0": props.align === "start", "end-0": props.align !== "start" }}
    >
      {props.children}
    </div>
  </details>
)

/**
 * Graph toolbar (U3.9). It owns no graph state; it renders the semantic level, projection, and the
 * commands the host supplies. Capability gaps are disabled with an explanation, never hidden.
 *
 * T14.2 — the row is organised by axis, not by kind. Four things are inline (what is shown, where
 * the camera is) and everything else is one click away: "Draw" holds how the map is drawn, "Show"
 * holds what it says, and the commands sit at the end.
 */
export const GraphToolbar = (props: GraphToolbarProps) => {
  const i18n = useI18n()
  // The scrubber is folded by default; it opens when the reader asks, or when the map is not at
  // the live turn so an old view cannot be mistaken for the newest one.
  const [timeOpen, setTimeOpen] = createSignal<boolean>()
  const offLive = () =>
    props.checkpoint !== undefined && props.turnCount !== undefined && props.checkpoint < props.turnCount - 1
  const timeShown = () => timeOpen() ?? offLive()

  let rootEl!: HTMLDivElement
  // A2 — the palette can open the facet question without hunting for the toolbar.
  onMount(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string }>).detail
      if (detail?.name !== "facets") return
      const menu = rootEl?.querySelector<HTMLDetailsElement>('[data-slot="graph-toolbar-facets"]')
      if (menu) menu.open = true
    }
    window.addEventListener("graph:command", handleCommand)
    onCleanup(() => window.removeEventListener("graph:command", handleCommand))
  })

  const facets = () => props.facets
  const presetStatuses = (preset: (typeof PROFILE_PRESETS)[number]) =>
    "statuses" in preset ? preset.statuses : undefined
  const activeProfile = () =>
    PROFILE_PRESETS.find(
      (preset) => {
        const statuses = presetStatuses(preset) ?? []
        return (
          preset.domains.length === (facets()?.domains.size ?? 0) &&
          preset.domains.every((domain) => facets()?.domains.has(domain)) &&
          statuses.length === (facets()?.statuses.size ?? 0) &&
          statuses.every((status) => facets()?.statuses.has(status))
        )
      },
    )?.id
  const changeFacets = (next: Partial<GraphFacets>) => {
    const current = facets()
    if (!current) return
    props.onFacetsChange?.({
      query: next.query ?? current.query,
      kinds: next.kinds ?? current.kinds,
      statuses: next.statuses ?? current.statuses,
      domains: next.domains ?? current.domains,
    })
  }
  const toggleDomain = (domain: Domain) => {
    const current = new Set(facets()?.domains ?? [])
    if (current.has(domain)) {
      if (domain === "session") return
      current.delete(domain)
    } else {
      current.add(domain)
    }
    changeFacets({ domains: current })
  }
  const toggleKind = (kind: NodeKind) => {
    const current = new Set(facets()?.kinds ?? [])
    if (current.has(kind)) current.delete(kind)
    else current.add(kind)
    changeFacets({ kinds: current })
  }
  const toggleStatus = (status: NodeStatus) => {
    const current = new Set(facets()?.statuses ?? [])
    if (current.has(status)) current.delete(status)
    else current.add(status)
    changeFacets({ statuses: current })
  }
  const countOf = (value: string, counts: readonly { value: string; kept: number; total: number }[]) =>
    counts.find((entry) => entry.value === value)
  const countLabel = (value: string, counts: readonly { value: string; kept: number; total: number }[]) => {
    const count = countOf(value, counts)
    return count ? i18n.t("ui.sessionGraph.facets.count", { kept: String(count.kept), total: String(count.total) }) : undefined
  }
  const applyPreset = (preset: (typeof PROFILE_PRESETS)[number]) =>
    changeFacets({
      domains: new Set(preset.domains),
      statuses: new Set(presetStatuses(preset) ?? []),
    })
  const depthAvailable = (depth: DepthMode) => !props.capabilities || supportsDepth(props.capabilities, depth)
  const depthReason = (depth: DepthMode) =>
    depthAvailable(depth)
      ? undefined
      : i18n.t("ui.sessionGraph.capability.depthUnavailable", {
          depth: i18n.t(DEPTH_KEY[depth]),
          renderer: props.renderer ?? "",
        })

  const option = (input: {
    label: string
    onClick: () => void
    pressed?: boolean
    disabled?: boolean
    title?: string
    slot?: string
    /** The value this option chooses, so a test can read what the axis is set to. */
    value?: string
    /** A stable accessible name, for a control whose visible label names the state it is in. */
    ariaLabel?: string
    /** A toggle leaves the menu open, so the reader can see the state they just changed. */
    keepOpen?: boolean
  }) => (
    <button
      type="button"
      data-slot={input.slot}
      data-value={input.value}
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover disabled:opacity-50"
      aria-pressed={input.pressed}
      aria-label={input.ariaLabel ?? input.label}
      disabled={input.disabled}
      title={input.title}
      onClick={(event) => {
        if (!input.keepOpen) {
          const menu = event.currentTarget.closest("details")
          if (menu) menu.open = false
        }
        input.onClick()
      }}
    >
      {input.label}
    </button>
  )

  const levelControl = () => (
    <Show when={props.onLevel}>
      <div data-slot="graph-layers-level">
        <SegmentedControl
          value={props.level ?? "execution"}
          aria-label={i18n.t("ui.sessionGraph.toolbar.level")}
          onChange={(value) => value && props.onLevel?.(value as ZoomLevel)}
        >
          {ZOOM_LEVELS.map((level) => (
            <SegmentedControlItem value={level}>{i18n.t(LEVEL_KEY[level])}</SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
    </Show>
  )

  const lensControl = () => (
    <Show when={props.onFacetsChange}>
      <div data-slot="graph-lens" class="flex w-full flex-col gap-1">
        <div class="px-2 py-1 text-11-medium uppercase tracking-wide text-text-weak">
          {i18n.t("ui.sessionGraph.layers.lens")}
        </div>
        <div class="flex flex-wrap gap-1 px-1">
          {PROFILE_PRESETS.map((preset) =>
            option({
              label: i18n.t(preset.labelKey),
              onClick: () => applyPreset(preset),
              pressed: activeProfile() === preset.id,
              slot: "graph-lens-preset",
              value: preset.id,
              keepOpen: true,
            }),
          )}
        </div>
        <div class="flex flex-col">
          {DOMAINS.map((domain) =>
            option({
              label: i18n.t(DOMAIN_KEY[domain]),
              onClick: () => toggleDomain(domain),
              pressed: facets()?.domains.has(domain),
              disabled: domain === "session",
              slot: "graph-domain-option",
              value: domain,
              keepOpen: true,
            }),
          )}
        </div>
        <Show when={props.facetCounts}>
          {(counts) => (
            <div data-slot="graph-facet-domain-counts" class="flex flex-col px-2 py-1 text-11-regular text-text-weaker">
              {DOMAINS.map((domain) => {
                const count = countOf(domain, counts().domains)
                return (
                  <span data-domain={domain}>
                    {i18n.t(DOMAIN_KEY[domain])} · {count ? `${count.kept}/${count.total}` : "0/0"}
                  </span>
                )
              })}
            </div>
          )}
        </Show>
      </div>
    </Show>
  )


  /**
   * A2 — the facet chips. Each chip says what it keeps against what the map has; the text is the
   * same question in words. Chips compose, and every change goes back through one scope pipeline.
   */
  const facetsControl = () => (
    <Show when={props.onFacetsChange}>
      <ToolbarMenu
        slot="graph-toolbar-facets"
        label={i18n.t("ui.sessionGraph.facets.title")}
        icon="outline-sliders"
        align="start"
        value={i18n.t("ui.sessionGraph.facets.title")}
        valueSlot="graph-facets-name"
      >
        <div class="flex w-72 flex-col gap-2">
          <input
            data-slot="graph-facet-query"
            value={facets()?.query ?? ""}
            class="h-6 w-full rounded-sm border border-border-weaker-base bg-surface-base px-2 text-12-regular text-text-base outline-none placeholder:text-text-weaker"
            placeholder={i18n.t("ui.sessionGraph.facets.placeholder")}
            aria-label={i18n.t("ui.sessionGraph.facets.placeholder")}
            onInput={(event) => changeFacets({ query: event.currentTarget.value })}
          />
          <div class="flex max-h-72 flex-col gap-2 overflow-y-auto">
            <div data-slot="graph-facet-kinds" class="flex flex-col">
              <div class="px-1 py-1 text-11-medium uppercase tracking-wide text-text-weak">
                {i18n.t("ui.sessionGraph.facets.kinds")}
              </div>
              {NODE_KINDS.map((kind) =>
                option({
                  label: `${i18n.t(KIND_KEY[kind])} · ${countLabel(kind, props.facetCounts?.kinds ?? []) ?? "0/0"}`,
                  onClick: () => toggleKind(kind),
                  pressed: facets()?.kinds.has(kind),
                  slot: "graph-facet-kind",
                  value: kind,
                  keepOpen: true,
                  ariaLabel: i18n.t(KIND_KEY[kind]),
                }),
              )}
            </div>
            <div data-slot="graph-facet-statuses" class="flex flex-col">
              <div class="px-1 py-1 text-11-medium uppercase tracking-wide text-text-weak">
                {i18n.t("ui.sessionGraph.facets.statuses")}
              </div>
              {NODE_STATUSES.map((status) =>
                option({
                  label: `${i18n.t(STATUS_KEY[status])} · ${countLabel(status, props.facetCounts?.statuses ?? []) ?? "0/0"}`,
                  onClick: () => toggleStatus(status),
                  pressed: facets()?.statuses.has(status),
                  slot: "graph-facet-status",
                  value: status,
                  keepOpen: true,
                  ariaLabel: i18n.t(STATUS_KEY[status]),
                }),
              )}
            </div>
          </div>
          <button
            type="button"
            data-slot="graph-facet-clear"
            class="rounded-sm px-2 py-1 text-start text-12-regular text-text-base hover:bg-surface-base-hover"
            onClick={() => changeFacets({ query: "", kinds: new Set(), statuses: new Set() })}
          >
            {i18n.t("ui.sessionGraph.facets.clear")}
          </button>
        </div>
      </ToolbarMenu>
    </Show>
  )

  const layoutControl = () => (
    <Show when={props.onLayoutChange}>
      <ToolbarMenu
        slot="graph-toolbar-layout"
        label={i18n.t("ui.sessionGraph.toolbar.layout")}
        icon="workspace-isolated"
        value={i18n.t(LAYOUT_KEY[props.layout ?? "lanes"])}
        valueSlot="graph-layout-name"
      >
        {LAYOUTS.map((layout) =>
          option({
            label: i18n.t(LAYOUT_KEY[layout]),
            onClick: () => props.onLayoutChange?.(layout),
            pressed: props.layout === layout,
            slot: "graph-layout-option",
            value: layout,
          }),
        )}
      </ToolbarMenu>
    </Show>
  )

  const depthControl = () => (
    <Show when={props.onDepth}>
      <label class="flex items-center gap-1 text-12-regular text-text-weak">
        <span>{i18n.t("ui.sessionGraph.toolbar.depth")}</span>
        <select
          data-slot="graph-layers-depth"
          class="h-6 rounded-sm border border-border-weaker-base bg-surface-base px-1 text-12-regular text-text-base"
          aria-label={i18n.t("ui.sessionGraph.toolbar.depth")}
          value={props.depth}
          onChange={(event) => props.onDepth?.(event.currentTarget.value as DepthMode)}
        >
          {(props.depthModes ?? DEPTH_MODES).map((depth) => (
            <option value={depth} disabled={!depthAvailable(depth)} title={depthReason(depth)}>
              {i18n.t(DEPTH_KEY[depth])}
            </option>
          ))}
        </select>
      </label>
    </Show>
  )

  /**
   * The axes that say what the map shows. The level, lens, and depth describe the same thing from
   * different distances, so they share one "Layers" menu whose value is the current level; the
   * layout sits beside it because it changes the arrangement rather than the content. One row, no
   * separate strip.
   */
  const layersControl = () => (
    <Show when={props.onLevel || props.onFacetsChange || props.onDepth}>
      <ToolbarMenu
        slot="graph-toolbar-layers"
        label={i18n.t("ui.sessionGraph.layers.title")}
        icon="outline-eye"
        align="start"
        value={props.onLevel ? i18n.t(LEVEL_KEY[props.level ?? "execution"]) : undefined}
        valueSlot="graph-layers-level-name"
      >
        {levelControl()}
        {lensControl()}
        {depthControl()}
      </ToolbarMenu>
    </Show>
  )

  const layerControls = () => (
    <>
      {layersControl()}
      {facetsControl()}
      {layoutControl()}
    </>
  )

  /** The session time axis, folded until the reader opens it or leaves the live turn. */
  const turnStatuses = () =>
    (props.model?.turns ?? []).map((id) => props.model?.nodes.find((node) => node.id === id))

  const timeControls = () => (
    <Show when={props.onCheckpoint && (props.turnCount ?? 0) > 1}>
      <GraphIconButton
        label={i18n.t("ui.sessionGraph.time.toggle")}
        icon="outline-rotate-clockwise"
        pressed={timeShown()}
        slot="graph-time-toggle"
        onClick={() => setTimeOpen(!timeShown())}
      />
      <Show when={timeShown()}>
        <label
          data-slot="session-graph-scrubber"
          class="flex min-w-40 items-center gap-2 text-12-regular text-text-weak"
        >
          <div class="relative flex min-w-24 flex-1 items-center">
            <input
              type="range"
              min="1"
              max={props.turnCount}
              step="1"
              value={(props.checkpoint ?? 0) + 1}
              aria-label={i18n.t("ui.sessionGraph.time.aria")}
              class="h-1 w-full"
              onInput={(event) => props.onCheckpoint?.(Number(event.currentTarget.value) - 1)}
            />
            <div data-slot="graph-time-ticks" class="pointer-events-none absolute inset-x-0 top-2 flex justify-between">
              {turnStatuses().map((node) => (
                <span
                  data-slot="graph-time-tick"
                  data-status={node?.status ?? "neutral"}
                  title={node?.label}
                  class="h-1 w-px bg-border-weaker-base"
                  classList={{ "bg-[var(--border-critical-selected)]": node?.status === "failed" }}
                />
              ))}
            </div>
          </div>
          <output class="shrink-0 tabular-nums">
            {i18n.t("ui.sessionGraph.time.value", {
              current: String((props.checkpoint ?? 0) + 1),
              total: String(props.turnCount),
            })}
          </output>
        </label>
      </Show>
    </Show>
  )

  /** How the map is drawn: the billboard and the file lens. */
  const drawControls = () => (
    <>
      <Show when={props.capabilities?.cardFacing && props.onToggleBillboard}>
        {option({
          label: i18n.t(
            props.billboard ? "ui.sessionGraph.toolbar.billboard" : "ui.sessionGraph.toolbar.billboardOff",
          ),
          onClick: () => props.onToggleBillboard?.(),
          pressed: props.billboard,
          slot: "graph-billboard-option",
          ariaLabel: i18n.t("ui.sessionGraph.toolbar.billboard"),
          keepOpen: true,
        })}
      </Show>
      <Show when={props.onDetailFramingChange}>
        {option({
          label: i18n.t(
            props.detailFraming === "card" ? "ui.sessionGraph.toolbar.frameNode" : "ui.sessionGraph.toolbar.frameNodeOff",
          ),
          onClick: () => props.onDetailFramingChange?.(props.detailFraming === "card" ? "off" : "card"),
          pressed: props.detailFraming === "card",
          slot: "graph-frame-node-option",
          ariaLabel: i18n.t("ui.sessionGraph.toolbar.frameNode"),
          keepOpen: true,
        })}
      </Show>
      <Show when={props.onToggleFiles}>
        {option({
          label: i18n.t("ui.sessionGraph.toolbar.files"),
          onClick: () => props.onToggleFiles?.(),
          pressed: props.files,
          slot: "graph-files-option",
          keepOpen: true,
        })}
      </Show>
      <Show when={props.onOpenEqualizer}>
        {option({
          label: i18n.t("ui.sessionGraph.toolbar.equalizer"),
          onClick: () => props.onOpenEqualizer?.(),
          slot: "graph-equalizer-option",
        })}
      </Show>
      <Show when={props.onArrangementChange}>
        <div data-slot="graph-toolbar-arrangement">
          <div class="px-2 py-1 text-12-regular text-text-weak">
            {i18n.t("ui.sessionGraph.toolbar.arrangement")}
          </div>
          {GRAPH_ARRANGEMENTS.map((arrangement) =>
            option({
              label: i18n.t(ARRANGEMENT_KEY[arrangement]),
              onClick: () => props.onArrangementChange?.(arrangement),
              pressed: props.arrangement === arrangement,
              slot: "graph-arrangement-option",
              value: arrangement,
            }),
          )}
          <Show when={props.onArrangementSideChange && props.arrangement !== "floating"}>
            {option({
              label: i18n.t(SIDE_KEY[props.arrangementSide ?? "start"]),
              onClick: () =>
                props.onArrangementSideChange?.(props.arrangementSide === "start" ? "end" : "start"),
              pressed: props.arrangementSide === "start",
              slot: "graph-arrangement-side-option",
              ariaLabel: i18n.t("ui.sessionGraph.toolbar.arrangementSide"),
              keepOpen: true,
            })}
          </Show>
        </div>
      </Show>
    </>
  )

  /** What the map says: where the detail goes, the peek, the minimap, and the reader's overlays. */
  const showControls = () => {
    return (
      <>
        <Show when={props.onDetailModeChange}>
          <div data-slot="graph-toolbar-detail">
            <div class="px-2 py-1 text-12-regular text-text-weak">
              {i18n.t("ui.sessionGraph.toolbar.detailMode")}
            </div>
            {DETAIL_MODES.map((mode) =>
              option({
                label: i18n.t(DETAIL_MODE_KEY[mode]),
                onClick: () => props.onDetailModeChange?.(mode),
                pressed: props.detailMode === mode,
                slot: "graph-detail-mode-option",
                value: mode,
              }),
            )}
          </div>
        </Show>
        <Show when={props.onTogglePeek}>
          {option({
            label: i18n.t("ui.sessionGraph.toolbar.peek"),
            onClick: () => props.onTogglePeek?.(),
            pressed: props.peek,
            slot: "graph-peek-option",
            keepOpen: true,
          })}
        </Show>
        <Show when={props.onFollowLogChange}>
          {option({
            label: props.followLog ? i18n.t("ui.sessionGraph.toolbar.followLog") : i18n.t("ui.sessionGraph.toolbar.followLogOff"),
            onClick: () => props.onFollowLogChange?.(!props.followLog),
            pressed: props.followLog,
            slot: "graph-follow-log-option",
            keepOpen: true,
            ariaLabel: i18n.t("ui.sessionGraph.toolbar.followLog"),
          })}
        </Show>
        <Show when={props.onOpenWindow}>
          <GraphIconButton
            label={i18n.t("ui.sessionGraph.toolbar.minimap")}
            icon="layout-bottom"
            onClick={() => props.onOpenWindow?.("minimap")}
          />
        </Show>
        <Show when={props.onOpenWindow && props.model?.workspaceRoot}>
          <GraphIconButton
            label={i18n.t("ui.sessionGraph.toolbar.filesystem")}
            icon="folder-tree"
            onClick={() => props.onOpenWindow?.("filesystem")}
          />
        </Show>
        <Show when={props.onToggleLegend}>
          <GraphIconButton
            label={i18n.t("ui.sessionGraph.toolbar.legend")}
            icon="outline-sliders"
            pressed={props.legend}
            onClick={() => props.onToggleLegend?.()}
          />
        </Show>
        <Show when={props.onToggleGallery}>
          <GraphIconButton
            label={i18n.t("ui.sessionGraph.toolbar.gallery")}
            icon="dot-grid"
            pressed={props.gallery}
            onClick={() => props.onToggleGallery?.()}
          />
        </Show>
        <Show when={props.onTurnMap}>
          <GraphIconButton
            label={i18n.t("ui.sessionGraph.toolbar.turnMap")}
            icon="outline-worktree"
            onClick={() => props.onTurnMap?.()}
          />
        </Show>
        <Show when={props.onExpandGraph}>
          <GraphIconButton
            label={i18n.t("ui.sessionGraph.toolbar.expandGraph")}
            icon="arrow-up-right"
            onClick={() => props.onExpandGraph?.()}
          />
        </Show>
      </>
    )
  }

  /** Everything the map draws or says, grouped in one menu instead of two. */
  const viewControls = () => (
    <>
      <div data-slot="graph-toolbar-draw-group">
        <div class="px-2 py-1 text-11-medium uppercase tracking-wide text-text-weak">
          {i18n.t("ui.sessionGraph.toolbar.draw")}
        </div>
        {drawControls()}
      </div>
      <div data-slot="graph-toolbar-show-group">
        <div class="px-2 py-1 text-11-medium uppercase tracking-wide text-text-weak">
          {i18n.t("ui.sessionGraph.toolbar.show")}
        </div>
        {showControls()}
      </div>
    </>
  )

  /** A1/B1/C1 — the reader's questions, beside the search. */
  const commandsControl = () => {
    const ask = (name: "why" | "led-here" | "related" | "compare" | "note" | "facets") => {
      if (props.dispatchCommand) {
        props.dispatchCommand(name)
        return
      }
      window.dispatchEvent(new CustomEvent("graph:command", { detail: { name } }))
    }
    const question = (
      name: "why" | "led-here" | "related" | "compare" | "note" | "facets",
      label: string,
    ) =>
      option({
        label,
        onClick: () => ask(name),
        slot: "graph-question-option",
        value: name,
      })
    return (
      <ToolbarMenu
        slot="graph-toolbar-questions"
        label={i18n.t("ui.sessionGraph.questions.title")}
        icon="magnifying-glass"
        align="end"
      >
        {question("why", i18n.t("ui.sessionGraph.questions.why"))}
        {question("led-here", i18n.t("ui.sessionGraph.questions.ledHere"))}
        {question("related", i18n.t("ui.sessionGraph.questions.related"))}
        {question("compare", i18n.t("ui.sessionGraph.questions.compare"))}
        {question("note", i18n.t("ui.sessionGraph.questions.note"))}
        {question("facets", i18n.t("ui.sessionGraph.questions.facets"))}
      </ToolbarMenu>
    )
  }

  /** The commands: the search, the questions, and the export. */
  const commandControls = () => (
    <>
      <GraphIconButton
        label={i18n.t("ui.sessionGraph.toolbar.search")}
        icon="magnifying-glass"
        pressed={props.searching}
        onClick={props.onSearch}
      />
      {commandsControl()}
      <Show when={props.onCopyView}>
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.toolbar.copyView")}
          icon="outline-copy"
          slot="graph-copy-view"
          onClick={() => props.onCopyView?.()}
        />
      </Show>
      <Show when={props.onExport && props.renderModel}>
        <ToolbarMenu slot="graph-toolbar-export" label={i18n.t("ui.sessionGraph.toolbar.export")} icon="outline-share">
          {option({
            label: i18n.t("ui.sessionGraph.toolbar.exportSvg"),
            onClick: () => props.onExport?.("svg", props.renderModel!),
            slot: "graph-export-option",
            value: "svg",
          })}
          {option({
            label: i18n.t("ui.sessionGraph.toolbar.exportJson"),
            onClick: () => props.onExport?.("json", props.renderModel!),
            slot: "graph-export-option",
            value: "json",
          })}
          {option({
            label: i18n.t("ui.sessionGraph.toolbar.exportHtml"),
            onClick: () => props.onExport?.("html", props.renderModel!),
            slot: "graph-export-option",
            value: "html",
          })}
        </ToolbarMenu>
      </Show>
    </>
  )

  return (
    <div
      ref={rootEl}
      data-component="session-graph-toolbar"
      data-slot="graph-toolbar"
      class="flex flex-wrap items-center gap-2 border-b border-border-weaker-base px-2 py-1.5"
      style={props.endInset ? { "padding-inline-end": props.endInset } : undefined}
    >
      {layerControls()}
      {timeControls()}

      <div class="flex items-center gap-1">
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.toolbar.zoomOut")}
          icon="expand"
          disabled={props.zoomOutDisabled}
          onClick={() => props.onZoomOut?.()}
        />
        <span
          data-slot="graph-zoom-level"
          class="min-w-9 text-center text-12-regular tabular-nums text-text-weak"
          aria-label={i18n.t("ui.sessionGraph.toolbar.zoomPercent", { percent: String(props.zoomPercent ?? 100) })}
        >
          {props.zoomPercent ?? 100}%
        </span>
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.toolbar.zoomIn")}
          icon="plus"
          disabled={props.zoomInDisabled}
          onClick={() => props.onZoomIn?.()}
        />
      </div>

      <GraphIconButton label={i18n.t("ui.sessionGraph.toolbar.fit")} icon="expand" onClick={props.onFit} />

      <Show
        when={!props.compact}
        fallback={
          <ToolbarMenu slot="graph-toolbar-overflow" label={i18n.t("ui.sessionGraph.toolbar.more")} icon="outline-dots">
            {viewControls()}
            {commandControls()}
          </ToolbarMenu>
        }
      >
        <ToolbarMenu
          slot="graph-toolbar-view"
          label={i18n.t("ui.sessionGraph.toolbar.view")}
          icon="outline-sliders"
          value={i18n.t(DETAIL_MODE_KEY[props.detailMode ?? "panel"])}
        >
          {viewControls()}
        </ToolbarMenu>
      </Show>

      {/* The renderer label and the back control sit at the end of the row: the host's own chrome
          floats over the panel's top-right, and the end inset keeps them clear of it. */}
      <div class="ml-auto flex items-center gap-2">
        <Show when={!props.compact}>{commandControls()}</Show>
        {props.renderer ? (
          <span
            class="text-12-regular text-text-weak"
            classList={{ hidden: props.compact }}
            title={i18n.t("ui.sessionGraph.toolbar.renderer", { renderer: props.renderer })}
          >
            {i18n.t("ui.sessionGraph.toolbar.renderer", { renderer: props.renderer })}
          </span>
        ) : null}
        {props.onSplitView ? (
          <GraphIconButton
            label={i18n.t("ui.sessionGraph.toolbar.split")}
            icon="split"
            slot="graph-toolbar-split"
            onClick={props.onSplitView}
          />
        ) : null}
        {props.onBack ? (
          <GraphIconButton
            label={i18n.t("ui.sessionGraph.toolbar.back")}
            icon="outline-arrow-left"
            onClick={props.onBack}
          />
        ) : null}
      </div>
    </div>
  )
}
