import { createMemo, type Accessor } from "solid-js"
import type { RenderModel } from "@spacegraphjs/renderer"
import type { GraphViewData, Position, ZoomLevel, Layout } from "@opencode/session-ui/graph"
import { createRenderModelBuilder, createContentIDs, createOrderedModel } from "../canvas/buildRenderModelHelpers"
import type { UseEdgeKindsReturn } from "./useEdgeKinds"
import type { CardTemplate } from "../canvas/buildRenderModel"
import { buildAxisLabels } from "./axisLabels"
import { VOCABULARY_KEYS } from "@opencode/session-ui/graph"

export type UseRenderModelOptions = {
  model: Accessor<GraphViewData>
  layout: Accessor<Layout>
  level: Accessor<ZoomLevel>
  files: Accessor<boolean>
  displayPositions: Accessor<ReadonlyMap<string, Position>>
  budget: Accessor<GraphViewData | undefined>
  renderCard: Accessor<CardTemplate>
  renderBand: Accessor<ReturnType<typeof import("./cardTemplate").createBandTemplate>>
  axisLabels: Accessor<ReturnType<typeof buildAxisLabels>>
  windowAnchor: Accessor<string | undefined>
  i18n: { t: (key: string) => string }
  manualPositions: Record<string, [number, number, number]>
  manualSizes: Record<string, [number, number]>
  hiddenEdgeKinds: UseEdgeKindsReturn["hiddenEdgeKinds"]
  drawn: Accessor<GraphViewData>
}

export type UseRenderModelReturn = {
  renderModel: Accessor<RenderModel>
  contentIDs: Accessor<string[]>
  ordered: Accessor<RenderModel>
  drawn: Accessor<GraphViewData>
}

export function useRenderModel(options: UseRenderModelOptions): UseRenderModelReturn {
  const {
    model,
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
    manualPositions,
    manualSizes,
    hiddenEdgeKinds,
    drawn,
  } = options

  const renderModelBuilder = createRenderModelBuilder({
    model,
    layout,
    level,
    files,
    displayPositions,
    budget,
    renderCard,
    renderBand,
    axisLabels,
    windowAnchor,
    i18n: createMemo(() => ({ t: (key: string) => i18n.t(key) })),
    vocabularyKeys: createMemo(() => VOCABULARY_KEYS),
    manualPositions,
    manualSizes,
    hiddenEdgeKinds,
  })

  const renderModel = renderModelBuilder

  const contentIDs = createContentIDs(renderModel, budget, drawn, model)

  const ordered = createOrderedModel(renderModel, drawn, contentIDs)

  return {
    renderModel,
    contentIDs,
    ordered,
    drawn,
  }
}