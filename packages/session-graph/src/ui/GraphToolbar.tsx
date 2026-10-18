import type { Projection, RendererCapabilities } from "@spacegraphjs/renderer"
import { supports } from "@spacegraphjs/renderer"
import { IconButton } from "@opencode/ui/icon-button"
import { Icon } from "@opencode/ui/icon"
import { SegmentedControl, SegmentedControlItem } from "@opencode/ui/segmented-control"
import { useI18n } from "@opencode/ui/context/i18n"
import { Show } from "solid-js"
import type { ZoomLevel } from "@opencode/session-ui/graph"

const LEVELS: ZoomLevel[] = ["overview", "execution", "detail"]

const LEVEL_KEY = {
  overview: "ui.sessionGraph.level.overview",
  execution: "ui.sessionGraph.level.execution",
  detail: "ui.sessionGraph.level.detail",
} as const satisfies Record<ZoomLevel, string>

export type GraphToolbarProps = {
  level: ZoomLevel
  onLevel: (level: ZoomLevel) => void
  projection: Projection
  onProjection: (projection: Projection) => void
  capabilities?: RendererCapabilities
  renderer?: string
  onFit: () => void
  onSearch: () => void
  /** Opens the hybrid turn map for the currently selected turn; absent when no turn is selected. */
  onTurnMap?: () => void
  onBack?: () => void
  searching?: boolean
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
  const step = (direction: 1 | -1) => {
    const index = LEVELS.indexOf(props.level)
    const next = LEVELS[Math.min(LEVELS.length - 1, Math.max(0, index + direction))]
    if (next !== props.level) props.onLevel(next)
  }
  const projectionAvailable = (projection: Projection) => !props.capabilities || supports(props.capabilities, projection)
  const projectionReason = (projection: Projection) =>
    projectionAvailable(projection)
      ? undefined
      : i18n.t("ui.sessionGraph.capability.projectionUnavailable", { projection: projection.toUpperCase(), renderer: props.renderer ?? "" })

  return (
    <div
      data-component="session-graph-toolbar"
      data-slot="graph-toolbar"
      class="flex flex-wrap items-center gap-2 border-b border-border-weaker-base px-2 py-1.5"
      style={props.endInset ? { "padding-inline-end": props.endInset } : undefined}
    >
      <SegmentedControl
        value={props.level}
        aria-label={i18n.t("ui.sessionGraph.toolbar.level")}
        onChange={(value) => value && props.onLevel(value as ZoomLevel)}
      >
        {LEVELS.map((level) => (
          <SegmentedControlItem value={level}>{i18n.t(LEVEL_KEY[level])}</SegmentedControlItem>
        ))}
      </SegmentedControl>

      <div class="flex items-center">
        <IconButton
          size="small"
          variant="ghost"
          aria-label={i18n.t("ui.sessionGraph.toolbar.zoomOut")}
          title={i18n.t("ui.sessionGraph.toolbar.zoomOut")}
          disabled={props.level === "overview"}
          onClick={() => step(-1)}
          icon={<Icon name="expand" size="small" />}
        />
        <IconButton
          size="small"
          variant="ghost"
          aria-label={i18n.t("ui.sessionGraph.toolbar.zoomIn")}
          title={i18n.t("ui.sessionGraph.toolbar.zoomIn")}
          disabled={props.level === "detail"}
          onClick={() => step(1)}
          icon={<Icon name="plus" size="small" />}
        />
      </div>

      <SegmentedControl
        value={props.projection}
        aria-label={i18n.t("ui.sessionGraph.toolbar.projection")}
        onChange={(value) => value && props.onProjection(value as Projection)}
      >
        <SegmentedControlItem value="2d">{i18n.t("ui.sessionGraph.projection.2d")}</SegmentedControlItem>
        <SegmentedControlItem value="3d" disabled={!projectionAvailable("3d")} title={projectionReason("3d")}>
          {i18n.t("ui.sessionGraph.projection.3d")}
        </SegmentedControlItem>
      </SegmentedControl>

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
