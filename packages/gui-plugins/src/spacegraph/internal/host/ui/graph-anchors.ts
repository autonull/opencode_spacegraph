import type { GraphRenderer, RendererViewport } from "@spacegraphjs/renderer"
import type { GraphNode } from "@opencode/session-ui/graph"
import { createEffect, createSignal } from "solid-js"

export type NodeAnchorOptions = {
  /** The node the anchor follows; nothing anchors when it is absent. */
  node: () => GraphNode | undefined
  /** The live renderer; it owns the camera, so it owns the projection too. */
  renderer: () => GraphRenderer | undefined
  /** The latest viewport the renderer reported. */
  viewport: () => RendererViewport | undefined
}

/**
 * The screen anchor of a node: where it sits on the screen right now.
 *
 * The anchor follows the node as the reader pans, and it does not move by less than a pixel, so a
 * pan does not re-render what the anchor carries. The popover, the peek and a pinned window all
 * read one anchor, so they cannot drift apart.
 */
export function createNodeAnchor(options: NodeAnchorOptions) {
  const [anchor, setAnchor] = createSignal<{ x: number; y: number }>()

  createEffect(() => {
    const current = options.node()
    options.viewport()
    const position = current ? options.renderer()?.getNodeScreenPosition?.(current.id) : undefined
    setAnchor((previous) =>
      previous && position && Math.abs(previous.x - position.x) < 1 && Math.abs(previous.y - position.y) < 1
        ? previous
        : position,
    )
  })

  return anchor
}
