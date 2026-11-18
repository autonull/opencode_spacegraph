import { usePlugin } from "@opencode/plugin/gui"
import { createMemo, createSignal, For, Show } from "solid-js"
import {
  GRAPH_ARRANGEMENTS,
  GRAPH_SIDES,
  LAYOUTS,
  ZOOM_LEVELS,
  type DetailMode,
  type GraphArrangement,
  type GraphSide,
  type Layout,
  type ZoomLevel,
} from "../model"
import {
  BUILTIN_LENSES,
  DEPTH_MODES,
  DENSITY_PROFILES,
  RENDERER_STRATEGIES,
  type BuiltinLensId,
  type DensityProfile,
  type RendererStrategy,
} from "./declarations"
import type definition from "./declarations"

interface SpacegraphPrefs {
  lens?: string
  surfaces?: Record<string, {
    layout?: Layout
    depth?: "flat" | "layered" | "depth-stack" | "orbit"
    level?: ZoomLevel
    detailMode?: DetailMode
    files?: boolean
    trace?: "why" | "led-here" | "related" | null
    persist?: boolean
    arrangement?: GraphArrangement
    side?: GraphSide
  }>
  density?: { profile?: DensityProfile }
  renderer?: { strategy?: RendererStrategy; reducedMotion?: boolean }
  widgets?: { enabled?: boolean }
  userLenses?: Array<{
    id: string
    name: string
    description: string
    surface: string
    layout?: Layout
    depth?: "flat" | "layered" | "depth-stack" | "orbit"
    level?: ZoomLevel
    detailMode?: DetailMode
    files?: boolean
    trace?: "why" | "led-here" | "related" | null
    widgets?: boolean
    budget?: "overview" | "execution" | "detail"
  }>
}

function next<T>(values: readonly T[], current: T) {
  return values[(values.indexOf(current) + 1) % values.length] ?? current
}

/** The plugin's settings page: a lens picker and the per-surface defaults behind it. */
export default function SpacegraphSettings() {
  const ctx = usePlugin<typeof definition>()
  const prefs = ctx.stores.prefs
  const [editingCustomLens, setEditingCustomLens] = createSignal(false)
  const [customLensName, setCustomLensName] = createSignal("")
  const [customLensDescription, setCustomLensDescription] = createSignal("")

  const prefsValue = createMemo(() => prefs.value as SpacegraphPrefs)
  const lens = createMemo(() => prefsValue().lens ?? "navigator")
  const level = createMemo(() => prefsValue().surfaces?.map?.level ?? "overview")
  const layout = createMemo(() => prefsValue().surfaces?.map?.layout ?? "lanes")
  const depth = createMemo(() => prefsValue().surfaces?.map?.depth ?? "flat")
  const arrangement = createMemo(() => prefsValue().surfaces?.hybrid?.arrangement ?? "side")
  const side = createMemo(() => prefsValue().surfaces?.hybrid?.side ?? "end")
  const densityProfile = createMemo(() => prefsValue().density?.profile ?? "comfortable")
  const rendererStrategy = createMemo(() => prefsValue().renderer?.strategy ?? "spacegraph")
  const widgetsEnabled = createMemo(() => prefsValue().widgets?.enabled ?? false)

  const levelLabel = (value: ZoomLevel) => ctx.t(`level.${value}`)
  const layoutLabel = (value: Layout) => ctx.t(`layout.${value}`)
  const depthLabel = (value: NonNullable<SpacegraphPrefs["surfaces"]>[string]["depth"]) => ctx.t(`depth.${value}`)
  const arrangementLabel = (value: GraphArrangement) => ctx.t(`arrangement.${value}`)
  const sideLabel = (value: GraphSide) => ctx.t(`side.${value}`)

  const applyLens = (lensId: BuiltinLensId) => {
    const lensDef = BUILTIN_LENSES.find((entry) => entry.id === lensId)
    if (!lensDef) return

    prefs.update((draft) => {
      const surfaces = { ...(draft.surfaces ?? {}) }
      const surfacePrefs = {
        layout: lensDef.layout,
        depth: lensDef.depth,
        level: lensDef.level,
        detailMode: lensDef.detailMode,
        files: lensDef.files,
        trace: lensDef.trace ?? undefined,
        persist: true,
      }
      if (lensDef.surface === "map" || lensDef.surface === "hybrid") {
        surfaces.map = surfacePrefs
        if (lensDef.surface === "hybrid") surfaces.hybrid = surfacePrefs
      }
      draft.lens = lensId
      draft.surfaces = surfaces
      draft.renderer = { ...(draft.renderer ?? {}), strategy: "spacegraph" }
      draft.widgets = { ...(draft.widgets ?? {}), enabled: lensDef.widgets }
      draft.density = { ...(draft.density ?? {}), profile: "comfortable" }
    })
  }

  const cycleLens = (direction: "next" | "prev") => {
    const currentIndex = BUILTIN_LENSES.findIndex((entry) => entry.id === lens())
    const offset = direction === "next" ? 1 : BUILTIN_LENSES.length - 1
    applyLens(BUILTIN_LENSES[(currentIndex + offset) % BUILTIN_LENSES.length].id)
  }

  const saveAsCustomLens = () => {
    if (!customLensName().trim()) return
    prefs.update((draft) => {
      const userLenses = draft.userLenses ?? []
      const newLens = {
        id: customLensName(),
        name: customLensName(),
        description: customLensDescription() || "Custom lens",
        surface: prefsValue().surfaces?.map ? "map" : "transcript",
        layout: layout(),
        depth: depth(),
        level: level(),
        detailMode: prefsValue().surfaces?.map?.detailMode ?? "panel",
        files: prefsValue().surfaces?.map?.files ?? false,
        trace: prefsValue().surfaces?.map?.trace ?? undefined,
        widgets: widgetsEnabled(),
        budget: level() as "overview" | "execution" | "detail",
      }
      const existingIndex = userLenses.findIndex((entry) => entry.id === newLens.id)
      draft.userLenses = existingIndex >= 0
        ? userLenses.map((entry, index) => (index === existingIndex ? newLens : entry))
        : [...userLenses, newLens]
      draft.lens = newLens.id
    })
    setEditingCustomLens(false)
    setCustomLensName("")
    setCustomLensDescription("")
  }

  const setSurfacePref = (surface: string, key: "level" | "layout" | "depth" | "arrangement" | "side", value: string) => {
    prefs.update((draft) => {
      const surfaces = { ...(draft.surfaces ?? {}) }
      surfaces[surface] = { ...(surfaces[surface] ?? {}), [key]: value }
      draft.surfaces = surfaces
    })
  }

  const Row = (props: { label: string; value: () => string; act: () => void }) => (
    <ctx.ui.SettingsRow title={props.label}>
      <ctx.ui.Button onClick={props.act}>{props.value()}</ctx.ui.Button>
    </ctx.ui.SettingsRow>
  )

  const SelectRow = (props: { label: string; value: () => string; options: readonly string[]; labels: (value: string) => string; onChange: (value: string) => void }) => (
    <ctx.ui.SettingsRow title={props.label}>
      <ctx.ui.Select
        label={props.label}
        value={props.value()}
        onChange={props.onChange}
        options={props.options.map((option) => ({ value: option, label: props.labels(option) }))}
      />
    </ctx.ui.SettingsRow>
  )

  const ToggleRow = (props: { label: string; checked: () => boolean; onChange: (checked: boolean) => void }) => (
    <ctx.ui.SettingsRow title={props.label}>
      <ctx.ui.Switch label={props.label} checked={props.checked()} onChange={props.onChange} />
    </ctx.ui.SettingsRow>
  )

  return (
    <ctx.ui.SettingsLayout title={ctx.t("settings.title")} description={ctx.t("settings.description")}>
      <ctx.ui.SettingsSection title={ctx.t("settings.lens")}>
        <ctx.ui.SettingsRow title={ctx.t("settings.lens")} description={ctx.t("settings.lensDescription")}>
          <div class="sg-settings__lenses">
            <For each={BUILTIN_LENSES}>
              {(lensDef) => (
                <ctx.ui.Button
                  variant={lens() === lensDef.id ? "contrast" : "ghost"}
                  size="small"
                  onClick={() => applyLens(lensDef.id)}
                >
                  {ctx.t(`lens.${lensDef.id}`)}
                </ctx.ui.Button>
              )}
            </For>
          </div>
          <div class="sg-settings__lens-actions">
            <ctx.ui.Button variant="ghost" size="small" onClick={() => cycleLens("prev")}>{"◀"}</ctx.ui.Button>
            <ctx.ui.Button variant="ghost" size="small" onClick={() => cycleLens("next")}>{"▶"}</ctx.ui.Button>
            <ctx.ui.Button variant="ghost" size="small" onClick={() => applyLens("navigator")}>
              {ctx.t("settings.resetLens")}
            </ctx.ui.Button>
            <ctx.ui.Button variant="ghost" size="small" onClick={() => setEditingCustomLens(true)}>
              {ctx.t("settings.saveAsLens")}
            </ctx.ui.Button>
          </div>
        </ctx.ui.SettingsRow>
        <Show when={editingCustomLens()}>
          <ctx.ui.SettingsRow title={ctx.t("settings.customLensName")}>
            <div class="sg-settings__custom-lens">
              <ctx.ui.TextInput
                label={ctx.t("settings.customLensName")}
                placeholder={ctx.t("settings.customLensName")}
                value={customLensName()}
                onInput={setCustomLensName}
              />
              <ctx.ui.TextInput
                label={ctx.t("settings.customLensDescription")}
                placeholder={ctx.t("settings.customLensDescription")}
                value={customLensDescription()}
                onInput={setCustomLensDescription}
              />
              <div class="sg-settings__lens-actions">
                <ctx.ui.Button variant="ghost" size="small" onClick={() => setEditingCustomLens(false)}>
                  {ctx.t("settings.cancel")}
                </ctx.ui.Button>
                <ctx.ui.Button size="small" onClick={saveAsCustomLens}>{ctx.t("settings.save")}</ctx.ui.Button>
              </div>
            </div>
          </ctx.ui.SettingsRow>
        </Show>
      </ctx.ui.SettingsSection>

      <ctx.ui.SettingsSection title={ctx.t("settings.mapDefaults")}>
        <Row label={ctx.t("settings.level")} value={() => levelLabel(level())} act={() => setSurfacePref("map", "level", next(ZOOM_LEVELS, level()))} />
        <Row label={ctx.t("settings.layout")} value={() => layoutLabel(layout())} act={() => setSurfacePref("map", "layout", next(LAYOUTS, layout()))} />
        <Row label={ctx.t("settings.depth")} value={() => depthLabel(depth())} act={() => setSurfacePref("map", "depth", next(DEPTH_MODES, depth()))} />
      </ctx.ui.SettingsSection>

      <ctx.ui.SettingsSection title={ctx.t("settings.hybridDefaults")}>
        <Row label={ctx.t("settings.arrangement")} value={() => arrangementLabel(arrangement())} act={() => setSurfacePref("hybrid", "arrangement", next(GRAPH_ARRANGEMENTS, arrangement()))} />
        <Row label={ctx.t("settings.side")} value={() => sideLabel(side())} act={() => setSurfacePref("hybrid", "side", next(GRAPH_SIDES, side()))} />
      </ctx.ui.SettingsSection>

      <ctx.ui.SettingsSection title={ctx.t("settings.density")}>
        <SelectRow
          label={ctx.t("settings.density")}
          value={densityProfile}
          options={DENSITY_PROFILES}
          labels={(value) => ctx.t(`density.${value}`)}
          onChange={(value) => prefs.update((draft) => { draft.density = { ...(draft.density ?? {}), profile: value as DensityProfile } })}
        />
      </ctx.ui.SettingsSection>

      <ctx.ui.SettingsSection title={ctx.t("settings.renderer")}>
        <SelectRow
          label={ctx.t("settings.renderer")}
          value={rendererStrategy}
          options={RENDERER_STRATEGIES}
          labels={(value) => ctx.t(`renderer.${value}`)}
          onChange={(value) => prefs.update((draft) => { draft.renderer = { ...(draft.renderer ?? {}), strategy: value as RendererStrategy } })}
        />
        <ToggleRow
          label={ctx.t("settings.reducedMotion")}
          checked={() => prefsValue().renderer?.reducedMotion ?? false}
          onChange={(checked) => prefs.update((draft) => { draft.renderer = { ...(draft.renderer ?? {}), reducedMotion: checked } })}
        />
      </ctx.ui.SettingsSection>

      <ctx.ui.SettingsSection title={ctx.t("settings.widgets")}>
        <ToggleRow
          label={ctx.t("settings.enableWidgets")}
          checked={widgetsEnabled}
          onChange={(checked) => prefs.update((draft) => { draft.widgets = { ...(draft.widgets ?? {}), enabled: checked } })}
        />
      </ctx.ui.SettingsSection>
    </ctx.ui.SettingsLayout>
  )
}
