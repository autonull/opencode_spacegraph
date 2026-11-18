import { ConfigSpace, ConfigState, negotiate } from "@spacegraphjs/config"
import { describe, expect, test } from "bun:test"
import { DETAIL_MODES, DETAIL_TIERS, EQUALIZER_PRESETS, LAYOUTS, ZOOM_LEVELS } from "../model"
import { GRAPH_OPTION_AXES, GRAPH_OPTION_KEYS, graphOptionSet, hostManifestEntries } from "./host-manifest"
import { LENS_GOALS } from "./lensGoals"
import { BUILTIN_LENS_IDS, DEPTH_MODES, DENSITY_PROFILES, RENDERER_STRATEGIES } from "./options"

const entries = hostManifestEntries()
const values = (axis: string) => entries.find((entry) => entry.id === axis)?.values

describe("plugin capability manifest", () => {
  test("lists every plugin registry value", () => {
    expect(values("lensGoal")).toEqual([...new Set(LENS_GOALS.map((goal) => goal.lensId))])
    expect(values("lens")).toEqual([...BUILTIN_LENS_IDS])
    expect(values("detailMode")).toEqual([...DETAIL_MODES])
    expect(values("detailTier")).toEqual([...DETAIL_TIERS])
    expect(values("layout")).toEqual([...LAYOUTS])
    expect(values("zoomLevel")).toEqual([...ZOOM_LEVELS])
    expect(values("density")).toEqual([...DENSITY_PROFILES])
    expect(values("depth")).toEqual([...DEPTH_MODES])
    expect(values("rendererStrategy")).toEqual([...RENDERER_STRATEGIES])
    expect(values("equalizerPreset")).toEqual(EQUALIZER_PRESETS.map((preset) => preset.id))
  })

  test("maps only options the plugin declares", () => {
    for (const key of Object.keys(GRAPH_OPTION_AXES)) {
      expect(GRAPH_OPTION_KEYS).toContain(key)
    }
  })

  test("gates values by option and degrades to the first available value", () => {
    const space = new ConfigSpace(entries)
    const requested = ConfigState.from(space, {
      layout: "grid",
      timeMode: "checkpoint",
      lensGoal: "auditor",
    })
    const disabled = negotiate(space, requested, { flags: graphOptionSet({ enabled: () => false }) })
    expect(disabled.state.get("layout")).toBe(LAYOUTS[0])
    expect(disabled.state.get("timeMode")).toBe("live")
    expect(disabled.axes.find((axis) => axis.axis === "lensGoal")?.status).toBe("degraded-to")

    const enabled = negotiate(space, requested, {
      flags: graphOptionSet({ enabled: () => true, allOptions: true }),
    })
    expect(enabled.state.get("layout")).toBe("grid")
    expect(enabled.state.get("timeMode")).toBe("checkpoint")
    expect(enabled.axes.every((axis) => axis.status === "supported")).toBe(true)
  })
})
