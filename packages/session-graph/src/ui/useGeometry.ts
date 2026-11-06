import { createMemo } from "solid-js"
import type { GraphViewData, GraphLayout, Position, Layout, EqualizerRuleSet } from "@opencode/session-ui/graph"
import { ribbonLayout, matrixLayout, logLayout } from "@opencode/session-ui/graph"
import { createLayoutComputer } from "../canvas/computeLayout"
import { nodeIndex } from "@opencode/session-ui/graph"
import { sessionID } from "./node-data"

export function useGeometry(
  model: () => GraphViewData,
  layout: () => Layout,
  level: () => import("@opencode/session-ui/graph").ZoomLevel,
  rules: () => EqualizerRuleSet | undefined,
  scoped: () => GraphViewData,
  positions?: ReadonlyMap<string, Position>,
  sessionKey?: () => string,
) {
  const sessionKeyMemo = sessionKey ?? createMemo(() => {
    const root = nodeIndex(model()).get(model().root)
    return root ? sessionID(root) ?? "session" : "session"
  })

  const layoutComputer = createLayoutComputer(model, layout, level, rules, sessionKeyMemo)

  return createMemo((): GraphLayout => {
    if (positions)
      return {
        positions,
        clusters: new Map(),
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
        strategy: "lanes",
      }

    const current = layout()

    if (current === "ribbon") return ribbonLayout(scoped(), { level: level() })
    if (current === "matrix") return matrixLayout(scoped(), { level: level() })
    if (current === "log") return logLayout(scoped(), { level: level() })

    return layoutComputer()
  })
}