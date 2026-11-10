import type {
  DetailFraming,
  DetailMode,
  EqualizerRule,
  EqualizerRuleSet,
  GraphArrangement,
  GraphViewData,
  GraphSide,
  Layout,
  ZoomLevel,
} from "@opencode/session-ui/graph"
import type { RendererID } from "../canvas/renderer-registry"
import type { RenderModel } from "@spacegraphjs/renderer"
import { createMemo, type JSX } from "solid-js"
import { useGraphViewContext } from "./GraphViewContext"
import { GraphBreadcrumbs } from "./GraphBreadcrumbs"
import { GraphCompareBar } from "./GraphCompareBar"
import { GraphFallback } from "./GraphFallback"
import { GraphHiddenSelection } from "./GraphHiddenSelection"
import { GraphScaleNotice } from "./GraphScaleNotice"
import { GraphStatusBar } from "./GraphStatusBar"
import { GraphToolbar } from "./GraphToolbar"
import { DEPTH_MODES } from "@spacegraphjs/renderer"

/**
 * GraphChromeProps defines the chrome-related props for custom chrome rendering.
 */
export type GraphChromeProps = {
  /** When true, renders the full chrome. Default: true */
  show?: boolean
  /** When true, renders a minimal toolbar variant: level + fit + More. */
  minimal?: boolean
  /** Container width threshold below which chrome is hidden. Default: 640 */
  hideBelow?: number
  /** Custom chrome renderer. Receives the GraphViewContext value. */
  children?: (ctx: ReturnType<typeof useGraphViewContext>) => JSX.Element
  /** The host's onBack callback. */
  onBack?: () => void
  /** The host's onSplitView callback. */
  onSplitView?: () => void
  /** Reserved inline-end length for host chrome that floats over the panel's top-right corner. */
  endInset?: string
  /** The current layout mode. */
  layout?: Layout
  /** Callback when layout changes. */
  onLayoutChange?: (layout: Layout) => void
  /** The current arrangement (hybrid mode). */
  arrangement?: GraphArrangement
  /** Callback when arrangement changes. */
  onArrangementChange?: (arrangement: GraphArrangement) => void
  /** Which side of the split the map takes. */
  arrangementSide?: GraphSide
  /** Callback when arrangement side changes. */
  onArrangementSideChange?: (side: GraphSide) => void
  /** The current detail mode. */
  detailMode?: DetailMode
  /** Callback when detail mode changes. */
  onDetailModeChange?: (mode: DetailMode) => void
  /** The current detail framing. */
  detailFraming?: DetailFraming
  /** Callback when detail framing changes. */
  onDetailFramingChange?: (framing: DetailFraming) => void
  /** Whether peek is enabled. */
  peek?: boolean
  /** Callback when peek changes. */
  onPeekChange?: (peek: boolean) => void
  /** Whether followLog is enabled. */
  followLog?: boolean
  /** Callback when followLog changes. */
  onFollowLogChange?: (followLog: boolean) => void
  /** Whether files rail is shown. */
  files?: boolean
  /** Callback when files changes. */
  onFilesChange?: (files: boolean) => void
  /** The current level. */
  level?: ZoomLevel
  /** Callback when level changes. */
  onLevelChange?: (level: ZoomLevel) => void
  /** The current facets. */
  facets?: any
  /** Callback when facets change. */
  onFacetsChange?: (facets: any) => void
  /** The checkpoint index. */
  checkpoint?: number
  /** The total turn count. */
  turnCount?: number
  /** Callback when checkpoint changes. */
  onCheckpoint?: (index: number) => void
  /** The live model for comparison. */
  liveModel?: GraphViewData
  /** Callback to open a window. */
  onOpenWindow?: (kind: string, nodeID?: string) => void
  /** The equalizer rules. */
  rules?: EqualizerRuleSet
  /** Callback when rules change. */
  onRulesChange?: (rules: EqualizerRule[]) => void
  /** Handler for turn map. */
  onTurnMap?: (turnID: string) => void
  /** Handler for expand graph. */
  onExpandGraph?: () => void
  /** Handler for export. */
  onExport?: (format: "svg" | "json" | "html", model: RenderModel) => void
  /** Handler for copy view. */
  onCopyView?: () => void
  /** Handler for search. */
  onSearch?: () => void
  /** Whether search is open. */
  searching?: boolean
  /** Whether compact mode. */
  compact?: boolean
  /** The current renderer ID. */
  renderer?: RendererID
  /** Manual history length. */
  manualHistoryLength?: number
  /** Manual future length. */
  manualFutureLength?: number
  /** Handler for undo manual. */
  onUndoManual?: () => void
  /** Handler for redo manual. */
  onRedoManual?: () => void
  /** The render model for the toolbar. */
  renderModel?: RenderModel
  /** The zoom percent. */
  zoomPercent?: number
  /** Handler for zoom out. */
  onZoomOut?: () => void
  /** Handler for zoom in. */
  onZoomIn?: () => void
  /** Whether zoom out is disabled. */
  zoomOutDisabled?: boolean
  /** Whether zoom in is disabled. */
  zoomInDisabled?: boolean
  /** Handler for fit. */
  onFit?: () => void
  /** Whether billboard mode. */
  billboard?: boolean
  /** Handler for toggle billboard. */
  onToggleBillboard?: () => void
  /** Handler for toggle legend. */
  onToggleLegend?: () => void
  /** Handler for toggle gallery. */
  onToggleGallery?: () => void
  /** Whether legend is open. */
  legend?: boolean
  /** Whether gallery is open. */
  gallery?: boolean
  /** The frame node ID. */
  frame?: string
  /** The active turn ID. */
  activeTurn?: string
}

/**
 * GraphChrome is the optional chrome wrapper around SessionGraph.
 * It renders toolbar, breadcrumbs, status bar, compare bar, scale notice, hidden selection, fallback.
 * 
 * By default, it renders the full chrome. When `minimal` is true, it renders a
 * minimal toolbar variant. When container width is below `hideBelow`, it renders nothing.
 */
export const GraphChrome = (props: GraphChromeProps) => {
  const ctx = useGraphViewContext()
  const containerWidth = createMemo(() => ctx.canvasSize().width)
  
  const showChrome = props.show ?? true
  const hideBelow = props.hideBelow ?? 640
  
  const shouldRender = showChrome && containerWidth() >= hideBelow
  
  // If custom children renderer provided, use it
  if (props.children) {
    return shouldRender ? <>{props.children(ctx)}</> : null
  }
  
  // Default chrome rendering
  if (!shouldRender) return null
  
  const capabilities = ctx.capabilities()
  
  return (
    <>
      <GraphToolbar
        capabilities={capabilities}
        renderer={ctx.rendererID()}
        level={ctx.level()}
        onLevel={ctx.setLevel}
        facets={ctx.facets()}
        facetCounts={ctx.counts()}
        onFacetsChange={ctx.setFacets}
        depth={ctx.depth()}
        onDepth={ctx.changeDepth}
        depthModes={DEPTH_MODES}
        checkpoint={props.checkpoint}
        turnCount={props.turnCount}
        onCheckpoint={props.onCheckpoint}
        onFit={props.onFit ?? ctx.onFit}
        zoomPercent={props.zoomPercent ?? ctx.zoomPercent()}
        onZoomOut={props.onZoomOut ?? ctx.onZoomOut}
        onZoomIn={props.onZoomIn ?? ctx.onZoomIn}
        zoomOutDisabled={props.zoomOutDisabled ?? ctx.zoomOutDisabled()}
        zoomInDisabled={props.zoomInDisabled ?? ctx.zoomInDisabled()}
        onSearch={props.onSearch ?? ctx.onSearch}
        onCopyView={props.onCopyView ?? ctx.onCopyView}
        legend={props.legend ?? ctx.legendOpen()}
        onToggleLegend={props.onToggleLegend ?? (() => ctx.setLegendOpen(!ctx.legendOpen()))}
        gallery={props.gallery ?? ctx.galleryOpen()}
        onToggleGallery={props.onToggleGallery ?? (() => ctx.setGalleryOpen(!ctx.galleryOpen()))}
        billboard={props.billboard ?? ctx.cardFacing() === "camera"}
        onToggleBillboard={props.onToggleBillboard ?? ctx.toggleBillboard}
        detailFraming={ctx.detailFraming()}
        onDetailFramingChange={ctx.changeDetailFraming}
        layout={ctx.layout()}
        onLayoutChange={ctx.changeLayout}
        files={ctx.files()}
        onToggleFiles={ctx.toggleFiles}
        arrangement={props.arrangement}
        onArrangementChange={props.onArrangementChange}
        arrangementSide={props.arrangementSide}
        onArrangementSideChange={props.onArrangementSideChange}
        onOpenEqualizer={props.onRulesChange ? () => ctx.onOpenWindow?.("equalizer") : undefined}
        onOpenWindow={props.onOpenWindow ?? ctx.onOpenWindow}
        detailMode={ctx.detailMode()}
        onDetailModeChange={ctx.changeDetailMode}
        peek={ctx.peek()}
        onTogglePeek={ctx.togglePeek}
        followLog={ctx.followLog()}
        onFollowLogChange={ctx.setFollowLog}
        manualHistoryLength={props.manualHistoryLength ?? ctx.manualHistory().length}
        manualFutureLength={props.manualFutureLength ?? ctx.manualFuture().length}
        onUndoManual={props.onUndoManual ?? ctx.undoManual}
        onRedoManual={props.onRedoManual ?? ctx.redoManual}
        onTurnMap={props.onTurnMap ? () => { const turnID = ctx.selectedTurn(); if (turnID) props.onTurnMap!(turnID); } : undefined}
        onExpandGraph={props.onExpandGraph}
        onExport={props.onExport ?? ctx.onExport}
        renderModel={props.renderModel ?? ctx.ordered()}
        onBack={props.onBack}
        onSplitView={props.onSplitView}
        searching={props.searching ?? ctx.searchOpen()}
        compact={props.compact ?? ctx.compact()}
        endInset={props.endInset}
      />
      <GraphBreadcrumbs crumbs={ctx.graphSelection.crumbs()} onSelect={ctx.fitSubtree} />
      <GraphStatusBar
        count={ctx.selection().length}
        onFrame={ctx.onFit}
        onKeepOnly={ctx.graphSelection.keepOnlySelection}
        onCopyPaths={ctx.graphSelection.copySelectedPaths}
        onExportSubset={ctx.exportSelection}
        onClear={ctx.graphSelection.clearSelection}
        onAddNote={ctx.annotations.openNoteComposer}
        compare={
          ctx.selectedTurns().length >= 2 || ctx.comparisonHook.comparedTurns()
            ? {
                active: ctx.comparisonHook.comparedTurns() !== null,
                onCompare: ctx.compareSelectedTurns,
                onClear: ctx.clearComparison,
              }
            : undefined
        }
        group={
          ctx.groupCollapse.selectedGroup()
            ? {
                collapsed: ctx.groupCollapse.collapsedGroups().has(ctx.groupCollapse.selectedGroup()!.id),
                onToggle: ctx.groupCollapse.toggleGroup,
                onCollapseOthers: ctx.groupCollapse.collapseOtherGroups,
              }
            : undefined
        }
      />
      <GraphCompareBar
        diff={ctx.comparison()}
        onOpenWindow={() => ctx.onOpenWindow?.("compare")}
        onClear={() => {
          ctx.clearComparison()
          props.onCheckpoint?.(props.turnCount === undefined ? 0 : props.turnCount - 1)
        }}
      />
      <GraphScaleNotice
        model={ctx.model}
        selectedTurn={ctx.selectedTurn}
        frameTurn={() => props.frame}
        followLog={ctx.followLog()}
        activeTurn={props.activeTurn}
      />
      <GraphHiddenSelection
        model={ctx.model}
        selection={() => ctx.selection()}
        level={ctx.level}
        onJumpTo={ctx.jumpTo}
      />
      <GraphFallback error={ctx.error()} rendererID={ctx.rendererID()} />
    </>
  )
}