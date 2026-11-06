import {
  computeIncremental,
  layoutGraph,
  type GraphLayout,
  type IncrementalLayout,
  type LayoutOptions,
  type LayoutStrategy,
  type Position,
} from "@opencode/session-ui/graph"
import type { GraphViewData, GraphNode, Layout } from "@opencode/session-ui/graph"
import { nodeSize } from "@opencode/session-ui/graph"
import { equalizerScale, type EqualizerRuleSet } from "@opencode/session-ui/graph"
import { createMemo, type Accessor } from "solid-js"

/**
 * Computes the graph layout for the current model, level, layout strategy, and rules.
 * Handles layout history for incremental updates (tree/force strategies).
 */
export function createLayoutComputer(
  model: Accessor<GraphViewData>,
  layout: Accessor<Layout>,
  level: Accessor<"overview" | "execution" | "detail">,
  rules: Accessor<EqualizerRuleSet | undefined>,
  sessionKey: Accessor<string>,
): Accessor<GraphLayout> {
  const layoutHistory = new Map<string, ReadonlyMap<string, Position>>()

  const sizedCard = (node: GraphNode): readonly [number, number] => {
    const [width, height] = nodeSize(node)
    const scale = equalizerScale(rules() ?? [], node)
    return scale === 1 ? [width, height] : [width * scale, height * scale]
  }

  const rulesKey = createMemo(() => JSON.stringify(rules() ?? []))

  return createMemo((): GraphLayout => {
    const current = layout()
    const currentLevel = level()
    const key = `${sessionKey()}:${current}:${currentLevel}:${rulesKey()}`

    if (current === "ribbon") return { positions: new Map(), clusters: new Map(), bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }, strategy: "lanes" }
    if (current === "matrix") return { positions: new Map(), clusters: new Map(), bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }, strategy: "lanes" }
    if (current === "log") return { positions: new Map(), clusters: new Map(), bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }, strategy: "lanes" }

    const next = layoutGraph(model(), {
      strategy: current as LayoutStrategy,
      level: currentLevel,
      previous: layoutHistory.get(key),
      nodeSizeFn: sizedCard,
      laneGap: 40,
    })

    layoutHistory.set(key, next.positions)

    return next
  })
}

/**
 * Computes incremental layout changes for streaming updates.
 */
export function createIncrementalLayout(
  model: Accessor<GraphViewData>,
  previousLayout: Accessor<GraphLayout | ReadonlyMap<string, Position> | undefined>,
  options: LayoutOptions = {},
): Accessor<IncrementalLayout> {
  return createMemo(() => computeIncremental(model(), previousLayout(), options))
}