import { createMemo, type Accessor } from "solid-js"
import { type DetailMode, type GraphNode, type GraphViewData, type GraphEdge } from "@opencode/session-ui/graph"
import { nodeByID } from "@opencode/session-ui/graph"
import { createNodeAnchor } from "./graph-anchors"
import type { GraphViewportTrackerReturn } from "./useGraphViewport"
import type { UseGraphAnnotationsReturn } from "./useGraphAnnotations"
import type { UseGraphSelectionReturn } from "./useGraphSelection"
import type { GraphRenderer } from "@spacegraphjs/renderer"
import { POPOVER_GAP, POPOVER_WIDTH, POPOVER_MAX_HEIGHT, CARD_SIZE } from "./popover-constants"

export interface UsePopoverInput {
  model: Accessor<GraphViewData>
  peek: Accessor<boolean>
  effectiveDetailMode: Accessor<DetailMode>
  selectedNode: Accessor<GraphNode | undefined>
  hovered: Accessor<string | undefined>
  edgeHovered: Accessor<string | undefined>
  popoverDismissed: Accessor<boolean>
  selection: UseGraphSelectionReturn["selection"]
  annotations: UseGraphAnnotationsReturn
  renderer: Accessor<GraphRenderer | undefined>
  viewportTracker: GraphViewportTrackerReturn
  canvasSize: Accessor<{ width: number; height: number }>
  cardScreenWidth: Accessor<number>
}

export interface UsePopoverReturn {
  popoverNode: Accessor<GraphNode | undefined>
  popoverAnchor: Accessor<{ x: number; y: number } | undefined>
  popoverPlacement: Accessor<{ left: number; top: number }>
  popoverVisible: Accessor<GraphNode | undefined>
  peekNode: Accessor<GraphNode | undefined>
  peekAnchor: Accessor<{ x: number; y: number } | undefined>
  peekPlacement: Accessor<{ left: number; top: number } | undefined>
  peekFrame: Accessor<{ node: GraphNode; left: number; top: number } | undefined>
  peekEdge: Accessor<GraphEdge | undefined>
  noteTargetNode: Accessor<GraphNode | undefined>
  noteAnchor: Accessor<{ x: number; y: number } | undefined>
}

export function usePopover(input: UsePopoverInput): UsePopoverReturn {
  const {
    model,
    peek,
    effectiveDetailMode,
    selectedNode,
    hovered,
    edgeHovered,
    popoverDismissed,
    selection,
    annotations,
    renderer,
    viewportTracker,
    canvasSize,
    cardScreenWidth,
  } = input

  // The node the popover describes, and where it hangs.
  const popoverNode = createMemo(() => (effectiveDetailMode() === "popover" ? selectedNode() : undefined))

  // The peeked node: under the pointer, never the selected one — the selection already has a
  // surface of its own.
  const peekNode = createMemo(() => {
    if (!peek()) return undefined
    const id = hovered()
    if (!id || id === selection()[0]) return undefined
    return nodeByID(model(), id)
  })

  // Create node anchors once (they are signal accessors)
  const popoverAnchor = createNodeAnchor({
    node: popoverNode,
    renderer,
    viewport: viewportTracker.viewport,
  })

  const peekAnchor = createNodeAnchor({
    node: peekNode,
    renderer,
    viewport: viewportTracker.viewport,
  })

  const noteAnchor = createNodeAnchor({
    node: () => {
      const noteTarget = annotations.noteTarget()
      if (!noteTarget) return undefined
      return nodeByID(model(), noteTarget)
    },
    renderer,
    viewport: viewportTracker.viewport,
  })

  // Beside the node, flipped to the other side when it would leave the canvas.
  const popoverPlacement = createMemo(() => {
    const anchor = popoverAnchor()
    const size = canvasSize()
    if (!anchor) return { left: 0, top: 0 }
    const fitsRight = anchor.x + POPOVER_GAP + POPOVER_WIDTH <= size.width
    const left = fitsRight ? anchor.x + POPOVER_GAP : Math.max(POPOVER_GAP, anchor.x - POPOVER_GAP - POPOVER_WIDTH)
    const top = Math.min(
      Math.max(POPOVER_GAP, anchor.y - 24),
      Math.max(POPOVER_GAP, size.height - POPOVER_MAX_HEIGHT - POPOVER_GAP),
    )

    return { left, top }
  })

  const popoverVisible = createMemo(() => {
    const node = popoverNode()
    if (!node || popoverDismissed()) return undefined
    return node
  })

  const noteTargetNode = () => {
    const noteTarget = annotations.noteTarget()
    if (!noteTarget) return undefined
    return nodeByID(model(), noteTarget)
  }

  const peekEdge = createMemo(() => {
    if (!peek()) return undefined
    const id = edgeHovered()
    const m = model()
    return id ? m?.edges?.find((edge) => edge.id === id) : undefined
  })

  // Above the node's own box, so the peek never covers what it is about.
  const peekPlacement = createMemo(() => {
    const anchor = peekAnchor()
    if (!anchor) return undefined
    const half = ((CARD_SIZE[1] / CARD_SIZE[0]) * cardScreenWidth()) / 2

    return { left: anchor.x, top: anchor.y - half - 34 }
  })

  const peekFrame = createMemo(() => {
    const node = peekNode()
    const placement = peekPlacement()
    if (!node || !placement) return undefined

    return { node, left: placement.left, top: placement.top }
  })

  return {
    popoverNode,
    popoverAnchor,
    popoverPlacement,
    popoverVisible,
    peekNode,
    peekAnchor,
    peekPlacement,
    peekFrame,
    peekEdge,
    noteTargetNode,
    noteAnchor,
  }
}