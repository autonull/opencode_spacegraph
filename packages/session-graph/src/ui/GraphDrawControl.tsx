import { GRAPH_ARRANGEMENTS, type GraphArrangement, type GraphSide, VOCABULARY_KEYS } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"

export type GraphDrawControlProps = {
  capabilities?: import("@spacegraphjs/renderer").RendererCapabilities
  billboard?: boolean
  onToggleBillboard?: () => void
  detailFraming?: "off" | "card"
  onDetailFramingChange?: (framing: "off" | "card") => void
  files?: boolean
  onToggleFiles?: () => void
  onOpenEqualizer?: () => void
  arrangement?: GraphArrangement
  onArrangementChange?: (arrangement: GraphArrangement) => void
  arrangementSide?: GraphSide
  onArrangementSideChange?: (side: GraphSide) => void
}

export const GraphDrawControl = (props: GraphDrawControlProps) => {
  const i18n = useI18n()

  const option = (input: {
    label: string
    onClick: () => void
    pressed?: boolean
    slot?: string
    keepOpen?: boolean
    ariaLabel?: string
  }) => (
    <button
      type="button"
      data-slot={input.slot}
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
      <Show when={props.capabilities?.cardFacing && props.onToggleBillboard}>
        {option({
          label: i18n.t(
            props.billboard ? "ui.sessionGraph.toolbar.billboard" : "ui.sessionGraph.toolbar.billboardOff",
          ),
          onClick: () => props.onToggleBillboard?.(),
          pressed: props.billboard,
          slot: "graph-billboard-option",
          ariaLabel: i18n.t("ui.sessionGraph.toolbar.billboard"),
          keepOpen: true,
        })}
      </Show>
      <Show when={props.onDetailFramingChange}>
        {option({
          label: i18n.t(
            props.detailFraming === "card" ? "ui.sessionGraph.toolbar.frameNode" : "ui.sessionGraph.toolbar.frameNodeOff",
          ),
          onClick: () => props.onDetailFramingChange?.(props.detailFraming === "card" ? "off" : "card"),
          pressed: props.detailFraming === "card",
          slot: "graph-frame-node-option",
          ariaLabel: i18n.t("ui.sessionGraph.toolbar.frameNode"),
          keepOpen: true,
        })}
      </Show>
      <Show when={props.onToggleFiles}>
        {option({
          label: i18n.t("ui.sessionGraph.toolbar.files"),
          onClick: () => props.onToggleFiles?.(),
          pressed: props.files,
          slot: "graph-files-option",
          keepOpen: true,
        })}
      </Show>
      <Show when={props.onOpenEqualizer}>
        {option({
          label: i18n.t("ui.sessionGraph.toolbar.equalizer"),
          onClick: () => props.onOpenEqualizer?.(),
          slot: "graph-equalizer-option",
        })}
      </Show>
      <Show when={props.onArrangementChange}>
        <div data-slot="graph-toolbar-arrangement">
          <div class="px-2 py-1 text-12-regular text-text-weak">
            {i18n.t("ui.sessionGraph.toolbar.arrangement")}
          </div>
          {GRAPH_ARRANGEMENTS.map((arrangement) =>
            option({
              label: i18n.t(VOCABULARY_KEYS.arrangement[arrangement]),
              onClick: () => props.onArrangementChange?.(arrangement),
              pressed: props.arrangement === arrangement,
              slot: "graph-arrangement-option",
            }),
          )}
          <Show when={props.onArrangementSideChange && props.arrangement !== "floating"}>
            {option({
              label: i18n.t(VOCABULARY_KEYS.side[props.arrangementSide ?? "start"]),
              onClick: () =>
                props.onArrangementSideChange?.(props.arrangementSide === "start" ? "end" : "start"),
              pressed: props.arrangementSide === "start",
              slot: "graph-arrangement-side-option",
              ariaLabel: i18n.t("ui.sessionGraph.toolbar.arrangementSide"),
              keepOpen: true,
            })}
          </Show>
        </div>
      </Show>
    </>
  )
}

import { Show } from "solid-js"