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

export { GraphBreadcrumbs, type GraphBreadcrumbsProps } from "./ui/GraphBreadcrumbs"
export { GraphInspector, type GraphInspectorProps } from "./ui/GraphInspector"
export { GraphSearch, type GraphSearchProps } from "./ui/GraphSearch"
export { GraphToolbar, type GraphToolbarProps } from "./ui/GraphToolbar"
export { GraphView, type GraphViewProps } from "./ui/GraphView"
export { createGraphTheme, graphThemeFromTokens, resolveGraphTheme } from "./ui/theme"
