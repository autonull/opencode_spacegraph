import { useI18n } from "@opencode/ui/context/i18n"
import type { GraphNode } from "@opencode/session-ui/graph"
import { Show } from "solid-js"
import { GraphDetailSurface, type GraphDetailProps } from "./GraphDetail"
import { GraphIconButton } from "./GraphIconButton"

export const POPOVER_WIDTH = 340
export const POPOVER_MAX_HEIGHT = 420
export const POPOVER_GAP = 16

export type GraphPopoverProps = Omit<GraphDetailProps, "node"> & {
  node?: GraphNode
  onClose?: () => void
  traceKind?: GraphDetailProps["traceKind"]
  onTraceWhy?: GraphDetailProps["onTraceWhy"]
  onTraceLedHere?: GraphDetailProps["onTraceLedHere"]
  onTraceRelated?: GraphDetailProps["onTraceRelated"]
  onClearTrace?: GraphDetailProps["onClearTrace"]
  onCopyTraceOutline?: GraphDetailProps["onCopyTraceOutline"]
}

/**
 * The detail of a node, floating over the canvas next to the node it belongs to. It takes no layout
 * width and never reframes the camera, so opening it does not move the map under the reader — which
 * is the whole difference between a popover and a side panel.
 */
export const GraphPopover = (props: GraphPopoverProps) => {
  const i18n = useI18n()

  return (
    <Show when={props.node} keyed>
      {(node) => (
        <div
          data-component="session-graph-popover"
          data-slot="graph-popover"
          role="dialog"
          aria-label={i18n.t("ui.sessionGraph.inspector.title")}
          class="relative flex flex-col overflow-hidden rounded-md border border-border-weaker-base bg-surface-base shadow-lg"
          style={{ width: `${POPOVER_WIDTH}px`, "max-height": `${POPOVER_MAX_HEIGHT}px` }}
        >
          <Show when={props.onClose}>
            <div class="absolute end-1 top-1 z-10">
              <GraphIconButton
                label={i18n.t("ui.sessionGraph.popover.close")}
                icon="outline-xmark"
                onClick={() => props.onClose?.()}
              />
            </div>
          </Show>
          <GraphDetailSurface
            model={props.model}
            node={node}
            diffSource={props.diffSource}
            renderSummary={props.renderSummary}
            link={props.link}
            onSelect={props.onSelect}
            onOpenTranscript={props.onOpenTranscript}
            onOpenSession={props.onOpenSession}
            onOpenWindow={props.onOpenWindow}
            traceKind={props.traceKind}
            onTraceWhy={props.onTraceWhy}
            onTraceLedHere={props.onTraceLedHere}
            onTraceRelated={props.onTraceRelated}
            onClearTrace={props.onClearTrace}
            onCopyTraceOutline={props.onCopyTraceOutline}
          />
        </div>
      )}
    </Show>
  )
}
