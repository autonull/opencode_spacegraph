import type { DepthMode, RendererCapabilities, RenderModel } from "@spacegraphjs/renderer"
import { useI18n } from "@opencode/ui/context/i18n"
import { onCleanup, onMount, Show } from "solid-js"
import "./graph-toolbar.css"
import {
  type DetailFraming,
  type DetailMode,
  type FacetCounts,
  type GraphArrangement,
  type GraphFacets,
  type GraphViewData,
  type GraphSide,
  type Layout,
  type ZoomLevel,
  VOCABULARY_KEYS,
} from "@opencode/session-ui/graph"
import { GraphIconButton } from "./GraphIconButton"
import { GraphLayersControl } from "./GraphLayersControl"
import { GraphLayoutControl } from "./GraphLayoutControl"
import { GraphDrawControl } from "./GraphDrawControl"
import { GraphShowControl } from "./GraphShowControl"
import { GraphTimeControl } from "./GraphTimeControl"
import { GraphQuestionsControl } from "./GraphQuestionsControl"
import { GraphZoomControl } from "./GraphZoomControl"
import { GraphExportControl } from "./GraphExportControl"
import { GraphRendererStatus } from "./GraphRendererStatus"
import { ToolbarMenu } from "./ToolbarMenu"

export type GraphToolbarProps = {
  capabilities?: RendererCapabilities
  renderer?: string
  /** The semantic level: one axis of what the map shows. */
  level?: ZoomLevel
  onLevel?: (level: ZoomLevel) => void
  /** The question the map answers: text, kind/status chips, and the domain lens, in one state. */
  facets?: GraphFacets
  /** Live kept/total counts for the facet chips. */
  facetCounts?: FacetCounts
  onFacetsChange?: (facets: GraphFacets) => void
  /** The projection spectrum: flat through orbit. */
  depth?: DepthMode
  onDepth?: (depth: DepthMode) => void
  depthModes?: readonly DepthMode[]
  /** The turn the map is pinned to, and how many turns the session has. */
  checkpoint?: number
  turnCount?: number
  onCheckpoint?: (index: number) => void
  onFit: () => void
  /** T1.8: camera zoom, independent of the semantic level control. */
  zoomPercent?: number
  onZoomOut?: () => void
  onZoomIn?: () => void
  zoomOutDisabled?: boolean
  zoomInDisabled?: boolean
  onSearch: () => void
  /** A2: copy the current facet question as a permalink. */
  onCopyView?: () => void
  /** A1/B1/C1: route a named question to the host; falls back to the graph:command event. */
  dispatchCommand?: (command: string) => void
  /** T17.1: the layout on screen; the host persists the choice. */
  layout?: Layout
  onLayoutChange?: (layout: Layout) => void
  /** LE.12: the file-first lens toggle (changed-files rail + bundled provenance); default off. */
  files?: boolean
  onToggleFiles?: () => void
  /**
   * How the map and the log meet in the hybrid. The host owns the geometry; the toolbar only names
   * the choice, so the reader can move the map without leaving the map.
   */
  arrangement?: GraphArrangement
  onArrangementChange?: (arrangement: GraphArrangement) => void
  /** Which side of the split the map takes. The floating arrangement has no side. */
  arrangementSide?: GraphSide
  onArrangementSideChange?: (side: GraphSide) => void
  /** Opens the equalizer's panel; absent when the host does not keep the rules. */
  onOpenEqualizer?: () => void
  /** Where a selected node's detail is shown; absent when the host does not offer the choice. */
  detailMode?: DetailMode
  onDetailModeChange?: (mode: DetailMode) => void
  /** T17.4: the camera frames the selected node (the "card" framing behavior). */
  detailFraming?: DetailFraming
  /** T17.4: callback when the framing behavior changes. */
  onDetailFramingChange?: (framing: DetailFraming) => void
  /** The transient peek at the node under the pointer; absent when the host does not offer it. */
  peek?: boolean
  onTogglePeek?: () => void
  /** Opens the hybrid turn map for the currently selected turn; absent when no turn is selected. */
  onTurnMap?: () => void
  /** LE.8/LE.9: opens the selected ribbon/matrix segment in the node-link graph; absent outside graph mode. */
  onExpandGraph?: () => void
  /** T3.4: exports the current render model as SVG, JSON, or standalone HTML. */
  onExport?: (format: "svg" | "json" | "html", model: RenderModel) => void
  /** Current render model for export; required when onExport is provided. */
  renderModel?: RenderModel
  onBack?: () => void
  /**
   * Puts the log beside the map, so the reader can have both without leaving either. The host owns
   * the arrangement; the toolbar only offers the way into it.
   */
  onSplitView?: () => void
  searching?: boolean
  /** RF.7: narrow widths collapse the secondary controls into an overflow menu. */
  compact?: boolean
  /** T6.8: the legend toggle; absent when the host does not offer it. */
  legend?: boolean
  onToggleLegend?: () => void
  /** T7.5: the layout gallery toggle; absent when the host does not offer it. */
  gallery?: boolean
  onToggleGallery?: () => void
  /** T1.19: the billboard switch — the cards face the reader, or lie in the content plane. */
  billboard?: boolean
  onToggleBillboard?: () => void
  /** T12/T14.3: opens a window over the map. The view proposes the first placement. */
  onOpenWindow?: (kind: string, nodeID?: string) => void
  /** T18.1: the map follows the active turn in the log. */
  followLog?: boolean
  onFollowLogChange?: (follow: boolean) => void
  /**
   * V115: Undo/redo for manual positions (dragged nodes).
   */
  manualHistoryLength?: number
  manualFutureLength?: number
  onUndoManual?: () => void
  onRedoManual?: () => void
  /**
   * CSS length reserved at the inline end of the row, so a host whose floating chrome overlaps
   * the graph panel's top-right keeps the renderer label and back control clickable.
   */
  endInset?: string
  /** T27.1: the model to derive domain presence from. */
  model?: GraphViewData
  }

/**
 * Graph toolbar (U3.9). It owns no graph state; it renders the semantic level, projection, and the
 * commands the host supplies. Capability gaps are disabled with an explanation, never hidden.
 *
 * T14.2 — the row is organised by axis, not by kind. Four things are inline (what is shown, where
 * the camera is) and everything else is one click away: "Draw" holds how the map is drawn, "Show"
 * holds what it says, and the commands sit at the end.
 */
export const GraphToolbar = (props: GraphToolbarProps) => {
  const i18n = useI18n()

  const viewControls = () => (
    <>
      <div data-slot="graph-toolbar-draw-group">
        <div class="px-2 py-1 text-11-medium uppercase tracking-wide text-text-weak">
          {i18n.t("ui.sessionGraph.toolbar.draw")}
        </div>
        <GraphDrawControl
          capabilities={props.capabilities}
          billboard={props.billboard}
          onToggleBillboard={props.onToggleBillboard}
          detailFraming={props.detailFraming}
          onDetailFramingChange={props.onDetailFramingChange}
          files={props.files}
          onToggleFiles={props.onToggleFiles}
          onOpenEqualizer={props.onOpenEqualizer}
          arrangement={props.arrangement}
          onArrangementChange={props.onArrangementChange}
          arrangementSide={props.arrangementSide}
          onArrangementSideChange={props.onArrangementSideChange}
        />
      </div>
      <div data-slot="graph-toolbar-show-group">
        <div class="px-2 py-1 text-11-medium uppercase tracking-wide text-text-weak">
          {i18n.t("ui.sessionGraph.toolbar.show")}
        </div>
        <GraphShowControl
          manualHistoryLength={props.manualHistoryLength}
          manualFutureLength={props.manualFutureLength}
          onUndoManual={props.onUndoManual}
          onRedoManual={props.onRedoManual}
          detailMode={props.detailMode}
          onDetailModeChange={props.onDetailModeChange}
          peek={props.peek}
          onTogglePeek={props.onTogglePeek}
          followLog={props.followLog}
          onFollowLogChange={props.onFollowLogChange}
          onOpenWindow={props.onOpenWindow}
          model={props.model}
          legend={props.legend}
          onToggleLegend={props.onToggleLegend}
          gallery={props.gallery}
          onToggleGallery={props.onToggleGallery}
          onTurnMap={props.onTurnMap}
          onExpandGraph={props.onExpandGraph}
        />
      </div>
    </>
  )

  const commandControls = () => (
    <>
      <GraphIconButton
        label={i18n.t("ui.sessionGraph.toolbar.search")}
        icon="magnifying-glass"
        pressed={props.searching}
        onClick={props.onSearch}
      />
      <GraphQuestionsControl dispatchCommand={props.dispatchCommand} />
      <GraphExportControl
        onExport={props.onExport}
        renderModel={props.renderModel}
        onCopyView={props.onCopyView}
      />
    </>
  )

  return (
    <div
      ref={(el) => {
        // A2 — the palette can open the facet question without hunting for the toolbar.
        onMount(() => {
          const handleCommand = (event: Event) => {
            const detail = (event as CustomEvent<{ name?: string }>).detail
            if (detail?.name !== "facets") return
            const menu = el?.querySelector<HTMLDetailsElement>('[data-slot="graph-toolbar-facets"]')
            if (menu) menu.open = true
          }
          window.addEventListener("graph:command", handleCommand)
          onCleanup(() => window.removeEventListener("graph:command", handleCommand))
        })
      }}
      data-component="session-graph-toolbar"
      data-slot="graph-toolbar"
      class="flex flex-wrap items-center gap-2 border-b border-border-weaker-base px-2 py-1.5"
      style={props.endInset ? { "padding-inline-end": props.endInset } : undefined}
    >
      <GraphLayersControl
        level={props.level}
        onLevel={props.onLevel}
        facets={props.facets}
        facetCounts={props.facetCounts}
        onFacetsChange={props.onFacetsChange}
        depth={props.depth}
        onDepth={props.onDepth}
        depthModes={props.depthModes}
        capabilities={props.capabilities}
        renderer={props.renderer}
        model={props.model}
      />
      <GraphLayoutControl
        layout={props.layout}
        onLayoutChange={props.onLayoutChange}
      />
      <GraphTimeControl
        checkpoint={props.checkpoint}
        turnCount={props.turnCount}
        onCheckpoint={props.onCheckpoint}
        model={props.model}
      />

      <GraphZoomControl
        zoomPercent={props.zoomPercent}
        onZoomOut={props.onZoomOut}
        onZoomIn={props.onZoomIn}
        zoomOutDisabled={props.zoomOutDisabled}
        zoomInDisabled={props.zoomInDisabled}
        onFit={props.onFit}
      />

      <GraphIconButton label={i18n.t("ui.sessionGraph.toolbar.fit")} icon="expand" onClick={props.onFit} />

      <Show
        when={!props.compact}
        fallback={
          <ToolbarMenu slot="graph-toolbar-overflow" label={i18n.t("ui.sessionGraph.toolbar.more")} icon="outline-dots">
            {viewControls()}
            {commandControls()}
          </ToolbarMenu>
        }
      >
        <ToolbarMenu
          slot="graph-toolbar-view"
          label={i18n.t("ui.sessionGraph.toolbar.view")}
          icon="outline-sliders"
          value={i18n.t(VOCABULARY_KEYS.detailMode[props.detailMode ?? "panel"])}
        >
          {viewControls()}
          {commandControls()}
        </ToolbarMenu>
      </Show>

      {/* The renderer label and the back control sit at the end of the row: the host's own chrome
          floats over the panel's top-right, and the end inset keeps them clear of it. */}
      <GraphRendererStatus
        renderer={props.renderer as any}
        compact={props.compact}
        onSplitView={props.onSplitView}
        onBack={props.onBack}
        endInset={props.endInset}
      />
    </div>
  )
}