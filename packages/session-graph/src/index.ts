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

// Re-exports from @spacegraphjs/a11y
export { GraphA11y, type GraphA11yProps } from "@spacegraphjs/a11y"
export { AccessibilityLayer, type AccessibilityLayerConfig } from "@spacegraphjs/a11y"

// Re-exports from @spacegraphjs/navigation
export { GraphBreadcrumbs, type GraphBreadcrumb, type GraphBreadcrumbsProps } from "@spacegraphjs/navigation"
export { GraphMinimap, type GraphMinimapProps, MINIMAP_SIZE, MINIMAP_GAP } from "@spacegraphjs/navigation"
export { GraphLegend, type GraphLegendProps } from "@spacegraphjs/navigation"
export { GraphLegendBody, type GraphLegendBodyProps } from "@spacegraphjs/navigation"
export { GraphIconButton, type GraphIconButtonProps } from "@spacegraphjs/navigation"
export { kindAccent, categoryAccent, statusAccent, formatAge, sourceLabel, CONFIDENCE_STYLE } from "@spacegraphjs/navigation"

// Re-exports from @spacegraphjs/diff
export { GraphDiffView, type GraphDiffViewProps } from "@spacegraphjs/diff"
export { diffTone, type DiffTone, TONE_CLASS, type GraphDiff, type GraphDiffSource } from "@spacegraphjs/diff"

export { GraphFileRail, type GraphFileRailProps } from "./ui/GraphFileRail"
export { GraphInspector, type GraphInspectorProps } from "./ui/GraphInspector"

// Re-exports from @spacegraphjs/search
export { GraphFind, type GraphFindProps } from "@spacegraphjs/search"
export { GraphSearch, type GraphSearchProps } from "@spacegraphjs/search"
export {
  navigationResults,
  navigationHelp,
  navigationTargets,
  parseNavigation,
  nextNavigationTarget,
  type NavigationMnemonic,
} from "@spacegraphjs/search"
export {
  rankedSearch,
  sessionOutline,
  facetCounts,
  search,
  searchBy,
  defaultRank,
  defaultSearchText,
  type SearchFn,
  type SearchTextFn,
  type OutlineTurn,
} from "@spacegraphjs/search"
export { useSearch, useFind, type UseSearchOptions, type UseSearchReturn, type UseFindOptions, type UseFindReturn } from "@spacegraphjs/search"

// Re-exports from @spacegraphjs/toolbar
export { GraphToolbar, type GraphToolbarProps } from "@spacegraphjs/toolbar"
export { GraphLayersControl, type GraphLayersControlProps } from "@spacegraphjs/toolbar"
export { GraphLayoutControl, type GraphLayoutControlProps } from "@spacegraphjs/toolbar"
export { GraphTimeControl, type GraphTimeControlProps } from "@spacegraphjs/toolbar"
export { GraphDrawControl, type GraphDrawControlProps } from "@spacegraphjs/toolbar"
export { GraphShowControl, type GraphShowControlProps } from "@spacegraphjs/toolbar"
export { GraphZoomControl, type GraphZoomControlProps } from "@spacegraphjs/toolbar"
export { GraphQuestionsControl, type GraphQuestionsControlProps } from "@spacegraphjs/toolbar"
export { ToolbarMenu, type ToolbarMenuProps } from "@spacegraphjs/toolbar"
export { useToolbarState } from "@spacegraphjs/toolbar"

export { GraphView } from "./ui/GraphView"
export { SessionGraph, type SessionGraphProps, MIN_CARD_HEIGHT_PX, READABLE_CARD_WIDTH } from "./ui/SessionGraph"

// Re-exports from @spacegraphjs/turn-map
export { TurnMapInlineGraph, type TurnMapInlineGraphProps } from "@spacegraphjs/turn-map"
export { TurnMapOverlay, type TurnMapOverlayProps } from "@spacegraphjs/turn-map"
export { buildTurnRenderModel, turnGraphModel } from "@spacegraphjs/turn-map"

export { GraphPreview, type GraphPreviewProps, GraphInline, type GraphInlineProps } from "./ui/GraphInline"

export { createGraphTheme, graphThemeFromTokens, resolveGraphTheme } from "./ui/theme"

// Re-exports from @spacegraphjs/export
export { GraphExportControl, type GraphExportControlProps } from "@spacegraphjs/export"
export { GraphToolbarViewControls, type GraphToolbarViewControlsProps } from "./ui/GraphToolbarViewControls"
export { exportGraph, standaloneHtml, type ExportFormat, type ExportOptions } from "@spacegraphjs/export"

export {
  text,
  count,
  flag,
  strings,
  noteData,
  fileCount,
  touchedCount,
  isTouched,
  childSessionID,
  forkedFrom,
  parentSessionID,
  filePath,
  fileRange,
  sessionID,
} from "./ui/node-data"
export { GraphLineage } from "./ui/GraphLineage"
export { formatProvenance } from "./ui/provenance"

// Re-exports from @spacegraphjs/overlays
export { GraphPeek, type GraphPeekProps } from "@spacegraphjs/overlays"
export { GraphPopover, type GraphPopoverProps, POPOVER_WIDTH, POPOVER_MAX_HEIGHT, POPOVER_GAP } from "@spacegraphjs/overlays"
export { GraphOverlayManager, type GraphOverlayManagerProps } from "@spacegraphjs/overlays"
export { ScopedOverlay, type ScopedOverlayOptions } from "@spacegraphjs/overlays"
// GraphDetailProps is defined locally in ui/GraphDetail.tsx with trace extensions
export { type GraphDetailSurfaceProps } from "@spacegraphjs/overlays"

// Re-exports from @spacegraphjs/controls
export { GraphStatusBar, type GraphStatusBarProps } from "@spacegraphjs/controls"

// Re-exports from @spacegraphjs/compare
export { GraphCompare, type GraphCompareProps, type GraphCompareChanges } from "@spacegraphjs/compare"
export { GraphCompareBar, type GraphCompareBarProps } from "@spacegraphjs/compare"

export { DEFAULT_THEME } from "@spacegraphjs/renderer"

export { ComposerNodeWidget, type ComposerNodeWidgetProps } from "./ui/ComposerNodeWidget"
export { TodoNodeWidget, type TodoNodeWidgetProps } from "./ui/TodoNodeWidget"
export { TerminalNodeWidget, type TerminalNodeWidgetProps } from "./ui/TerminalNodeWidget"
export { DiffNodeWidget, type DiffNodeWidgetProps, type DiffFileStat } from "./ui/DiffNodeWidget"
export { SubagentNodeWidget, type SubagentNodeWidgetProps } from "./ui/SubagentNodeWidget"

// Adapters
export * from "./adapters/spacegraphjs"