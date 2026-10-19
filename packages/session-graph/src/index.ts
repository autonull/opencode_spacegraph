export const PACKAGE = "@opencode/session-graph"

export {
  buildRenderModel,
  escapeHtml,
  type BuildRenderModelOptions,
  type CardTemplate,
} from "./canvas/buildRenderModel"

export {
  createRenderer,
  mountRenderer,
  rendererOrder,
  type MountedRenderer,
  type RendererFactory,
  type RendererID,
} from "./canvas/renderer-registry"

export { GraphCanvas, type GraphCanvasProps, type GraphCanvasReady } from "./canvas/GraphCanvas"

export { GraphA11y, type GraphA11yProps } from "./ui/GraphA11y"
export { GraphBreadcrumbs, type GraphBreadcrumbsProps } from "./ui/GraphBreadcrumbs"
export { GraphDiffView, type GraphDiff, type GraphDiffSource } from "./ui/GraphDiff"
export { GraphFileRail, type GraphFileRailProps } from "./ui/GraphFileRail"
export { GraphInspector, type GraphInspectorProps } from "./ui/GraphInspector"
export { GraphSearch, type GraphSearchProps } from "./ui/GraphSearch"
export { GraphToolbar, type GraphToolbarProps } from "./ui/GraphToolbar"
export { GraphView, type GraphViewProps } from "./ui/GraphView"
export { TurnMapInlineGraph, type TurnMapInlineGraphProps } from "./ui/TurnMapInlineGraph"
export { TurnMapOverlay, type TurnMapOverlayProps } from "./ui/TurnMapOverlay"
export { buildTurnRenderModel, turnGraphModel } from "./ui/turnMap"
export { createGraphTheme, graphThemeFromTokens, resolveGraphTheme } from "./ui/theme"
