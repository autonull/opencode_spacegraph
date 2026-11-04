import { buildRenderModel as buildBaseRenderModel, type CardTemplate, type BandTemplate } from "./buildRenderModel"
import { applyNodeBudget, byProximity, degreeBudget, type GraphViewData } from "@opencode/session-ui/graph"
import type { RenderModel } from "@spacegraphjs/renderer"
import { createMemo, type Accessor } from "solid-js"
import { laneAnchors, type Lane } from "@opencode/session-ui/graph"
import { sessionOrder, isSummaryOrLogLayout, type Layout } from "@opencode/session-ui/graph"

/**
 * Builds the render model for the canvas, applying card budget, manual layout overrides,
 * and edge filtering.
 */
export interface BuildRenderModelOptions {
  model: Accessor<GraphViewData>
  layout: Accessor<Layout>
  level: Accessor<"overview" | "execution" | "detail">
  files: Accessor<boolean>
  displayPositions: Accessor<ReadonlyMap<string, { x: number; y: number; z: number }>>
  budget: Accessor<GraphViewData | undefined>
  renderCard: Accessor<CardTemplate | undefined>
  renderBand: Accessor<BandTemplate | undefined>
  axisLabels: Accessor<Array<{ id: string; label: string; x: number; y: number; role: "row" | "column" }> | undefined>
  windowAnchor: Accessor<string | undefined>
  i18n: Accessor<{ t: (key: string) => string }>
  vocabularyKeys: Accessor<{ lane: Record<Lane, string> }>
  manualPositions: Record<string, [number, number, number]>
  manualSizes: Record<string, [number, number]>
  hiddenEdgeKinds: Accessor<ReadonlySet<string>>
}

/**
 * Builds the complete render model with all options applied.
 */
export function createRenderModelBuilder(options: BuildRenderModelOptions) {
  return createMemo((): RenderModel => {
    const {
      layout,
      level,
      files,
      displayPositions,
      budget,
      renderCard,
      renderBand,
      axisLabels,
      windowAnchor,
      i18n,
      vocabularyKeys,
      manualPositions,
      manualSizes,
      hiddenEdgeKinds,
    } = options

    const currentLayout = layout()
    const currentLevel = level()
    const isSummary = isSummaryOrLogLayout(currentLayout)

    // Use budgeted model for all layouts; adapter handles layout-aware node filtering
    const modelForAdapter = budget() ?? { root: "session", nodes: [], edges: [], turns: [], turnByMessageID: new Map() }

    const baseModel = buildBaseRenderModel(modelForAdapter, {
      level: currentLevel,
      positions: displayPositions(),
      bands: !isSummary && currentLayout !== "hierarchy",
      edges: !isSummary,
      bundle: !isSummary && files(),
      layout: currentLayout, // Pass layout to adapter for node filtering
      laneLabels:
        !isSummary && currentLayout === "lanes"
          ? laneAnchors().map((lane) => ({
              id: lane.name,
              label: i18n().t(vocabularyKeys().lane[lane.name]),
              y: lane.y,
              anchorNodeId: windowAnchor(),
            }))
          : undefined,
      axisLabels: axisLabels(),
      renderCard: renderCard(),
      renderBand: renderBand(),
    })

    // Apply manual layout overrides
    const withManual = applyManualLayout(baseModel, manualPositions, manualSizes)

    // Filter hidden edge kinds
    if (hiddenEdgeKinds().size === 0) return withManual

    return {
      ...withManual,
      edges: withManual.edges.filter((edge) => !hiddenEdgeKinds().has(edge.kind)),
    }
  })
}

/**
 * Applies manual position and size overrides to a render model.
 */
function applyManualLayout(
  model: RenderModel,
  manualPositions: Record<string, [number, number, number]>,
  manualSizes: Record<string, [number, number]>,
): RenderModel {
  if (Object.keys(manualSizes).length === 0 && Object.keys(manualPositions).length === 0) return model

  return {
    ...model,
    nodes: model.nodes.map((node) => {
      const size = manualSizes[node.id]
      const position = manualPositions[node.id]
      if (!size && !position) return node
      return {
        ...node,
        ...(size ? { size: [size[0], size[1], node.size?.[2] ?? 0] } : {}),
        ...(position ? { position } : {}),
      }
    }),
  }
}

/**
 * Creates the content IDs for the viewport tracker (excludes bands).
 */
export function createContentIDs(
  renderModel: Accessor<RenderModel>,
  budget: Accessor<GraphViewData | undefined>,
  drawn: Accessor<GraphViewData>,
  model: Accessor<GraphViewData>,
): Accessor<string[]> {
  return createMemo(() => {
    const rm = renderModel()
    const ids = rm?.nodes?.filter((node) => node.kind !== "band").map((node) => node.id) ?? []

    const budgeted = budget()
    const d = drawn()
    const m = model()
    const budgetedNodes = budgeted?.nodes ?? []
    return budgetedNodes.length < (d?.nodes?.length ?? 0) ? ids.filter((id) => id !== m?.root) : ids
  })
}

/**
 * Creates the ordered render model for screen readers and export.
 */
export function createOrderedModel(
  renderModel: Accessor<RenderModel>,
  drawn: Accessor<GraphViewData>,
): Accessor<RenderModel> {
  return createMemo(() => {
    const model = renderModel() ?? { nodes: [], edges: [], bands: [], laneLabels: [], axisLabels: [] }
    const order = sessionOrder(drawn())
    return {
      ...model,
      nodes: [...model.nodes].sort(
        (a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      ),
    }
  })
}

/**
 * Creates the budgeted model for the card budget.
 */
export function createBudgetedModel(
  drawn: Accessor<GraphViewData>,
  displayPositions: Accessor<ReadonlyMap<string, { x: number; y: number; z: number }>>,
  selection: Accessor<readonly string[]>,
  resting: Accessor<{ x: number; y: number; z: number } | undefined>,
): Accessor<GraphViewData | undefined> {
  return createMemo(() => {
    const current = drawn()
    const centre = resting()
    const ordered = centre ? byProximity(current, displayPositions(), [centre.x, centre.y, centre.z]) : current
    return applyNodeBudget(ordered, degreeBudget(current, selection()))
  })
}

/**
 * Creates the drawn model (filtered for summary/log layouts).
 */
export function createDrawnModel(
  scoped: Accessor<GraphViewData>,
  layout: Accessor<Layout>,
  level: Accessor<"overview" | "execution" | "detail">,
): Accessor<GraphViewData> {
  return createMemo(() => {
    const current = scoped()
    if (!isSummaryOrLogLayout(layout())) return current
    const units = summaryUnits(current, level())
    return {
      ...current,
      nodes: current.nodes?.filter((node) => units.has(node.id)) ?? [],
    }
  })
}