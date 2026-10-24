import type { DepthMode, RendererCapabilities } from "@spacegraphjs/renderer"
import { DEPTH_MODES, supportsDepth } from "@spacegraphjs/renderer"
import { SegmentedControl, SegmentedControlItem } from "@opencode/ui/segmented-control"
import { useI18n } from "@opencode/ui/context/i18n"
import { For, Show } from "solid-js"
import {
  PROFILE_PRESETS,
  ZOOM_LEVELS,
  type Domain,
  type ZoomLevel,
} from "@opencode/session-ui/graph"
import { DEPTH_KEY, LEVEL_KEY } from "./vocabulary"

export type GraphLayersRailProps = {
  level: ZoomLevel
  onLevel: (level: ZoomLevel) => void
  domains: ReadonlySet<Domain>
  onDomainsChange: (domains: ReadonlySet<Domain>) => void
  depth: DepthMode
  onDepth: (depth: DepthMode) => void
  depthModes?: readonly DepthMode[]
  capabilities?: RendererCapabilities
  renderer?: string
}

/**
 * One rail for the three layer parameters the map reads: the semantic level, the domain lens, and
 * the depth spectrum. Each control writes a substrate parameter; the rail holds no state of its own,
 * so a layer switch is another re-derivation, not a mode.
 */
export const GraphLayersRail = (props: GraphLayersRailProps) => {
  const i18n = useI18n()

  const activeProfile = () =>
    PROFILE_PRESETS.find(
      (preset) =>
        preset.domains.length === props.domains.size && preset.domains.every((domain) => props.domains.has(domain)),
    )?.id

  const depthAvailable = (depth: DepthMode) => !props.capabilities || supportsDepth(props.capabilities, depth)
  const depthReason = (depth: DepthMode) =>
    depthAvailable(depth)
      ? undefined
      : i18n.t("ui.sessionGraph.capability.depthUnavailable", {
          depth: i18n.t(DEPTH_KEY[depth]),
          renderer: props.renderer ?? "",
        })

  return (
    <div
      data-component="graph-layers-rail"
      data-slot="graph-layers-rail"
      class="flex flex-wrap items-center gap-2 border-b border-border-weaker-base px-2 py-1.5"
    >
      <span class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.layers.title")}</span>

      <SegmentedControl
        value={props.level}
        aria-label={i18n.t("ui.sessionGraph.toolbar.level")}
        onChange={(value) => value && props.onLevel(value as ZoomLevel)}
      >
        {ZOOM_LEVELS.map((level) => (
          <SegmentedControlItem value={level}>{i18n.t(LEVEL_KEY[level])}</SegmentedControlItem>
        ))}
      </SegmentedControl>

      <label class="flex items-center gap-1 text-12-regular text-text-weak">
        <span>{i18n.t("ui.sessionGraph.layers.lens")}</span>
        <select
          data-slot="graph-layers-lens"
          class="h-6 rounded-sm border border-border-weaker-base bg-surface-base px-1 text-12-regular text-text-base"
          aria-label={i18n.t("ui.sessionGraph.layers.lens")}
          value={activeProfile() ?? "custom"}
          onChange={(event) => {
            const preset = PROFILE_PRESETS.find((item) => item.id === event.currentTarget.value)
            if (!preset) return
            props.onDomainsChange(new Set(preset.domains))
          }}
        >
          <Show when={!activeProfile()}>
            <option value="custom" disabled>
              {i18n.t("ui.sessionGraph.layers.custom")}
            </option>
          </Show>
          <For each={PROFILE_PRESETS}>
            {(preset) => <option value={preset.id}>{i18n.t(preset.labelKey)}</option>}
          </For>
        </select>
      </label>

      <label class="flex items-center gap-1 text-12-regular text-text-weak">
        <span>{i18n.t("ui.sessionGraph.toolbar.depth")}</span>
        <select
          data-slot="graph-layers-depth"
          class="h-6 rounded-sm border border-border-weaker-base bg-surface-base px-1 text-12-regular text-text-base"
          aria-label={i18n.t("ui.sessionGraph.toolbar.depth")}
          value={props.depth}
          onChange={(event) => props.onDepth(event.currentTarget.value as DepthMode)}
        >
          <For each={props.depthModes ?? DEPTH_MODES}>
            {(depth) => (
              <option value={depth} disabled={!depthAvailable(depth)} title={depthReason(depth)}>
                {i18n.t(DEPTH_KEY[depth])}
              </option>
            )}
          </For>
        </select>
      </label>
    </div>
  )
}
