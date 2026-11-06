/**
 * @opencode/session-graph - SpaceGraphJS component adapters (refactored with HOCs)
 * Wraps generic SpaceGraphJS components with OpenCode i18n and UI integrations.
 */

import type { I18n } from "@spacegraphjs/shared"
import { useI18n } from "@opencode/ui/context/i18n"

// Import SpaceGraphJS components
import {
  GraphToolbar,
  GraphLayersControl,
  GraphLayoutControl,
  GraphTimeControl,
  GraphDrawControl,
  GraphShowControl,
  GraphZoomControl,
  GraphQuestionsControl,
} from "@spacegraphjs/toolbar"
import { GraphSearch, GraphFind } from "@spacegraphjs/search"
import { GraphBreadcrumbs, GraphMinimap, GraphLegend } from "@spacegraphjs/navigation"
import { GraphA11y } from "@spacegraphjs/a11y"
import { GraphDiffView } from "@spacegraphjs/diff"
import { GraphPeek, GraphPopover, GraphOverlayManager } from "@spacegraphjs/overlays"
import { GraphStatusBar } from "@spacegraphjs/controls"
import { GraphCompare, GraphCompareBar } from "@spacegraphjs/compare"
import { TurnMapInlineGraph, TurnMapOverlay } from "@spacegraphjs/turn-map"
import { GraphExportControl } from "@spacegraphjs/export"

// Import SpaceGraphJS prop types
import type {
  GraphToolbarProps,
  GraphLayersControlProps,
  GraphLayoutControlProps,
  GraphTimeControlProps,
  GraphDrawControlProps,
  GraphShowControlProps,
  GraphZoomControlProps,
  GraphQuestionsControlProps,
} from "@spacegraphjs/toolbar"
import type {
  GraphSearchProps,
  GraphFindProps,
} from "@spacegraphjs/search"
import type {
  GraphBreadcrumbsProps,
  GraphMinimapProps,
  GraphLegendProps,
} from "@spacegraphjs/navigation"
import type { GraphA11yProps } from "@spacegraphjs/a11y"
import type { GraphDiffViewProps } from "@spacegraphjs/diff"
import type {
  GraphPeekProps,
  GraphPopoverProps,
  GraphOverlayManagerProps,
} from "@spacegraphjs/overlays"
import type { GraphStatusBarProps } from "@spacegraphjs/controls"
import type {
  GraphCompareProps,
  GraphCompareBarProps,
} from "@spacegraphjs/compare"
import type {
  TurnMapInlineGraphProps,
  TurnMapOverlayProps,
} from "@spacegraphjs/turn-map"
import type { GraphExportControlProps } from "@spacegraphjs/export"

// Import from session-ui for type conversion
import { NODE_KINDS, NODE_STATUSES, DOMAINS } from "@opencode/session-ui/graph"
import { createI18nAdapter, toSGJSViewData } from "./spacegraphjs"
import {
  createToolbarAdapter,
  createControlAdapter,
  createOverlayAdapter,
  createSearchAdapter,
  createExportAdapter,
  createSimpleAdapter,
  renderIcon,
  PopoverComponentImpl,
} from "./spacegraphjs-hoc"

// ============ Toolbar Adapters ============

/** Adapter props for GraphToolbar - adds OpenCode i18n. */
export interface GraphToolbarAdapterProps
  extends Omit<GraphToolbarProps, "i18n" | "Icon" | "Popover" | "model"> {
  /** OpenCode i18n context (injected via useI18n). */
  i18n?: ReturnType<typeof useI18n>
  /** Session-ui GraphViewData (will be converted to spacegraphjs type). */
  model?: import("@opencode/session-ui/graph").GraphViewData
}

/** Wraps @spacegraphjs/toolbar GraphToolbar with OpenCode i18n. */
export const GraphToolbarAdapter = createToolbarAdapter<GraphToolbarProps>(GraphToolbar)

/** Adapter for GraphLayersControl. */
export interface GraphLayersControlAdapterProps
  extends Omit<GraphLayersControlProps, "i18n" | "Icon" | "Popover" | "model"> {
  i18n?: ReturnType<typeof useI18n>
  model?: import("@opencode/session-ui/graph").GraphViewData
}

export const GraphLayersControlAdapter = createToolbarAdapter<GraphLayersControlProps>(
  GraphLayersControl,
)

/** Adapter for GraphLayoutControl. */
export interface GraphLayoutControlAdapterProps
  extends Omit<GraphLayoutControlProps, "i18n" | "Icon" | "Popover"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphLayoutControlAdapter = createControlAdapter<GraphLayoutControlProps>(
  GraphLayoutControl,
)

/** Adapter for GraphTimeControl. */
export interface GraphTimeControlAdapterProps
  extends Omit<GraphTimeControlProps, "i18n" | "Icon" | "Popover" | "model"> {
  i18n?: ReturnType<typeof useI18n>
  model?: import("@opencode/session-ui/graph").GraphViewData
}

export const GraphTimeControlAdapter = createToolbarAdapter<GraphTimeControlProps>(
  GraphTimeControl,
)

/** Adapter for GraphDrawControl. */
export interface GraphDrawControlAdapterProps
  extends Omit<GraphDrawControlProps, "i18n" | "Icon" | "Popover"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphDrawControlAdapter = createControlAdapter<GraphDrawControlProps>(
  GraphDrawControl,
)

/** Adapter for GraphShowControl. */
export interface GraphShowControlAdapterProps
  extends Omit<GraphShowControlProps, "i18n" | "Icon" | "Popover" | "model"> {
  i18n?: ReturnType<typeof useI18n>
  model?: import("@opencode/session-ui/graph").GraphViewData
}

export const GraphShowControlAdapter = createToolbarAdapter<GraphShowControlProps>(
  GraphShowControl,
)

/** Adapter for GraphZoomControl. */
export interface GraphZoomControlAdapterProps
  extends Omit<GraphZoomControlProps, "i18n" | "Icon"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphZoomControlAdapter = createControlAdapter<GraphZoomControlProps>(
  GraphZoomControl,
)

/** Adapter for GraphQuestionsControl. */
export interface GraphQuestionsControlAdapterProps
  extends Omit<GraphQuestionsControlProps, "i18n" | "Icon" | "Popover"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphQuestionsControlAdapter = createControlAdapter<GraphQuestionsControlProps>(
  GraphQuestionsControl,
)

// ============ Search Adapters ============

/** Adapter for GraphSearch. */
export interface GraphSearchAdapterProps
  extends Omit<GraphSearchProps, "t" | "plural" | "Icon"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphSearchAdapter = createControlAdapter<GraphSearchProps>(GraphSearch)

/** Adapter for GraphFind. */
export interface GraphFindAdapterProps
  extends Omit<GraphFindProps, "t" | "plural" | "Icon" | "vocabularyKeys"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphFindAdapter = createSearchAdapter<GraphFindProps>(
  GraphFind,
  (adaptedI18n: I18n) => ({
    kind: Object.fromEntries(
      NODE_KINDS.map((k) => [k, adaptedI18n.t(`ui.sessionGraph.kind.${k}`)]),
    ) as Record<string, string>,
    status: Object.fromEntries(
      NODE_STATUSES.map((s) => [s, adaptedI18n.t(`ui.sessionGraph.status.${s}`)]),
    ) as Record<string, string>,
    domain: Object.fromEntries(
      DOMAINS.map((d) => [d, adaptedI18n.t(`ui.sessionGraph.domain.${d}`)]),
    ) as Record<string, string>,
  }),
)

// ============ Navigation Adapters ============

/** Adapter for GraphBreadcrumbs. */
export interface GraphBreadcrumbsAdapterProps
  extends Omit<GraphBreadcrumbsProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphBreadcrumbsAdapter = createSimpleAdapter<GraphBreadcrumbsProps>(
  GraphBreadcrumbs,
)

/** Adapter for GraphMinimap. */
export interface GraphMinimapAdapterProps
  extends Omit<GraphMinimapProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphMinimapAdapter = createSimpleAdapter<GraphMinimapProps>(GraphMinimap)

/** Adapter for GraphLegend. */
export interface GraphLegendAdapterProps
  extends Omit<GraphLegendProps, "i18n" | "t" | "plural" | "Icon"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphLegendAdapter = createControlAdapter<GraphLegendProps>(GraphLegend)

// ============ A11y Adapter ============

/** Adapter for GraphA11y. */
export interface GraphA11yAdapterProps
  extends Omit<GraphA11yProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphA11yAdapter = createSimpleAdapter<GraphA11yProps>(GraphA11y)

// ============ Diff Adapter ============

/** Adapter for GraphDiffView. */
export interface GraphDiffViewAdapterProps
  extends Omit<GraphDiffViewProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphDiffViewAdapter = createSimpleAdapter<GraphDiffViewProps>(GraphDiffView)

// ============ Overlays Adapters ============

/** Adapter for GraphPeek. */
export interface GraphPeekAdapterProps
  extends Omit<GraphPeekProps, "i18n" | "t" | "plural" | "Icon"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphPeekAdapter = createOverlayAdapter<GraphPeekProps>(GraphPeek)

/** Adapter for GraphPopover. */
export interface GraphPopoverAdapterProps
  extends Omit<GraphPopoverProps, "i18n" | "t" | "plural" | "Icon"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphPopoverAdapter = createOverlayAdapter<GraphPopoverProps>(GraphPopover)

/** Adapter for GraphOverlayManager. */
export interface GraphOverlayManagerAdapterProps
  extends Omit<GraphOverlayManagerProps, "i18n" | "t" | "plural" | "Icon"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphOverlayManagerAdapter = createOverlayAdapter<GraphOverlayManagerProps>(
  GraphOverlayManager,
)

// ============ Controls Adapters ============

/** Adapter for GraphStatusBar. */
export interface GraphStatusBarAdapterProps
  extends Omit<GraphStatusBarProps, "i18n" | "t" | "plural" | "Icon"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphStatusBarAdapter = createOverlayAdapter<GraphStatusBarProps>(GraphStatusBar)

// ============ Compare Adapters ============

/** Adapter for GraphCompare. */
export interface GraphCompareAdapterProps
  extends Omit<GraphCompareProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphCompareAdapter = createSimpleAdapter<GraphCompareProps>(GraphCompare)

/** Adapter for GraphCompareBar. */
export interface GraphCompareBarAdapterProps
  extends Omit<GraphCompareBarProps, "i18n" | "t" | "plural" | "Icon"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphCompareBarAdapter = createOverlayAdapter<GraphCompareBarProps>(GraphCompareBar)

// ============ Turn Map Adapters ============

/** Adapter for TurnMapInlineGraph. */
export interface TurnMapInlineGraphAdapterProps
  extends Omit<TurnMapInlineGraphProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export const TurnMapInlineGraphAdapter = createSimpleAdapter<TurnMapInlineGraphProps>(
  TurnMapInlineGraph,
)

/** Adapter for TurnMapOverlay. */
export interface TurnMapOverlayAdapterProps
  extends Omit<TurnMapOverlayProps, "i18n" | "t" | "plural" | "Icon"> {
  i18n?: ReturnType<typeof useI18n>
}

export const TurnMapOverlayAdapter = createOverlayAdapter<TurnMapOverlayProps>(TurnMapOverlay)

// ============ Export Adapters ============

/** Adapter for GraphExportControl. */
export interface GraphExportControlAdapterProps
  extends Omit<GraphExportControlProps, "t" | "plural" | "Icon" | "Popover"> {
  i18n?: ReturnType<typeof useI18n>
}

export const GraphExportControlAdapter = createExportAdapter<GraphExportControlProps>(
  GraphExportControl,
)

// Re-export core utilities
export { createI18nAdapter, toSGJSViewData }
export { renderIcon, PopoverComponentImpl }