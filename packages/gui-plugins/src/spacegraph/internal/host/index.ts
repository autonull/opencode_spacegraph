// Internal host module - bundled from @opencode/session-graph
// This replaces the private package dependency

// Core components
export { GraphView } from "./GraphView"
export { GraphDetailSurface } from "./ui/GraphDetail"
export { GraphInspectorPanel } from "./ui/GraphInspectorPanel"
export { GraphInspector } from "./ui/GraphInspector"
export { GraphToolbar } from "./ui/GraphToolbar"
export { GraphCanvasRegion } from "./ui/GraphCanvasRegion"
export { GraphToolbarViewControls } from "./ui/GraphToolbarViewControls"

// Hooks
export { useGraphPermalink } from "./ui/useGraphPermalink"
export { useSpatialMemory } from "./ui/useSpatialMemory"
export { useGraphAnnotations } from "./ui/useGraphAnnotations"
export { useGraphViewport } from "./ui/useGraphViewport"
export { useGraphNavigation } from "./ui/useGraphNavigation"
export { useGraphSelection } from "./ui/useGraphSelection"
export { useGraphState } from "./ui/useGraphState"
export { useGraphDetailMode } from "./ui/useGraphDetailMode"
export { useGroupBadgeAnimation } from "./ui/useGroupBadgeAnimation"
export { useCapabilityFallback } from "./ui/useCapabilityFallback"
export { useDebugMode } from "./ui/useDebugMode"
export { useBudgetCenter } from "./ui/useBudgetCenter"
export { useGeometry } from "./ui/useGeometry"
export { useGraphKeyboard } from "./ui/useGraphKeyboard"
export { useGraphSearch } from "./ui/useGraphSearch"
export { useNotes } from "./ui/useNotes"

// Export utilities
export { buildRenderModel } from "./canvas/buildRenderModel"
export { exportGraph } from "./export"
export { formatProvenance } from "./ui/provenance"
export { text } from "./ui/node-data"
export { DEFAULT_THEME } from "@spacegraphjs/renderer"

// Types
export type { GraphViewData } from "@opencode/session-ui/graph"
export type { GraphNode } from "@opencode/session-ui/graph"
export type { GraphEdge } from "@opencode/session-ui/graph"
export type { GraphLayout } from "@opencode/session-ui/graph"
export type { GraphArrangement } from "@opencode/session-ui/graph"
export type { GraphSide } from "@opencode/session-ui/graph"
export type { ZoomLevel } from "@opencode/session-ui/graph"
export type { DepthMode } from "@opencode/session-ui/graph"
export type { DetailMode } from "@opencode/session-ui/graph"
export type { Layout } from "@opencode/session-ui/graph"
export type { DetailFraming } from "@opencode/session-ui/graph"
export type { Position } from "@opencode/session-ui/graph"
export type { EqualizerRuleSet } from "@opencode/session-ui/graph"