import type { RenderTheme } from "@spacegraphjs/renderer"
import type { GraphNode, LayoutStrategy, NodeKind } from "@opencode/session-ui/graph"
import { LANES } from "@opencode/session-ui/graph"
import { IconButton } from "@opencode/ui/icon-button"
import { Icon } from "@opencode/ui/icon"
import { useI18n } from "@opencode/ui/context/i18n"
import { type JSX, onMount } from "solid-js"
import { categoryAccent, kindAccent, statusAccent } from "./cardTemplate"
import { CONFIDENCE_KEY, KIND_KEY, LANE_KEY, LAYOUT_HINT_KEY } from "./vocabulary"

/** The phase categories a card can be grouped by, in the order the matrix lays them out. */
const CATEGORIES = ["explore", "edit", "verify", "delegate", "result"] as const

const KINDS: NodeKind[] = [
  "session",
  "turn",
  "phase",
  "message",
  "reasoning",
  "tool",
  "file",
  "subagent",
  "result",
  "error",
  "retry",
  "compaction",
  "notice",
  "diff",
]

const STATUSES: GraphNode["status"][] = ["pending", "running", "success", "failed", "interrupted", "neutral"]

/** How an edge of each confidence is drawn; the adapter decides the same. */
const CONFIDENCE_STYLE = {
  explicit: "solid",
  structural: "dashed",
  inferred: "dashed",
} as const

export type GraphLegendProps = {
  theme: RenderTheme
  /** T7: the layout on screen; the legend says what that layout encodes. */
  strategy?: LayoutStrategy
  onClose: () => void
}

export type GraphLegendBodyProps = {
  theme: RenderTheme
  /** T7: the layout on screen; the legend says what that layout encodes. */
  strategy?: LayoutStrategy
}

/**
 * T12 — the legend's content, without the overlay around it, so a window can hold it. The legend
 * names every encoding the canvas draws; the colours come from the same helpers the card template
 * uses, so the legend cannot drift from the picture.
 */
export const GraphLegendBody = (props: GraphLegendBodyProps) => {
  const i18n = useI18n()

  const swatch = (color: string) => (
    <span class="h-3 w-3 shrink-0 rounded-sm" style={{ background: color }} aria-hidden="true" />
  )

  const line = (style: "solid" | "dashed") => (
    <span
      class="h-0 w-5 shrink-0 border-t-2"
      style={{ "border-color": props.theme.edge, "border-style": style }}
      aria-hidden="true"
    />
  )

  const section = (title: string, children: JSX.Element) => (
    <div class="mt-2 first:mt-0">
      <div class="text-12-regular text-text-weak">{title}</div>
      <div class="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">{children}</div>
    </div>
  )

  return (
    <div class="min-h-0 flex-1 overflow-y-auto border-t border-border-weaker-base px-3 py-2">
      <p class="text-12-regular text-text-base">{i18n.t(LAYOUT_HINT_KEY[props.strategy ?? "lanes"])}</p>
      <p class="mt-1 text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.legend.help")}</p>

      {section(
        i18n.t("ui.sessionGraph.legend.lanes"),
        LANES.map((lane) => (
          <span class="truncate text-12-regular text-text-base">{i18n.t(LANE_KEY[lane])}</span>
        )),
      )}

      {section(
        i18n.t("ui.sessionGraph.legend.kinds"),
        KINDS.map((kind) => (
          <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
            {swatch(kindAccent(kind).solid)}
            <span class="truncate">{i18n.t(KIND_KEY[kind])}</span>
          </span>
        )),
      )}

      {section(
        i18n.t("ui.sessionGraph.legend.phases"),
        CATEGORIES.map((category) => (
          <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
            {swatch(categoryAccent(category).solid)}
            <span class="truncate">{i18n.t(`ui.sessionGraph.phase.${category}`)}</span>
          </span>
        )),
      )}

      {section(
        i18n.t("ui.sessionGraph.legend.lines"),
        (Object.keys(CONFIDENCE_STYLE) as (keyof typeof CONFIDENCE_STYLE)[]).map((confidence) => (
          <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
            {line(CONFIDENCE_STYLE[confidence])}
            <span class="truncate">{i18n.t(CONFIDENCE_KEY[confidence])}</span>
          </span>
        )),
      )}

      {section(
        i18n.t("ui.sessionGraph.legend.status"),
        STATUSES.map((status) => (
          <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
            {swatch(statusAccent(props.theme, status))}
            <span class="truncate">{i18n.t(`ui.sessionGraph.status.${status}`)}</span>
          </span>
        )),
      )}
    </div>
  )
}

/**
 * T6.8 — the legend. It names every encoding the canvas draws: the lanes, the card colours, the
 * phase groups, the line styles, and the status dots. The colours come from the same helpers the
 * card template uses, so the legend cannot drift from the picture, and the copy comes from the same
 * i18n keys the inspector uses, so a kind is called the same thing everywhere.
 */
export const GraphLegend = (props: GraphLegendProps) => {
  const i18n = useI18n()
  let panel!: HTMLDivElement

  onMount(() => panel.focus())

  return (
    <div
      ref={panel}
      tabindex="-1"
      data-component="session-graph-legend"
      data-slot="graph-legend"
      class="absolute left-2 top-2 z-10 flex max-h-[calc(100%-1rem)] w-80 max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-md border border-border-base bg-background-base shadow-md outline-none"
      role="dialog"
      aria-label={i18n.t("ui.sessionGraph.legend.label")}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return
        event.stopPropagation()
        props.onClose()
      }}
    >
      <div class="flex items-center gap-2 px-2 py-1.5">
        <Icon name="outline-sliders" size="small" class="shrink-0 text-text-weak" />
        <span class="flex-1 text-14-regular text-text-strong">{i18n.t("ui.sessionGraph.legend.label")}</span>
        <IconButton
          size="small"
          variant="ghost"
          aria-label={i18n.t("ui.sessionGraph.legend.close")}
          title={i18n.t("ui.sessionGraph.legend.close")}
          onClick={props.onClose}
          icon={<Icon name="close-small" size="small" />}
        />
      </div>

      <GraphLegendBody theme={props.theme} strategy={props.strategy} />
    </div>
  )
}
