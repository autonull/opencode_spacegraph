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
import { Show } from "solid-js"
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
  /** Container width threshold below which chrome is hidden. Default: 0 (never hide by default). */
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
  /** The model for scale notice. */
  model?: GraphViewData | (() => GraphViewData)
  /** Selected turn accessor. */
  selectedTurn?: () => string | undefined
  /** Selection accessor. */
  selection?: () => readonly string[]
  /** Comparison hook. */
  comparisonHook?: {
    comparedTurns: () => any
    comparison: () => any
    compareSelectedTurns: () => void
    clearComparison: () => void
  }
  /** Group collapse state. */
  groupCollapse?: {
    selectedGroup: () => any
    collapsedGroups: () => ReadonlySet<string>
    toggleGroup: (id: string) => void
    collapseOtherGroups: () => void
  }
  /** Graph selection methods. */
  graphSelection?: {
    crumbs: () => readonly { id: string; label: string }[]
    keepOnlySelection: () => void
    copySelectedPaths: () => void
    clearSelection: () => void
  }
  /** Annotations methods. */
  annotations?: {
    openNoteComposer: () => void
  }
  /** Error state. */
  error?: string | null
  /** Whether demo is dismissed. */
  demoDismissed?: boolean
  /** Whether see-map prompt is dismissed. */
  seeMapPromptDismissed?: boolean
  /** Whether to show see-map prompt. */
  showSeeMapPrompt?: boolean
  /** Trust lens active. */
  trustLens?: boolean
  /** Trust lens change handler. */
  onTrustLensChange?: () => void
  /** Trust lens active (deprecated, use trustLens). */
  trustLensActive?: boolean
  /** Compaction advisor active. */
  compactionAdvisor?: boolean
  /** Compaction advisor change handler. */
  onCompactionAdvisorChange?: () => void
  /** I18n function (from context). */
  i18n?: ReturnType<typeof import("@opencode/ui/context/i18n").useI18n>
  /** Shell mode. */
  shell?: "full" | "bare"
  /** Whether followLog is enabled (for scale notice). */
  followLogForScale?: boolean
  /** Frame turn accessor (for scale notice). */
  frameTurn?: () => string | undefined
  /** On dismiss see-map prompt. */
  onDismissSeeMapPrompt?: () => void
  /** On dismiss demo. */
  onDismissDemo?: () => void
}

/**
 * GraphChrome is the optional chrome wrapper around SessionGraph.
 * It renders toolbar, breadcrumbs, status bar, compare bar, scale notice, hidden selection, fallback,
 * demo banner, see-map prompt, and trust lens banner.
 * 
 * By default, it renders the full chrome. When `minimal` is true, it renders a
 * minimal toolbar variant. When container width is below `hideBelow`, it renders nothing.
 */
export const GraphChrome = (props: GraphChromeProps) => {
  const ctx = useGraphViewContext()
  const containerWidth = createMemo(() => ctx.canvasSize().width)
  const i18n = ctx.i18n()
  
  const showChrome = props.show ?? true
  const hideBelow = props.hideBelow ?? 0
  
  const shouldRender = showChrome && containerWidth() >= hideBelow
  
  // If custom children renderer provided, use it
  if (props.children) {
    return shouldRender ? <>{props.children(ctx)}</> : null
  }
  
  // Default chrome rendering
  if (!shouldRender) return null
  
  const capabilities = ctx.capabilities()
  const model = (typeof props.model === "function" ? props.model() : props.model) ?? ctx.model()
  const selectedTurn = props.selectedTurn ?? ctx.selectedTurn
  const selection = props.selection ?? ctx.selection
  const comparisonHook = props.comparisonHook ?? {
    comparedTurns: () => ctx.comparisonHook.comparedTurns(),
    comparison: () => ctx.comparison(),
    compareSelectedTurns: ctx.compareSelectedTurns,
    clearComparison: ctx.clearComparison,
  }
  const groupCollapse = props.groupCollapse ?? {
    selectedGroup: () => ctx.groupCollapse.selectedGroup(),
    collapsedGroups: () => ctx.groupCollapse.collapsedGroups(),
    toggleGroup: ctx.groupCollapse.toggleGroup,
    collapseOtherGroups: ctx.groupCollapse.collapseOtherGroups,
  }
  const graphSelection = props.graphSelection ?? {
    crumbs: () => ctx.graphSelection.crumbs(),
    keepOnlySelection: ctx.graphSelection.keepOnlySelection,
    copySelectedPaths: ctx.graphSelection.copySelectedPaths,
    clearSelection: ctx.graphSelection.clearSelection,
  }
  const annotations = props.annotations ?? {
    openNoteComposer: ctx.annotations.openNoteComposer,
  }
  const error = props.error ?? ctx.error()
  const demoDismissed = props.demoDismissed ?? false
  const seeMapPromptDismissed = props.seeMapPromptDismissed ?? false
  const showSeeMapPrompt = props.showSeeMapPrompt ?? false
  const trustLensActive = props.trustLens ?? props.trustLensActive ?? false
  const shell = props.shell ?? "full"
  const followLogForScale = props.followLogForScale ?? ctx.followLog()
  const frameTurn = props.frameTurn ?? (() => props.frame)
  const onDismissSeeMapPrompt = props.onDismissSeeMapPrompt ?? (() => {})
  const onDismissDemo = props.onDismissDemo ?? (() => {})
  
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
        trustLens={trustLensActive}
        onToggleTrustLens={ctx.toggleTrustLens}
        compactionAdvisor={props.compactionAdvisor ?? ctx.compactionAdvisor()}
        onToggleCompactionAdvisor={props.onCompactionAdvisorChange ?? ctx.toggleCompactionAdvisor}
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
      {/* Demo banner for first-run */}
      <Show when={shell !== "bare" && demoDismissed === false && model && model.nodes.length === 0}>
        <div
          data-slot="graph-demo-banner"
          class="flex items-center justify-between px-4 py-2 border-b border-border-weaker-base bg-surface-base"
          role="status"
          aria-live="polite"
        >
          <span class="text-12-regular text-text-base">{i18n.t("ui.sessionGraph.demo.label")}</span>
          <button
            type="button"
            class="flex h-6 items-center gap-1 rounded-sm px-2 text-12-regular text-text-base hover:bg-surface-base-hover"
            onClick={onDismissDemo}
          >
            {i18n.t("ui.sessionGraph.demo.dismiss")}
          </button>
        </div>
      </Show>
      {/* See-map prompt */}
      <Show when={showSeeMapPrompt && seeMapPromptDismissed === false}>
        <div
          data-slot="graph-see-map-prompt"
          class="flex items-center justify-between px-4 py-2 border-b border-border-weaker-base bg-surface-base"
          role="status"
          aria-live="polite"
        >
          <div class="flex items-center gap-2">
            <span class="text-12-medium text-text-strong">{i18n.t("ui.sessionGraph.prompt.seeMap")}</span>
            <span class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.prompt.seeMapHint")}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="flex h-6 items-center gap-1 rounded-sm px-2 text-12-regular text-text-base hover:bg-surface-base-hover"
              onClick={() => {
                // Switch to map surface via command event
                window.dispatchEvent(new CustomEvent("graph:command", { detail: { name: "map" } }))
              }}
            >
              {i18n.t("ui.sessionGraph.prompt.seeMap")}
            </button>
            <button
              type="button"
              class="flex h-6 items-center gap-1 rounded-sm px-2 text-12-regular text-text-base hover:bg-surface-base-hover"
              onClick={onDismissSeeMapPrompt}
            >
              {i18n.t("ui.sessionGraph.prompt.dismiss")}
            </button>
          </div>
        </div>
      </Show>
      {/* Trust lens banner */}
      <Show when={trustLensActive}>
        <div
          data-slot="graph-trust-lens-banner"
          class="flex items-center justify-between px-4 py-2 border-b border-border-weaker-base bg-warning-bg"
          role="status"
          aria-live="polite"
        >
          <span class="text-12-regular text-warning-fg">{i18n.t("ui.sessionGraph.trustLens.banner")}</span>
        </div>
      </Show>
      <GraphBreadcrumbs crumbs={graphSelection.crumbs()} onSelect={ctx.fitSubtree} />
      <GraphStatusBar
        count={selection().length}
        onFrame={ctx.onFit}
        onKeepOnly={graphSelection.keepOnlySelection}
        onCopyPaths={graphSelection.copySelectedPaths}
        onExportSubset={ctx.exportSelection}
        onClear={graphSelection.clearSelection}
        onAddNote={annotations.openNoteComposer}
        compare={
          (props.comparisonHook?.comparedTurns?.() ?? comparisonHook.comparedTurns()) !== null || (selection().length >= 2)
            ? {
                active: comparisonHook.comparedTurns() !== null,
                onCompare: comparisonHook.compareSelectedTurns,
                onClear: comparisonHook.clearComparison,
              }
            : undefined
        }
        group={
          groupCollapse.selectedGroup()
            ? {
                collapsed: groupCollapse.collapsedGroups().has(groupCollapse.selectedGroup()!.id),
                onToggle: () => {
                  const group = groupCollapse.selectedGroup()
                  if (group) groupCollapse.toggleGroup(group.id)
                },
                onCollapseOthers: groupCollapse.collapseOtherGroups,
              }
            : undefined
        }
      />
      <GraphCompareBar
        diff={comparisonHook.comparison()}
        onOpenWindow={() => ctx.onOpenWindow?.("compare")}
        onClear={() => {
          comparisonHook.clearComparison()
          props.onCheckpoint?.(props.turnCount === undefined ? 0 : props.turnCount - 1)
        }}
      />
      <GraphScaleNotice
        model={() => model}
        selectedTurn={selectedTurn}
        frameTurn={frameTurn}
        followLog={followLogForScale}
        activeTurn={props.activeTurn}
      />
      <GraphHiddenSelection
        model={() => model}
        selection={selection}
        level={ctx.level}
        onJumpTo={ctx.jumpTo}
      />
      <GraphFallback error={error as string | undefined} rendererID={ctx.rendererID()} />
    </>
  )
}