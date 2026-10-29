import { DETAIL_MODES, type DetailMode, VOCABULARY_KEYS } from "@opencode/session-ui/graph"
import { GraphIconButton } from "./GraphIconButton"
import { useI18n } from "@opencode/ui/context/i18n"
import { Show } from "solid-js"

export type GraphShowControlProps = {
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
  model?: import("@opencode/session-ui/graph").GraphViewData
  legend?: boolean
  onToggleLegend?: () => void
  gallery?: boolean
  onToggleGallery?: () => void
  onTurnMap?: () => void
  onExpandGraph?: () => void
}

export const GraphShowControl = (props: GraphShowControlProps) => {
  const i18n = useI18n()

  const option = (input: {
    label: string
    onClick: () => void
    pressed?: boolean
    slot?: string
    keepOpen?: boolean
    ariaLabel?: string
    value?: string
  }) => (
    <button
      type="button"
      data-slot={input.slot}
      data-value={input.value}
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
      aria-pressed={input.pressed}
      aria-label={input.ariaLabel ?? input.label}
      onClick={(event) => {
        if (!input.keepOpen) {
          const menu = event.currentTarget.closest("details")
          if (menu) menu.open = false
        }
        input.onClick()
      }}
    >
      {input.label}
    </button>
  )

  return (
    <>
      <Show when={props.manualHistoryLength !== undefined || props.manualFutureLength !== undefined}>
        <div data-slot="graph-toolbar-manual-history">
          <GraphIconButton
            label={i18n.t("ui.sessionGraph.toolbar.undo")}
            icon="outline-undo"
            onClick={props.onUndoManual ?? (() => {})}
            disabled={(props.manualHistoryLength ?? 0) === 0}
            slot="graph-undo-option"
          />
          <GraphIconButton
            label={i18n.t("ui.sessionGraph.toolbar.redo")}
            icon="outline-redo"
            onClick={props.onRedoManual ?? (() => {})}
            disabled={(props.manualFutureLength ?? 0) === 0}
            slot="graph-redo-option"
          />
        </div>
      </Show>
      <Show when={props.onDetailModeChange}>
        <div data-slot="graph-toolbar-detail">
          <div class="px-2 py-1 text-12-regular text-text-weak">
            {i18n.t("ui.sessionGraph.toolbar.detailMode")}
          </div>
          {DETAIL_MODES.map((mode) =>
            option({
              label: i18n.t(VOCABULARY_KEYS.detailMode[mode]),
              onClick: () => props.onDetailModeChange?.(mode),
              pressed: props.detailMode === mode,
              slot: "graph-detail-mode-option",
              value: mode,
            }),
          )}
        </div>
      </Show>
      <Show when={props.onTogglePeek}>
        {option({
          label: i18n.t("ui.sessionGraph.toolbar.peek"),
          onClick: () => props.onTogglePeek?.(),
          pressed: props.peek,
          slot: "graph-peek-option",
          keepOpen: true,
        })}
      </Show>
      <Show when={props.onFollowLogChange}>
        {option({
          label: props.followLog ? i18n.t("ui.sessionGraph.toolbar.followLog") : i18n.t("ui.sessionGraph.toolbar.followLogOff"),
          onClick: () => props.onFollowLogChange?.(!props.followLog),
          pressed: props.followLog,
          slot: "graph-follow-log-option",
          keepOpen: true,
          ariaLabel: i18n.t("ui.sessionGraph.toolbar.followLog"),
        })}
      </Show>
      <Show when={props.onOpenWindow}>
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.toolbar.minimap")}
          icon="layout-bottom"
          onClick={() => props.onOpenWindow?.("minimap")}
        />
      </Show>
      <Show when={props.onOpenWindow}>
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.toolbar.filesystem")}
          icon="folder-tree"
          onClick={() => props.onOpenWindow?.("filesystem")}
        />
      </Show>
      <Show when={props.onToggleLegend}>
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.toolbar.legend")}
          icon="outline-sliders"
          pressed={props.legend}
          onClick={() => props.onToggleLegend?.()}
        />
      </Show>
      <Show when={props.onToggleGallery}>
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.toolbar.gallery")}
          icon="dot-grid"
          pressed={props.gallery}
          onClick={() => props.onToggleGallery?.()}
        />
      </Show>
      <Show when={props.onTurnMap}>
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.toolbar.turnMap")}
          icon="outline-worktree"
          onClick={() => props.onTurnMap?.()}
        />
      </Show>
      <Show when={props.onExpandGraph}>
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.toolbar.expandGraph")}
          icon="arrow-up-right"
          onClick={() => props.onExpandGraph?.()}
        />
      </Show>
    </>
  )
}