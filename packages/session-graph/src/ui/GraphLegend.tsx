import type { RenderTheme } from "@spacegraphjs/renderer"
import type { EqualizerRuleSet, Layout, GraphSnapshotMeta } from "@opencode/session-ui/graph"
import { LANES, NODE_KINDS, NODE_STATUSES, PHASE_CATEGORIES } from "@opencode/session-ui/graph"
import { Icon } from "@opencode/ui/icon"
import { useI18n } from "@opencode/ui/context/i18n"
import { Show, type JSX, onMount } from "solid-js"
import { categoryAccent, kindAccent, statusAccent, sourceLabel, formatAge } from "./cardTemplate"
import { CONFIDENCE_KEY, EDGE_KEY, KIND_KEY, LANE_KEY, LAYOUT_HINT_KEY } from "./vocabulary"
import { GraphIconButton } from "./GraphIconButton"

/** How an edge of each confidence is drawn; the adapter decides the same. */
const CONFIDENCE_STYLE = {
  explicit: "solid",
  structural: "dashed",
  inferred: "dashed",
} as const

export type GraphLegendProps = {
  theme: RenderTheme
  /** T17.1: the layout on screen; the legend says what that layout encodes. */
  layout?: Layout
  /** T15: the equalizer's rules, so the legend reads the same accents the cards do. */
  rules?: EqualizerRuleSet
  /** T29.4/T30.3: snapshot metadata for provenance and missing sources. */
  snapshot?: GraphSnapshotMeta
  /** B3: edge kinds present in the map, with counts and visibility. */
  edgeKinds?: readonly { kind: string; count: number; hidden: boolean }[]
  onToggleEdgeKind?: (kind: string) => void
  onClose: () => void
}

export type GraphLegendBodyProps = {
  theme: RenderTheme
  /** T17.1: the layout on screen; the legend says what that layout encodes. */
  layout?: Layout
  /** T15: the equalizer's rules, so the legend reads the same accents the cards do. */
  rules?: EqualizerRuleSet
  /** T29.4/T30.3: snapshot metadata for provenance and missing sources. */
  snapshot?: GraphSnapshotMeta
  /** B3: edge kinds present in the map, with counts and visibility. */
  edgeKinds?: readonly { kind: string; count: number; hidden: boolean }[]
  onToggleEdgeKind?: (kind: string) => void
}

/**
 * T12 — the legend's content, without the overlay around it, so a window can hold it. The legend
 * names every encoding the canvas draws; the colours come from the same helpers the card template
 * uses, so the legend cannot drift from the picture.
 */
export const GraphLegendBody = (props: GraphLegendBodyProps) => {
  const i18n = useI18n()
  const now = Date.now()

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

  // T30.3 — provenance sources section
  const provenanceSources = props.snapshot?.asOf
    ? Object.entries(props.snapshot.asOf).map(([source, asOf]) => (
        <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
          {swatch(props.theme.accent)}
          <span class="truncate">
            {i18n.t(sourceLabel(source))}
            {asOf !== undefined && (
              <span class="text-text-weak ml-1">{formatAge(now - asOf)}</span>
            )}
          </span>
        </span>
      ))
    : []

  // T30.3 — missing sources section
  const missingSources = props.snapshot?.missing?.map((m) => (
    <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
      <span class="h-3 w-3 shrink-0 rounded-sm" style={{ background: props.theme.warning }} aria-hidden="true" />
      <span class="truncate">{i18n.t(sourceLabel(m.source))}</span>
      <span class="text-text-weak ml-1 truncate">{m.reason}</span>
    </span>
  ))

  return (
    <div class="min-h-0 flex-1 overflow-y-auto border-t border-border-weaker-base px-3 py-2">
      <p class="text-12-regular text-text-base">{i18n.t(LAYOUT_HINT_KEY[props.layout ?? "lanes"])}</p>
      <p class="mt-1 text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.legend.help")}</p>

      {section(
        i18n.t("ui.sessionGraph.legend.lanes"),
        LANES.map((lane) => (
          <span class="truncate text-12-regular text-text-base">{i18n.t(LANE_KEY[lane])}</span>
        )),
      )}

      {section(
        i18n.t("ui.sessionGraph.legend.kinds"),
        NODE_KINDS.map((kind) => (
          <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
            {swatch(kindAccent(kind, props.rules).solid)}
            <span class="truncate">{i18n.t(KIND_KEY[kind])}</span>
          </span>
        )),
      )}

      {section(
        i18n.t("ui.sessionGraph.legend.phases"),
        PHASE_CATEGORIES.map((category) => (
          <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
            {swatch(categoryAccent(category, props.rules).solid)}
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

      <Show when={(props.edgeKinds?.length ?? 0) > 0}>
        <div data-slot="graph-legend-edge-kinds" class="mt-2">
          <div class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.legend.edgeKinds")}</div>
          <div class="mt-1 flex flex-col">
            {props.edgeKinds?.map((entry) => (
              <button
                type="button"
                data-slot="graph-legend-edge-kind"
                data-kind={entry.kind}
                data-hidden={entry.hidden}
                aria-pressed={!entry.hidden}
                class="flex items-center gap-2 rounded-sm px-1 py-0.5 text-start text-12-regular text-text-base hover:bg-surface-base-hover"
                classList={{ "opacity-50": entry.hidden }}
                onClick={() => props.onToggleEdgeKind?.(entry.kind)}
              >
                <span class="truncate">
                  {i18n.t("ui.sessionGraph.legend.edgeKindCount", {
                    kind: i18n.t(EDGE_KEY[entry.kind as keyof typeof EDGE_KEY]),
                    count: String(entry.count),
                  })}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Show>

      {section(
        i18n.t("ui.sessionGraph.legend.status"),
        NODE_STATUSES.map((status) => (
          <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
            {swatch(statusAccent(props.theme, status))}
            <span class="truncate">{i18n.t(`ui.sessionGraph.status.${status}`)}</span>
          </span>
        )),
      )}

      {provenanceSources.length > 0 && section(
        i18n.t("ui.sessionGraph.legend.sources"),
        provenanceSources,
      )}

      {missingSources && missingSources.length > 0 && section(
        i18n.t("ui.sessionGraph.legend.missing"),
        missingSources,
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
        <GraphIconButton label={i18n.t("ui.sessionGraph.legend.close")} icon="close-small" onClick={props.onClose} />
      </div>

      <GraphLegendBody theme={props.theme} layout={props.layout} rules={props.rules} />
    </div>
  )
}
