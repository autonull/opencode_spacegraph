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
import { usePlugin } from "@opencode/plugin/gui"
import definition, { DEPTH_MODES } from "./index"

const RENDERERS = ["spacegraph", "cytoscape"] as const

function next<T>(values: readonly T[], current: T) {
  return values[(values.indexOf(current) + 1) % values.length] ?? current
}

export default function SpacegraphSettings() {
  const ctx = usePlugin<typeof definition>()
  const prefs = ctx.stores.prefs

  const level = () => prefs.value.level ?? "overview"
  const layout = () => prefs.value.layout ?? "lanes"
  const depth = () => prefs.value.depth ?? "flat"
  const arrangement = () => prefs.value.arrangement ?? "side"
  const side = () => prefs.value.side ?? "end"
  const renderer = () => (prefs.value.renderer ?? "spacegraph") as "spacegraph" | "cytoscape"

  const levelLabel = (value: ZoomLevel) => {
    switch (value) {
      case "overview":
        return ctx.t("level.overview")
      case "execution":
        return ctx.t("level.execution")
      case "detail":
        return ctx.t("level.detail")
    }
  }

  const layoutLabel = (value: Layout) => {
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
      case "ribbon":
        return ctx.t("layout.ribbon")
      case "matrix":
        return ctx.t("layout.matrix")
      case "log":
        return ctx.t("layout.log")
    }
  }

  const depthLabel = (value: DepthMode) => {
    switch (value) {
      case "flat":
        return ctx.t("depth.flat")
      case "layered":
        return ctx.t("depth.layered")
      case "depth-stack":
        return ctx.t("depth.depthStack")
      case "orbit":
        return ctx.t("depth.orbit")
    }
  }

  const arrangementLabel = (value: GraphArrangement) => {
    switch (value) {
      case "stacked":
        return ctx.t("arrangement.stacked")
      case "side":
        return ctx.t("arrangement.side")
      case "floating":
        return ctx.t("arrangement.floating")
    }
  }

  const sideLabel = (value: GraphSide) => (value === "start" ? ctx.t("side.start") : ctx.t("side.end"))

  const rendererLabel = (value: string) => (value === "spacegraph" ? ctx.t("renderer.spacegraph") : ctx.t("renderer.cytoscape"))

  const Row = (props: { label: string; value: () => string; act: () => void }) => (
    <div class="flex items-center justify-between gap-4">
      <span class="text-13-regular text-text-base">{props.label}</span>
      <ctx.ui.Button onClick={props.act}>{props.value()}</ctx.ui.Button>
    </div>
  )

  return (
    <div class="flex flex-col gap-1" data-slot="spacegraph-settings">
      <p class="mb-3 text-13-regular text-text-weak">{ctx.t("settings.description")}</p>
      <Row
        label={ctx.t("settings.level")}
        value={() => levelLabel(level())}
        act={() =>
          prefs.update((draft) => {
            draft.level = next(ZOOM_LEVELS, level())
          })
        }
      />
      <Row
        label={ctx.t("settings.layout")}
        value={() => layoutLabel(layout())}
        act={() =>
          prefs.update((draft) => {
            draft.layout = next(LAYOUTS, layout())
          })
        }
      />
      <Row
        label={ctx.t("settings.depth")}
        value={() => depthLabel(depth())}
        act={() =>
          prefs.update((draft) => {
            draft.depth = next(DEPTH_MODES, depth())
          })
        }
      />
      <Row
        label={ctx.t("settings.arrangement")}
        value={() => arrangementLabel(arrangement())}
        act={() =>
          prefs.update((draft) => {
            draft.arrangement = next(GRAPH_ARRANGEMENTS, arrangement())
          })
        }
      />
      <Row
        label={ctx.t("settings.side")}
        value={() => sideLabel(side())}
        act={() =>
          prefs.update((draft) => {
            draft.side = next(GRAPH_SIDES, side())
          })
        }
      />
      <Row
        label={ctx.t("settings.renderer")}
        value={() => rendererLabel(renderer())}
        act={() =>
          prefs.update((draft) => {
            draft.renderer = next(RENDERERS, renderer())
          })
        }
      />
    </div>
  )
}
