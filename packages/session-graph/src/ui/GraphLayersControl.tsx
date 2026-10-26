import { DEPTH_MODES, supportsDepth } from "@spacegraphjs/renderer"
import { SegmentedControl, SegmentedControlItem } from "@opencode/ui/segmented-control"
import { Icon } from "@opencode/ui/icon"
import { useI18n } from "@opencode/ui/context/i18n"
import { type JSX } from "solid-js"
import { ZOOM_LEVELS, type ZoomLevel, DOMAINS, type Domain, NODE_KINDS, type NodeKind, NODE_STATUSES, type NodeStatus, PROFILE_PRESETS, type GraphFacets, type FacetCounts, type GraphViewData, type DepthMode, VOCABULARY_KEYS } from "@opencode/session-ui/graph"

export type GraphLayersControlProps = {
  level?: ZoomLevel
  onLevel?: (level: ZoomLevel) => void
  facets?: GraphFacets
  facetCounts?: FacetCounts
  onFacetsChange?: (facets: GraphFacets) => void
  depth?: DepthMode
  onDepth?: (depth: DepthMode) => void
  depthModes?: readonly DepthMode[]
  capabilities?: import("@spacegraphjs/renderer").RendererCapabilities
  renderer?: string
  model?: GraphViewData
}

const ToolbarMenu = (props: {
  slot: string
  label: string
  icon: string
  value?: string
  valueSlot?: string
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

export const GraphLayersControl = (props: GraphLayersControlProps) => {
  const i18n = useI18n()

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
          depth: i18n.t(VOCABULARY_KEYS.depth[depth]),
          renderer: props.renderer ?? "",
        })

  const option = (input: {
    label: string
    onClick: () => void
    pressed?: boolean
    disabled?: boolean
    title?: string
    slot?: string
    value?: string
    ariaLabel?: string
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
      <div
        data-slot="graph-layers-level"
        onClick={(event) => {
          const menu = event.currentTarget.closest("details")
          if (menu) menu.open = false
        }}
      >
        <SegmentedControl
          value={props.level ?? "execution"}
          aria-label={i18n.t("ui.sessionGraph.toolbar.level")}
          onChange={(value) => value && props.onLevel?.(value as ZoomLevel)}
        >
          {ZOOM_LEVELS.map((level) => (
            <SegmentedControlItem value={level}>{i18n.t(VOCABULARY_KEYS.level[level])}</SegmentedControlItem>
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
              label: i18n.t(VOCABULARY_KEYS.domain[domain]),
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
                    {i18n.t(VOCABULARY_KEYS.domain[domain])} · {count ? `${count.kept}/${count.total}` : "0/0"}
                  </span>
                )
              })}
            </div>
          )}
        </Show>
      </div>
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
              {i18n.t(VOCABULARY_KEYS.depth[depth])}
            </option>
          ))}
        </select>
      </label>
    </Show>
  )

  const layersControl = () => (
    <Show when={props.onLevel || props.onFacetsChange || props.onDepth}>
      <ToolbarMenu
        slot="graph-toolbar-layers"
        label={i18n.t("ui.sessionGraph.layers.title")}
        icon="outline-eye"
        align="start"
        value={props.onLevel ? i18n.t(VOCABULARY_KEYS.level[props.level ?? "execution"]) : undefined}
        valueSlot="graph-layers-level-name"
      >
        {levelControl()}
        {lensControl()}
        {depthControl()}
      </ToolbarMenu>
    </Show>
  )

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
                  label: `${i18n.t(VOCABULARY_KEYS.kind[kind])} · ${countLabel(kind, props.facetCounts?.kinds ?? []) ?? "0/0"}`,
                  onClick: () => toggleKind(kind),
                  pressed: facets()?.kinds.has(kind),
                  slot: "graph-facet-kind",
                  value: kind,
                  keepOpen: true,
                  ariaLabel: i18n.t(VOCABULARY_KEYS.kind[kind]),
                }),
              )}
            </div>
            <div data-slot="graph-facet-statuses" class="flex flex-col">
              <div class="px-1 py-1 text-11-medium uppercase tracking-wide text-text-weak">
                {i18n.t("ui.sessionGraph.facets.statuses")}
              </div>
              {NODE_STATUSES.map((status) =>
                option({
                  label: `${i18n.t(VOCABULARY_KEYS.status[status])} · ${countLabel(status, props.facetCounts?.statuses ?? []) ?? "0/0"}`,
                  onClick: () => toggleStatus(status),
                  pressed: facets()?.statuses.has(status),
                  slot: "graph-facet-status",
                  value: status,
                  keepOpen: true,
                  ariaLabel: i18n.t(VOCABULARY_KEYS.status[status]),
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

  return (
    <>
      {layersControl()}
      {facetsControl()}
    </>
  )
}

import { Show } from "solid-js"