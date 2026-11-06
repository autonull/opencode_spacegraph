import { useI18n } from "@opencode/ui/context/i18n"
import { Show } from "solid-js"
import { GraphDrawControl } from "./GraphDrawControl"
import { GraphShowControl } from "./GraphShowControl"
import { ToolbarMenu } from "./ToolbarMenu"
import { VOCABULARY_KEYS } from "@opencode/session-ui/graph"
import type { DetailFraming, DetailMode, GraphArrangement, GraphSide, GraphViewData } from "@opencode/session-ui/graph"
import { GraphQuestionsControl } from "./GraphQuestionsControl"
import { GraphExportControl } from "./GraphExportControl"

export type GraphToolbarViewControlsProps = {
  capabilities?: any
  billboard?: boolean
  onToggleBillboard?: () => void
  detailFraming?: DetailFraming
  onDetailFramingChange?: (framing: DetailFraming) => void
  files?: boolean
  onToggleFiles?: () => void
  onOpenEqualizer?: () => void
  arrangement?: GraphArrangement
  onArrangementChange?: (arrangement: GraphArrangement) => void
  arrangementSide?: GraphSide
  onArrangementSideChange?: (side: GraphSide) => void
  manualHistoryLength?: number
  manualFutureLength?: number
  onUndoManual?: () => void
  onRedoManual?: () => void
  detailMode?: DetailMode
  onDetailModeChange?: (mode: DetailMode) => void
  peek?: boolean
  onTogglePeek?: () => void
  followLog?: boolean
  onFollowLogChange?: (follow: boolean) => void
  onOpenWindow?: (kind: string, nodeID?: string) => void
  model?: GraphViewData
  legend?: boolean
  onToggleLegend?: () => void
  gallery?: boolean
  onToggleGallery?: () => void
  onTurnMap?: () => void
  onExpandGraph?: () => void
  compact?: boolean
  onSearch?: () => void
  searching?: boolean
  onExport?: (format: "svg" | "json" | "html", model: any) => void
  renderModel?: any
  onCopyView?: () => void
  onCopyPermalink?: () => void
  dispatchCommand?: (command: string) => void
  i18n: ReturnType<typeof import("@opencode/ui/context/i18n")["useI18n"]>
}

export function GraphToolbarViewControls(props: GraphToolbarViewControlsProps) {
  const i18n = useI18n()

  return (
    <Show when={!props.compact} fallback={
      <ToolbarMenu slot="graph-toolbar-overflow" label={i18n.t("ui.sessionGraph.toolbar.more")} icon="outline-dots">
        <GraphToolbarViewControlsInner {...props} />
        <GraphToolbarCommandControlsInner {...props} />
      </ToolbarMenu>
    }>
      <ToolbarMenu
        slot="graph-toolbar-view"
        label={i18n.t("ui.sessionGraph.toolbar.view")}
        icon="outline-sliders"
        value={i18n.t(VOCABULARY_KEYS.detailMode[props.detailMode ?? "panel"])}
      >
        <GraphToolbarViewControlsInner {...props} />
        <GraphToolbarCommandControlsInner {...props} />
      </ToolbarMenu>
    </Show>
  )
}

function GraphToolbarViewControlsInner(props: GraphToolbarViewControlsProps) {
  const i18n = useI18n()

  return (
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
}

function GraphToolbarCommandControlsInner(props: GraphToolbarViewControlsProps) {
  const i18n = useI18n()

  return (
    <>
      {props.onSearch && (
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-sm text-text-base hover:bg-surface-base-hover"
          onClick={props.onSearch}
          aria-label={i18n.t("ui.sessionGraph.toolbar.search")}
          aria-pressed={props.searching ?? false}
        >
          <svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11l4 4" />
          </svg>
        </button>
      )}
      {props.dispatchCommand && <GraphQuestionsControl dispatchCommand={props.dispatchCommand} />}
      {props.onExport && (
        <GraphExportControl
          onExport={props.onExport}
          renderModel={props.renderModel}
          onCopyView={props.onCopyView}
          onCopyPermalink={props.onCopyPermalink}
        />
      )}
    </>
  )
}