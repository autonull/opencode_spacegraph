import { Show } from "solid-js"
import type { GraphNode } from "../../model"
import { GraphDetailSurface, type GraphDetailProps } from "./graph-detail"

export const POPOVER_WIDTH = 340
export const POPOVER_MAX_HEIGHT = 420

/** The detail of a node floating over the canvas, taking no layout width and never reframing the view. */
export function GraphPopover(props: Omit<GraphDetailProps, "node"> & {
  node?: GraphNode
  closeLabel?: string
  onClose?: () => void
}) {
  return (
    <Show when={props.node} keyed>
      {(node) => (
        <div
          class="sg-popover"
          data-component="session-graph-popover"
          data-slot="graph-popover"
          role="dialog"
          aria-label={props.copy.openWindow}
          style={{ width: `${POPOVER_WIDTH}px`, "max-height": `${POPOVER_MAX_HEIGHT}px` }}
        >
          <Show when={props.onClose}>
            <button type="button" class="sg-popover__close" aria-label={props.closeLabel} onClick={() => props.onClose?.()}>×</button>
          </Show>
          <GraphDetailSurface {...props} node={node} />
        </div>
      )}
    </Show>
  )
}
