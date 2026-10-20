import type { DepthMode, RendererCapabilities, RenderModel } from "@spacegraphjs/renderer"
import { DEPTH_MODES, supportsDepth } from "@spacegraphjs/renderer"
import { IconButton } from "@opencode/ui/icon-button"
import { Icon } from "@opencode/ui/icon"
import { SegmentedControl, SegmentedControlItem } from "@opencode/ui/segmented-control"
import { useI18n } from "@opencode/ui/context/i18n"
import { Show } from "solid-js"
import "./graph-toolbar.css"
import {
  LAYOUT_STRATEGIES,
  REPRESENTATIONS,
  type LayoutStrategy,
  type Representation,
  type ZoomLevel,
} from "@opencode/session-ui/graph"
import { DEPTH_KEY, LEVEL_KEY, REPRESENTATION_KEY, STRATEGY_KEY } from "./vocabulary"

const LEVELS: ZoomLevel[] = ["overview", "execution", "detail"]

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
  /** RF.2: the visible layout chooser; absent when the host does not offer strategies. */
  strategy?: LayoutStrategy
  onStrategy?: (strategy: LayoutStrategy) => void
  /** LE.7: the representation chooser; absent when the host does not offer representations. */
  representation?: Representation
  onRepresentation?: (representation: Representation) => void
  /** RF.7: minimap toggle, default off. */
  minimap?: boolean
  onToggleMinimap?: () => void
  /** LE.12: the file-first lens toggle (changed-files rail + bundled provenance); default off. */
  files?: boolean
  onToggleFiles?: () => void
  /** Opens the hybrid turn map for the currently selected turn; absent when no turn is selected. */
  onTurnMap?: () => void
  /** LE.8/LE.9: opens the selected ribbon/matrix segment in the node-link graph; absent outside graph mode. */
  onExpandGraph?: () => void
  /** T3.4: exports the current render model as SVG, JSON, or standalone HTML. */
  onExport?: (format: "svg" | "json" | "html", model: RenderModel) => void
  /** Current render model for export; required when onExport is provided. */
  renderModel?: RenderModel
  onBack?: () => void
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
  /**
   * CSS length reserved at the inline end of the row, so a host whose floating chrome overlaps
   * the graph panel's top-right keeps the renderer label and back control clickable.
   */
  endInset?: string
}

/**
 * Graph toolbar (U3.9). It owns no graph state; it renders the semantic level, projection, and the
 * commands the host supplies. Capability gaps are disabled with an explanation, never hidden.
 */
export const GraphToolbar = (props: GraphToolbarProps) => {
  const i18n = useI18n()
  // The level and layout controls drive the node-link graph only; the ribbon/matrix are overview-first.
  const graphMode = () => props.representation === undefined || props.representation === "graph"
  const depthAvailable = (depth: DepthMode) => !props.capabilities || supportsDepth(props.capabilities, depth)
  const depthReason = (depth: DepthMode) =>
    depthAvailable(depth)
      ? undefined
      : i18n.t("ui.sessionGraph.capability.depthUnavailable", { depth: i18n.t(DEPTH_KEY[depth]), renderer: props.renderer ?? "" })

  // The controls after the level stepper: inline on wide rows, behind an overflow menu when compact.
  const secondary = () => (
    <>
      <Show when={props.onDepth}>
        <SegmentedControl
          value={props.depth ?? "flat"}
          aria-label={i18n.t("ui.sessionGraph.toolbar.depth")}
          onChange={(value) => value && props.onDepth?.(value as DepthMode)}
        >
          {(props.depthModes ?? DEPTH_MODES).map((mode) => (
            <SegmentedControlItem value={mode} disabled={!depthAvailable(mode)} title={depthReason(mode)}>
              {i18n.t(DEPTH_KEY[mode])}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </Show>

      <Show when={props.onStrategy && graphMode()}>
        <details class="relative" data-slot="graph-toolbar-layout">
          <summary
            class="flex h-6 cursor-pointer list-none items-center gap-1 rounded-sm px-1 text-12-regular text-text-base hover:bg-surface-base-hover [&::-webkit-details-marker]:hidden"
            title={i18n.t("ui.sessionGraph.toolbar.layout")}
          >
            <span data-slot="graph-layout-name">
              {i18n.t("ui.sessionGraph.toolbar.layoutValue", { layout: i18n.t(STRATEGY_KEY[props.strategy ?? "lanes"]) })}
            </span>
            <Icon name="outline-chevron-down" size="small" />
          </summary>
          <div class="absolute end-0 z-30 mt-1 flex flex-col items-start gap-1 rounded-sm border border-border-weaker-base bg-surface-base p-2 shadow-md min-w-[160px]">
            {LAYOUT_STRATEGIES.map((strategy) => (
              <button
                type="button"
                data-slot="graph-layout-option"
                data-strategy={strategy}
                aria-pressed={props.strategy === strategy}
                class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
                onClick={(event) => {
                  const menu = event.currentTarget.closest("details")
                  if (menu) menu.open = false
                  props.onStrategy?.(strategy)
                }}
              >
                {i18n.t(STRATEGY_KEY[strategy])}
              </button>
            ))}
          </div>
        </details>
      </Show>

      <IconButton
        size="small"
        variant="ghost"
        state={props.minimap ? "pressed" : "rest"}
        aria-label={i18n.t("ui.sessionGraph.toolbar.minimap")}
        title={i18n.t("ui.sessionGraph.toolbar.minimap")}
        onClick={() => props.onToggleMinimap?.()}
        icon={<Icon name="layout-bottom" size="small" />}
      />
      <Show when={props.onToggleFiles}>
        <IconButton
          size="small"
          variant="ghost"
          state={props.files ? "pressed" : "rest"}
          aria-label={i18n.t("ui.sessionGraph.toolbar.files")}
          title={i18n.t("ui.sessionGraph.toolbar.files")}
          onClick={() => props.onToggleFiles?.()}
          icon={<Icon name="folder" size="small" />}
        />
      </Show>
      <IconButton
        size="small"
        variant="ghost"
        aria-label={i18n.t("ui.sessionGraph.toolbar.fit")}
        title={i18n.t("ui.sessionGraph.toolbar.fit")}
        onClick={props.onFit}
        icon={<Icon name="expand" size="small" />}
      />
      <IconButton
        size="small"
        variant="ghost"
        state={props.searching ? "pressed" : "rest"}
        aria-label={i18n.t("ui.sessionGraph.toolbar.search")}
        title={i18n.t("ui.sessionGraph.toolbar.search")}
        onClick={props.onSearch}
        icon={<Icon name="magnifying-glass" size="small" />}
      />
      <Show when={props.onToggleLegend}>
        <IconButton
          size="small"
          variant="ghost"
          state={props.legend ? "pressed" : "rest"}
          aria-label={i18n.t("ui.sessionGraph.toolbar.legend")}
          title={i18n.t("ui.sessionGraph.toolbar.legend")}
          onClick={() => props.onToggleLegend?.()}
          icon={<Icon name="outline-sliders" size="small" />}
        />
      </Show>
      <Show when={props.onToggleGallery}>
        <IconButton
          size="small"
          variant="ghost"
          state={props.gallery ? "pressed" : "rest"}
          aria-label={i18n.t("ui.sessionGraph.toolbar.gallery")}
          title={i18n.t("ui.sessionGraph.toolbar.gallery")}
          onClick={() => props.onToggleGallery?.()}
          icon={<Icon name="dot-grid" size="small" />}
        />
      </Show>
      <Show when={props.capabilities?.cardFacing && props.onToggleBillboard}>
        <IconButton
          size="small"
          variant="ghost"
          state={props.billboard ? "pressed" : "rest"}
          aria-pressed={props.billboard ? "true" : "false"}
          aria-label={i18n.t("ui.sessionGraph.toolbar.billboard")}
          title={i18n.t(props.billboard ? "ui.sessionGraph.toolbar.billboard" : "ui.sessionGraph.toolbar.billboardOff")}
          onClick={() => props.onToggleBillboard?.()}
          icon={<Icon name="cube" size="small" />}
        />
      </Show>
      <Show when={props.onTurnMap}>
        <IconButton
          size="small"
          variant="ghost"
          aria-label={i18n.t("ui.sessionGraph.toolbar.turnMap")}
          title={i18n.t("ui.sessionGraph.toolbar.turnMap")}
          onClick={() => props.onTurnMap?.()}
          icon={<Icon name="branch" size="small" />}
        />
      </Show>
      <Show when={props.onExpandGraph}>
        <IconButton
          size="small"
          variant="ghost"
          aria-label={i18n.t("ui.sessionGraph.toolbar.expandGraph")}
          title={i18n.t("ui.sessionGraph.toolbar.expandGraph")}
          onClick={() => props.onExpandGraph?.()}
          icon={<Icon name="arrow-up-right" size="small" />}
        />
      </Show>
      <Show when={props.onExport && props.renderModel}>
        <details class="relative" data-slot="graph-toolbar-export">
          <summary
            class="flex h-6 w-6 cursor-pointer list-none items-center justify-center rounded-sm text-text-base hover:bg-surface-base-hover [&::-webkit-details-marker]:hidden"
            aria-label={i18n.t("ui.sessionGraph.toolbar.export")}
            title={i18n.t("ui.sessionGraph.toolbar.export")}
          >
            <Icon name="download" size="small" />
          </summary>
          <div class="absolute end-0 z-30 mt-1 flex flex-col items-start gap-1 rounded-sm border border-border-weaker-base bg-surface-base p-2 shadow-md min-w-[160px]">
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
              onClick={() => props.onExport?.("svg", props.renderModel!)}
            >
              <Icon name="image" size="small" />
              <span>{i18n.t("ui.sessionGraph.toolbar.exportSvg")}</span>
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
              onClick={() => props.onExport?.("json", props.renderModel!)}
            >
              <Icon name="code" size="small" />
              <span>{i18n.t("ui.sessionGraph.toolbar.exportJson")}</span>
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
              onClick={() => props.onExport?.("html", props.renderModel!)}
            >
              <Icon name="globe" size="small" />
              <span>{i18n.t("ui.sessionGraph.toolbar.exportHtml")}</span>
            </button>
          </div>
        </details>
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
      <Show when={props.onRepresentation}>
        <SegmentedControl
          value={props.representation ?? "graph"}
          aria-label={i18n.t("ui.sessionGraph.toolbar.representation")}
          onChange={(value) => value && props.onRepresentation?.(value as Representation)}
        >
          {REPRESENTATIONS.map((representation) => (
            <SegmentedControlItem value={representation}>{i18n.t(REPRESENTATION_KEY[representation])}</SegmentedControlItem>
          ))}
        </SegmentedControl>
      </Show>

      <SegmentedControl
        value={props.level}
        aria-label={i18n.t("ui.sessionGraph.toolbar.level")}
        onChange={(value) => value && props.onLevel(value as ZoomLevel)}
      >
        {LEVELS.map((level) => (
          <SegmentedControlItem value={level} disabled={!graphMode()}>
            {i18n.t(LEVEL_KEY[level])}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>

      <div class="flex items-center gap-1">
        <IconButton
          size="small"
          variant="ghost"
          aria-label={i18n.t("ui.sessionGraph.toolbar.zoomOut")}
          title={i18n.t("ui.sessionGraph.toolbar.zoomOut")}
          disabled={!graphMode() || props.zoomOutDisabled}
          onClick={() => props.onZoomOut?.()}
          icon={<Icon name="expand" size="small" />}
        />
        <span
          data-slot="graph-zoom-level"
          class="min-w-9 text-center text-12-regular tabular-nums text-text-weak"
          aria-label={i18n.t("ui.sessionGraph.toolbar.zoomPercent", { percent: String(props.zoomPercent ?? 100) })}
        >
          {props.zoomPercent ?? 100}%
        </span>
        <IconButton
          size="small"
          variant="ghost"
          aria-label={i18n.t("ui.sessionGraph.toolbar.zoomIn")}
          title={i18n.t("ui.sessionGraph.toolbar.zoomIn")}
          disabled={!graphMode() || props.zoomInDisabled}
          onClick={() => props.onZoomIn?.()}
          icon={<Icon name="plus" size="small" />}
        />
      </div>

      <Show
        when={!props.compact}
        fallback={
          <details class="relative" data-slot="graph-toolbar-overflow">
            <summary
              class="flex h-6 w-6 cursor-pointer list-none items-center justify-center rounded-sm text-text-base hover:bg-surface-base-hover [&::-webkit-details-marker]:hidden"
              aria-label={i18n.t("ui.sessionGraph.toolbar.more")}
              title={i18n.t("ui.sessionGraph.toolbar.more")}
            >
              <Icon name="outline-dots" size="small" />
            </summary>
            <div class="absolute end-0 z-30 mt-1 flex flex-col items-start gap-2 rounded-sm border border-border-weaker-base bg-surface-base p-2 shadow-md">
              {secondary()}
            </div>
          </details>
        }
      >
        {secondary()}
      </Show>

      <div class="ml-auto flex items-center gap-2">
        {props.renderer ? (
          <span class="text-12-regular text-text-weak" title={i18n.t("ui.sessionGraph.toolbar.renderer", { renderer: props.renderer })}>
            {i18n.t("ui.sessionGraph.toolbar.renderer", { renderer: props.renderer })}
          </span>
        ) : null}
        {props.onBack ? (
          <IconButton
            size="small"
            variant="ghost"
            aria-label={i18n.t("ui.sessionGraph.toolbar.back")}
            title={i18n.t("ui.sessionGraph.toolbar.back")}
            onClick={props.onBack}
            icon={<Icon name="outline-arrow-left" size="small" />}
          />
        ) : null}
      </div>
    </div>
  )
}
