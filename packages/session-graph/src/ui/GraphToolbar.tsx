import type { DepthMode, RendererCapabilities, RenderModel } from "@spacegraphjs/renderer"
import { DEPTH_MODES, supportsDepth } from "@spacegraphjs/renderer"
import { Icon } from "@opencode/ui/icon"
import { SegmentedControl, SegmentedControlItem } from "@opencode/ui/segmented-control"
import { useI18n } from "@opencode/ui/context/i18n"
import { For, Show, type JSX } from "solid-js"
import "./graph-toolbar.css"
import {
  DETAIL_MODES,
  GRAPH_ARRANGEMENTS,
  LAYOUTS,
  ZOOM_LEVELS,
  type DetailFraming,
  type DetailMode,
  type Domain,
  type GraphArrangement,
  type GraphModel,
  type GraphSide,
  type Layout,
  type ZoomLevel,
  PROFILE_PRESETS,
} from "@opencode/session-ui/graph"
import { GraphIconButton } from "./GraphIconButton"
import {
  ARRANGEMENT_KEY,
  DEPTH_KEY,
  DETAIL_MODE_KEY,
  DOMAIN_GROUPS,
  DOMAIN_KEY,
  DOMAIN_OF_KIND,
  LAYOUT_KEY,
  LEVEL_KEY,
  SIDE_KEY,
} from "./vocabulary"

export type GraphToolbarProps = {
  level: ZoomLevel
  onLevel: (level: ZoomLevel) => void
  /** LE.14: the depth spectrum chooser (flat 2D | layered | depth-stack | orbit 3D). */
  depth?: DepthMode
  onDepth?: (depth: DepthMode) => void
  depthModes?: readonly DepthMode[]
  capabilities?: RendererCapabilities
  renderer?: string
  onFit: () => void
  /** T1.8: camera zoom, independent of the semantic level control. */
  zoomPercent?: number
  onZoomOut?: () => void
  onZoomIn?: () => void
  zoomOutDisabled?: boolean
  zoomInDisabled?: boolean
  onSearch: () => void
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
  model?: GraphModel
  /** T27.1: the currently selected domains (lens). */
  domains?: ReadonlySet<Domain>
  /** T27.1: callback when the domain lens changes. */
  onDomainsChange?: (domains: ReadonlySet<Domain>) => void
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
    <div class="absolute end-0 z-30 mt-1 flex min-w-[180px] flex-col items-start gap-2 rounded-sm border border-border-weaker-base bg-surface-base p-2 shadow-md">
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
  const depthAvailable = (depth: DepthMode) => !props.capabilities || supportsDepth(props.capabilities, depth)
  const depthReason = (depth: DepthMode) =>
    depthAvailable(depth)
      ? undefined
      : i18n.t("ui.sessionGraph.capability.depthUnavailable", { depth: i18n.t(DEPTH_KEY[depth]), renderer: props.renderer ?? "" })

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

  /** How the map is drawn: the depth, the billboard, and the file lens. */
  const drawControls = () => (
    <>
      <Show when={props.onDepth}>
        <div data-slot="graph-toolbar-depth">
          <div class="px-2 py-1 text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.toolbar.depth")}</div>
          {(props.depthModes ?? DEPTH_MODES).map((mode) =>
            option({
              label: i18n.t(DEPTH_KEY[mode]),
              onClick: () => props.onDepth?.(mode),
              pressed: props.depth === mode,
              disabled: !depthAvailable(mode),
              title: depthReason(mode),
              slot: "graph-depth-option",
            }),
          )}
        </div>
      </Show>
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
    // T27.1 — compute which domains have data in the model
    const domainsWithData = new Set<Domain>()
    if (props.model) {
      for (const node of props.model.nodes) {
        const domain = node.domain ?? (DOMAIN_OF_KIND[node.kind] as Domain | undefined)
        if (domain) domainsWithData.add(domain)
      }
    }

    const currentDomains = props.domains ?? new Set<Domain>(["session"])
    const toggleDomain = (domain: Domain) => {
      if (domain === "session") return // session is pinned
      const next = new Set(currentDomains)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      props.onDomainsChange?.(next)
    }

    return (
      <>
        <Show when={props.model && props.onDomainsChange}>
          <ToolbarMenu
            slot="graph-toolbar-domains"
            label={i18n.t("ui.sessionGraph.toolbar.domains")}
            icon="eye"
            value={i18n.t("ui.sessionGraph.toolbar.domains")}
          >
            <div class="px-2 py-1 text-12-regular text-text-weak">
              {i18n.t("ui.sessionGraph.toolbar.domains")}
            </div>
            <div class="flex flex-wrap gap-1 px-2 pb-1" data-slot="graph-profile-presets">
              <For each={PROFILE_PRESETS}>
                {(preset) => (
                  <button
                    type="button"
                    class="rounded border border-border-weaker-base px-1.5 py-0.5 text-11-regular text-text-weak hover:text-text-strong"
                    data-profile={preset.id}
                    onClick={() => props.onDomainsChange?.(new Set(preset.domains))}
                  >
                    {i18n.t(preset.labelKey)}
                  </button>
                )}
              </For>
            </div>
            <div class="w-full border-t border-border-weaker-base my-1" />
            {/* Session is always on and pinned */}
            {option({
              label: i18n.t(DOMAIN_KEY.session),
              onClick: () => {},
              pressed: true,
              disabled: true,
              slot: "graph-domain-option",
              value: "session",
              ariaLabel: i18n.t("ui.sessionGraph.toolbar.domainPinned"),
              keepOpen: true,
            })}
            <div class="w-full border-t border-border-weaker-base my-1" />
            {/* Structure group */}
            <div class="px-2 py-1 text-11-medium text-text-weak uppercase tracking-wide">
              {i18n.t("ui.sessionGraph.toolbar.domainGroup.structure")}
            </div>
            {DOMAIN_GROUPS.structure.map((domain) =>
              option({
                label: i18n.t(DOMAIN_KEY[domain]),
                onClick: () => toggleDomain(domain),
                pressed: currentDomains.has(domain),
                slot: "graph-domain-option",
                value: domain,
                keepOpen: true,
                title: domainsWithData.has(domain) ? undefined : i18n.t("ui.sessionGraph.toolbar.domainEmpty", { domain: i18n.t(DOMAIN_KEY[domain]) }),
              }),
            )}
            <div class="w-full border-t border-border-weaker-base my-1" />
            {/* Code group */}
            <div class="px-2 py-1 text-11-medium text-text-weak uppercase tracking-wide">
              {i18n.t("ui.sessionGraph.toolbar.domainGroup.code")}
            </div>
            {DOMAIN_GROUPS.code.map((domain) =>
              option({
                label: i18n.t(DOMAIN_KEY[domain]),
                onClick: () => toggleDomain(domain),
                pressed: currentDomains.has(domain),
                slot: "graph-domain-option",
                value: domain,
                keepOpen: true,
                title: domainsWithData.has(domain) ? undefined : i18n.t("ui.sessionGraph.toolbar.domainEmpty", { domain: i18n.t(DOMAIN_KEY[domain]) }),
              }),
            )}
            <div class="w-full border-t border-border-weaker-base my-1" />
            {/* Runtime group */}
            <div class="px-2 py-1 text-11-medium text-text-weak uppercase tracking-wide">
              {i18n.t("ui.sessionGraph.toolbar.domainGroup.runtime")}
            </div>
            {DOMAIN_GROUPS.runtime.map((domain) =>
              option({
                label: i18n.t(DOMAIN_KEY[domain]),
                onClick: () => toggleDomain(domain),
                pressed: currentDomains.has(domain),
                slot: "graph-domain-option",
                value: domain,
                keepOpen: true,
                title: domainsWithData.has(domain) ? undefined : i18n.t("ui.sessionGraph.toolbar.domainEmpty", { domain: i18n.t(DOMAIN_KEY[domain]) }),
              }),
            )}
          </ToolbarMenu>
        </Show>
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

  /** The commands: the search, and the export. */
  const commandControls = () => (
    <>
      <GraphIconButton
        label={i18n.t("ui.sessionGraph.toolbar.search")}
        icon="magnifying-glass"
        pressed={props.searching}
        onClick={props.onSearch}
      />
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
      data-component="session-graph-toolbar"
      data-slot="graph-toolbar"
      class="flex flex-wrap items-center gap-2 border-b border-border-weaker-base px-2 py-1.5"
      style={props.endInset ? { "padding-inline-end": props.endInset } : undefined}
    >
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

      <Show
        when={!props.compact}
        fallback={
          <ToolbarMenu
            slot="graph-toolbar-level"
            label={i18n.t("ui.sessionGraph.toolbar.level")}
            icon="levels"
            value={i18n.t(LEVEL_KEY[props.level])}
          >
            {ZOOM_LEVELS.map((level) =>
              option({
                label: i18n.t(LEVEL_KEY[level]),
                onClick: () => props.onLevel(level),
                pressed: props.level === level,
                slot: "graph-level-option",
                value: level,
              }),
            )}
          </ToolbarMenu>
        }
      >
        <SegmentedControl
          value={props.level}
          aria-label={i18n.t("ui.sessionGraph.toolbar.level")}
          onChange={(value) => value && props.onLevel(value as ZoomLevel)}
        >
          {ZOOM_LEVELS.map((level) => (
            <SegmentedControlItem value={level}>
              {i18n.t(LEVEL_KEY[level])}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </Show>

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
            {drawControls()}
            {showControls()}
            {commandControls()}
          </ToolbarMenu>
        }
      >
        <ToolbarMenu
          slot="graph-toolbar-draw"
          label={i18n.t("ui.sessionGraph.toolbar.draw")}
          icon="outline-sliders"
        >
          {drawControls()}
        </ToolbarMenu>
        <ToolbarMenu
          slot="graph-toolbar-show"
          label={i18n.t("ui.sessionGraph.toolbar.show")}
          icon="eye"
          value={i18n.t(DETAIL_MODE_KEY[props.detailMode ?? "panel"])}
        >
          {showControls()}
        </ToolbarMenu>
      </Show>

      {/* The renderer label and the back control sit at the end of the row: the host's own chrome
          floats over the panel's top-right, and the end inset keeps them clear of it. */}
      <div class="ml-auto flex items-center gap-2">
        {commandControls()}
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
