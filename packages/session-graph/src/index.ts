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
