import {
  GRAPH_ARRANGEMENTS,
  GRAPH_SIDES,
  LAYOUTS,
  ZOOM_LEVELS,
  type DepthMode,
  type GraphArrangement,
  type GraphSide,
  type Layout,
  type ZoomLevel,
} from "@opencode/session-ui/graph"
import { DEPTH_MODES, DENSITY_PROFILES, RENDERER_STRATEGIES, type DensityProfile, type RendererStrategy, type BuiltinLensId } from "./index"
import { usePlugin } from "@opencode/plugin/gui"
import definition, { BUILTIN_LENSES } from "./index"
import { createSignal, createMemo } from "solid-js"

interface SpacegraphPrefs {
  level?: ZoomLevel
  layout?: Layout
  depth?: DepthMode
  arrangement?: GraphArrangement
  side?: GraphSide
  detailMode?: "off" | "panel" | "popover" | "window" | "auto"
  lens?: string
  surfaces?: Record<string, {
    layout?: Layout
    depth?: DepthMode
    level?: ZoomLevel
    detailMode?: "off" | "panel" | "popover" | "window" | "auto"
    arrangement?: GraphArrangement
    side?: GraphSide
    files?: boolean
    trace?: "why" | "led-here" | "related" | null
    persist?: boolean
  }>
  density?: { profile?: DensityProfile }
  renderer?: { strategy?: RendererStrategy; reducedMotion?: boolean }
  budgets?: Record<string, unknown>
  widgets?: { enabled?: boolean }
  i18n?: Record<string, string>
  userLenses?: Array<{
    id: string
    name: string
    description: string
    surface: string
    layout?: Layout
    depth?: DepthMode
    level?: ZoomLevel
    detailMode?: "off" | "panel" | "popover" | "window" | "auto"
    arrangement?: GraphArrangement
    side?: GraphSide
    files?: boolean
    trace?: "why" | "led-here" | "related" | null
    widgets?: boolean
    budget?: "overview" | "execution" | "detail"
  }>
}

function next<T>(values: readonly T[], current: T) {
  return values[(values.indexOf(current) + 1) % values.length] ?? current
}

export default function SpacegraphSettings() {
  const ctx = usePlugin<typeof definition>()
  const prefs = ctx.stores.prefs

  // Lens state
  const [editingCustomLens, setEditingCustomLens] = createSignal(false)
  const [customLensName, setCustomLensName] = createSignal("")
  const [customLensDescription, setCustomLensDescription] = createSignal("")

  // Current preferences accessors
  const prefsValue = createMemo(() => prefs.value as SpacegraphPrefs)
  
  const lens = createMemo(() => prefsValue().lens ?? "navigator")
  const level = createMemo(() => (prefsValue().surfaces?.["map"]?.level ?? prefsValue().lens === "reader" ? "overview" : "execution") as ZoomLevel)
  const layout = createMemo(() => (prefsValue().surfaces?.["map"]?.layout ?? "lanes") as Layout)
  const depth = createMemo(() => (prefsValue().surfaces?.["map"]?.depth ?? "flat") as DepthMode)
  const arrangement = createMemo(() => (prefsValue().surfaces?.["hybrid"]?.arrangement ?? "side") as GraphArrangement)
  const side = createMemo(() => (prefsValue().surfaces?.["hybrid"]?.side ?? "end") as GraphSide)
  const densityProfile = createMemo(() => (prefsValue().density?.profile ?? "comfortable") as DensityProfile)
  const rendererStrategy = createMemo(() => (prefsValue().renderer?.strategy ?? "spacegraph") as RendererStrategy)
  const widgetsEnabled = createMemo(() => prefsValue().widgets?.enabled ?? false)

  const levelLabel = (value: ZoomLevel): string => {
    switch (value) {
      case "overview":
        return ctx.t("level.overview")
      case "execution":
        return ctx.t("level.execution")
      case "detail":
        return ctx.t("level.detail")
      default:
        return value satisfies never
    }
  }

  const layoutLabel = (value: Layout): string => {
    switch (value) {
      case "lanes":
        return ctx.t("layout.lanes")
      case "timeline":
        return ctx.t("layout.timeline")
      case "hierarchy":
        return ctx.t("layout.hierarchy")
      case "tree":
        return ctx.t("layout.tree")
      case "force":
        return ctx.t("layout.force")
      case "grid":
        return ctx.t("layout.grid")
      case "circular":
        return ctx.t("layout.circular")
      case "ribbon":
        return ctx.t("layout.ribbon")
      case "matrix":
        return ctx.t("layout.matrix")
      case "log":
        return ctx.t("layout.log")
      default:
        return value satisfies never
    }
  }

  const depthLabel = (value: DepthMode): string => {
    switch (value) {
      case "flat":
        return ctx.t("depth.flat")
      case "layered":
        return ctx.t("depth.layered")
      case "depth-stack":
        return ctx.t("depth.depthStack")
      case "orbit":
        return ctx.t("depth.orbit")
      default:
        return value satisfies never
    }
  }

  const arrangementLabel = (value: GraphArrangement): string => {
    switch (value) {
      case "stacked":
        return ctx.t("arrangement.stacked")
      case "side":
        return ctx.t("arrangement.side")
      case "floating":
        return ctx.t("arrangement.floating")
      default:
        return value satisfies never
    }
  }

  const sideLabel = (value: GraphSide): string => (value === "start" ? ctx.t("side.start") : ctx.t("side.end"))

  const densityLabel = (value: DensityProfile): string => ctx.t(`density.${value}`)

  const rendererLabel = (value: RendererStrategy): string => ctx.t(`renderer.${value}`)

  const Row = (props: { label: string; value: () => string; act: () => void }) => (
    <div class="flex items-center justify-between gap-4">
      <span class="text-13-regular text-text-base">{props.label}</span>
      <ctx.ui.Button onClick={props.act}>{props.value()}</ctx.ui.Button>
    </div>
  )

  const SelectRow = (props: { label: string; value: () => string; options: readonly string[]; labels: (v: string) => string; onChange: (v: string) => void }) => {
    // Cast labels to accept string since the actual type is more specific
    const labels = props.labels as (v: string) => string
    return (
      <div class="flex items-center justify-between gap-4">
        <span class="text-13-regular text-text-base">{props.label}</span>
        <ctx.ui.Select
          label={props.label}
          value={props.value()}
          onChange={props.onChange}
          options={props.options.map((opt) => ({ value: opt, label: labels(opt) }))}
        />
      </div>
    )
  }

  const ToggleRow = (props: { label: string; checked: () => boolean; onChange: (checked: boolean) => void }) => (
    <div class="flex items-center justify-between gap-4">
      <span class="text-13-regular text-text-base">{props.label}</span>
      <ctx.ui.Switch label={props.label} checked={props.checked()} onChange={props.onChange} />
    </div>
  )

  const applyLens = (lensId: BuiltinLensId) => {
    const lensDef = BUILTIN_LENSES.find((l) => l.id === lensId)
    if (!lensDef) return

    prefs.update((draft) => {
      const newSurfaces = { ...(draft.surfaces ?? {}) }
      if (lensDef.surface === "map" || lensDef.surface === "hybrid") {
        newSurfaces["map"] = {
          layout: lensDef.layout,
          depth: lensDef.depth,
          level: lensDef.level,
          detailMode: lensDef.detailMode,
          files: lensDef.files,
          trace: lensDef.trace ?? undefined,
          persist: true,
        }
        if (lensDef.surface === "hybrid") {
          newSurfaces["hybrid"] = {
            layout: lensDef.layout,
            depth: lensDef.depth,
            level: lensDef.level,
            detailMode: lensDef.detailMode,
            files: lensDef.files,
            trace: lensDef.trace ?? undefined,
            persist: true,
          }
        }
      }
      const newRenderer = { ...(draft.renderer ?? {}), strategy: lensDef.widgets ? "spacegraph" : "spacegraph" }
      const newWidgets = { ...(draft.widgets ?? {}), enabled: lensDef.widgets }
      const newDensity = { ...(draft.density ?? {}), profile: "comfortable" }
      
      draft.lens = lensId
      draft.surfaces = newSurfaces
      draft.renderer = newRenderer
      draft.widgets = newWidgets
      draft.density = newDensity
    })
  }

  const cycleLens = (direction: "next" | "prev") => {
    const currentIndex = BUILTIN_LENSES.findIndex((l) => l.id === lens())
    const nextIndex = direction === "next"
      ? (currentIndex + 1) % BUILTIN_LENSES.length
      : (currentIndex - 1 + BUILTIN_LENSES.length) % BUILTIN_LENSES.length
    applyLens(BUILTIN_LENSES[nextIndex].id)
  }

  const resetToDefaultLens = () => {
    applyLens("navigator")
  }

  const saveAsCustomLens = () => {
    if (!customLensName().trim()) return
    prefs.update((draft) => {
      const userLenses = draft.userLenses ?? []
      const existingIndex = userLenses.findIndex((l) => l.id === customLensName())
      const newLens = {
        id: customLensName(),
        name: customLensName(),
        description: customLensDescription() || "Custom lens",
        surface: prefsValue().surfaces?.["map"] ? "map" : "transcript",
        layout: layout(),
        depth: depth(),
        level: level(),
        detailMode: prefsValue().surfaces?.["map"]?.detailMode ?? "panel",
        files: prefsValue().surfaces?.["map"]?.files ?? false,
        trace: prefsValue().surfaces?.["map"]?.trace ?? undefined,
        widgets: widgetsEnabled(),
        budget: level() as "overview" | "execution" | "detail",
      }
      const newUserLenses = existingIndex >= 0 
        ? [...userLenses.slice(0, existingIndex), newLens, ...userLenses.slice(existingIndex + 1)]
        : [...userLenses, newLens]
      
      draft.userLenses = newUserLenses
      draft.lens = customLensName()
    })
    setEditingCustomLens(false)
    setCustomLensName("")
    setCustomLensDescription("")
  }

  const handleLevelChange = () => {
    prefs.update((draft) => {
      const newSurfaces = { ...(draft.surfaces ?? {}) }
      newSurfaces["map"] = { ...(newSurfaces["map"] ?? {}), level: next(ZOOM_LEVELS, level()) }
      draft.surfaces = newSurfaces
    })
  }

  const handleLayoutChange = () => {
    prefs.update((draft) => {
      const newSurfaces = { ...(draft.surfaces ?? {}) }
      newSurfaces["map"] = { ...(newSurfaces["map"] ?? {}), layout: next(LAYOUTS, layout()) }
      draft.surfaces = newSurfaces
    })
  }

  const handleDepthChange = () => {
    prefs.update((draft) => {
      const newSurfaces = { ...(draft.surfaces ?? {}) }
      newSurfaces["map"] = { ...(newSurfaces["map"] ?? {}), depth: next(DEPTH_MODES, depth()) }
      draft.surfaces = newSurfaces
    })
  }

  const handleArrangementChange = () => {
    prefs.update((draft) => {
      const newSurfaces = { ...(draft.surfaces ?? {}) }
      newSurfaces["hybrid"] = { ...(newSurfaces["hybrid"] ?? {}), arrangement: next(GRAPH_ARRANGEMENTS, arrangement()) }
      draft.surfaces = newSurfaces
    })
  }

  const handleSideChange = () => {
    prefs.update((draft) => {
      const newSurfaces = { ...(draft.surfaces ?? {}) }
      newSurfaces["hybrid"] = { ...(newSurfaces["hybrid"] ?? {}), side: next(GRAPH_SIDES, side()) }
      draft.surfaces = newSurfaces
    })
  }

  const handleDensityChange = (v: string) => {
    prefs.update((draft) => {
      draft.density = { ...(draft.density ?? {}), profile: v as DensityProfile }
    })
  }

  const handleRendererChange = (v: string) => {
    prefs.update((draft) => {
      draft.renderer = { ...(draft.renderer ?? {}), strategy: v as RendererStrategy }
    })
  }

  const handleWidgetsChange = (checked: boolean) => {
    prefs.update((draft) => {
      draft.widgets = { ...(draft.widgets ?? {}), enabled: checked }
    })
  }

  const handleReducedMotionChange = (checked: boolean) => {
    prefs.update((draft) => {
      draft.renderer = { ...(draft.renderer ?? {}), reducedMotion: checked }
    })
  }

  return (
    <div class="flex flex-col gap-1" data-slot="spacegraph-settings">
      <p class="mb-3 text-13-regular text-text-weak">{ctx.t("settings.description")}</p>

      {/* Lens Selector */}
      <div class="mb-3">
        <div class="flex items-center justify-between gap-4 mb-2">
          <span class="text-13-regular text-text-base">{ctx.t("settings.lens")}</span>
          <ctx.ui.Button variant="ghost" size="small" onClick={() => cycleLens("prev")}>
            ◀
          </ctx.ui.Button>
          <ctx.ui.Button variant="ghost" size="small" onClick={() => cycleLens("next")}>
            ▶
          </ctx.ui.Button>
        </div>
        <p class="text-12-regular text-text-weak mb-2">{ctx.t("settings.lensDescription")}</p>
        <div class="flex flex-wrap gap-1">
          {BUILTIN_LENSES.map((lensDef) => (
            <ctx.ui.Button
              variant={lens() === lensDef.id ? "contrast" : "ghost"}
              size="small"
              onClick={() => applyLens(lensDef.id)}
              class="text-11-regular"
            >
              {ctx.t(`lens.${lensDef.id}`)}
            </ctx.ui.Button>
          ))}
        </div>
        <div class="flex items-center gap-2 mt-2">
          <ctx.ui.Button variant="ghost" size="small" onClick={resetToDefaultLens}>
            {ctx.t("settings.resetLens")}
          </ctx.ui.Button>
          <ctx.ui.Button variant="ghost" size="small" onClick={() => setEditingCustomLens(true)}>
            {ctx.t("settings.saveAsLens")}
          </ctx.ui.Button>
        </div>

        {editingCustomLens() && (
          <div class="mt-3 flex flex-col gap-2">
            <ctx.ui.TextInput
              label={ctx.t("settings.customLensName")}
              placeholder={ctx.t("settings.customLensName")}
              value={customLensName()}
              onInput={(value) => setCustomLensName(value)}
              class="w-full"
            />
            <ctx.ui.TextInput
              label={ctx.t("settings.customLensDescription")}
              placeholder={ctx.t("settings.customLensDescription")}
              value={customLensDescription()}
              onInput={(value) => setCustomLensDescription(value)}
              class="w-full"
            />
            <div class="flex justify-end gap-2">
              <ctx.ui.Button variant="ghost" size="small" onClick={() => setEditingCustomLens(false)}>
                Cancel
              </ctx.ui.Button>
              <ctx.ui.Button size="small" onClick={saveAsCustomLens}>
                Save
              </ctx.ui.Button>
            </div>
          </div>
        )}
      </div>

      {/* Surface defaults (Map surface) */}
      <div class="mb-3 pt-3 border-t border-border-base">
        <h4 class="text-13-semibold text-text-base mb-2">Map surface defaults</h4>
        <Row
          label={ctx.t("settings.level")}
          value={() => levelLabel(level())}
          act={handleLevelChange}
        />
        <Row
          label={ctx.t("settings.layout")}
          value={() => layoutLabel(layout())}
          act={handleLayoutChange}
        />
        <Row
          label={ctx.t("settings.depth")}
          value={() => depthLabel(depth())}
          act={handleDepthChange}
        />
      </div>

      {/* Hybrid surface defaults */}
      <div class="mb-3 pt-3 border-t border-border-base">
        <h4 class="text-13-semibold text-text-base mb-2">Hybrid surface defaults</h4>
        <Row
          label={ctx.t("settings.arrangement")}
          value={() => arrangementLabel(arrangement())}
          act={handleArrangementChange}
        />
        <Row
          label={ctx.t("settings.side")}
          value={() => sideLabel(side())}
          act={handleSideChange}
        />
      </div>

      {/* Density */}
      <div class="mb-3 pt-3 border-t border-border-base">
        <h4 class="text-13-semibold text-text-base mb-2">{ctx.t("settings.density")}</h4>
        <SelectRow
          label={ctx.t("settings.density")}
          value={() => densityProfile()}
          options={DENSITY_PROFILES}
          labels={densityLabel as (v: string) => string}
          onChange={handleDensityChange}
        />
      </div>

      {/* Renderer */}
      <div class="mb-3 pt-3 border-t border-border-base">
        <h4 class="text-13-semibold text-text-base mb-2">{ctx.t("settings.renderer")}</h4>
        <SelectRow
          label={ctx.t("settings.renderer")}
          value={() => rendererStrategy()}
          options={RENDERER_STRATEGIES}
          labels={rendererLabel as (v: string) => string}
          onChange={handleRendererChange}
        />
        <ToggleRow
          label="Reduced motion"
          checked={() => prefsValue().renderer?.reducedMotion ?? false}
          onChange={handleReducedMotionChange}
        />
      </div>

      {/* Widgets */}
      <div class="mb-3 pt-3 border-t border-border-base">
        <h4 class="text-13-semibold text-text-base mb-2">{ctx.t("settings.widgets")}</h4>
        <ToggleRow
          label="Enable node widgets"
          checked={widgetsEnabled}
          onChange={handleWidgetsChange}
        />
      </div>
    </div>
  )
}