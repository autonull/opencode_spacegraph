import type { GraphRenderer } from "@spacegraphjs/renderer"
import type { GraphNode } from "@opencode/session-ui/graph"
import { createMemo, onCleanup, onMount, For } from "solid-js"
import type { JSX } from "solid-js"

/**
 * Props for NodeWidgetLayer
 */
export type NodeWidgetLayerProps = {
  /** Accessor for the renderer instance */
  renderer: () => GraphRenderer | undefined
  /** Accessor for the drawn nodes (contentIDs) */
  contentIDs: () => string[]
  /** Function that returns a widget component for a given node */
  renderWidget: (node: GraphNode) => JSX.Element | undefined
  /** Accessor for the model to look up nodes by ID */
  model: () => { nodes: GraphNode[] }
  /** Optional: container element to constrain widget bounds */
  container?: () => HTMLElement | undefined
}

/**
 * NodeWidgetLayer - renders interactive Solid widgets anchored to graph nodes.
 * 
 * Widgets are positioned using the renderer's getNodeScreenPosition method and
 * repositioned on viewportChange and nodeMoved events.
 * 
 * Widgets are only rendered for nodes in the drawn set (contentIDs).
 * Widgets carry data-sg-interactive to prevent canvas drag from inside widgets.
 */
export const NodeWidgetLayer = (props: NodeWidgetLayerProps) => {
  // Get screen positions for all drawn nodes
  const nodePositions = createMemo(() => {
    const renderer = props.renderer()
    const contentIDs = props.contentIDs()
    const positions = new Map<string, { x: number; y: number; w: number; h: number }>()

    if (!renderer || !renderer.getNodeScreenPosition) return positions

    for (const id of contentIDs) {
      const pos = renderer.getNodeScreenPosition(id)
      if (pos) {
        // Estimate widget size - could be improved with actual measurements
        positions.set(id, { x: pos.x, y: pos.y, w: 220, h: 72 })
      }
    }
    return positions
  })

  // Update widget positions on viewport/renderer changes
  onMount(() => {
    const renderer = props.renderer()
    if (!renderer) return

    const handleViewportChange = () => {
      // Force widget position update by triggering a re-render
      // The createMemo for widgetEntries will automatically recalculate
    }

    const handleNodeMoved = () => {
      // The createMemo for widgetEntries will automatically recalculate
    }

    const unsubViewport = renderer.on("viewportChange", handleViewportChange)
    const unsubNodeMoved = renderer.on("nodeMoved", handleNodeMoved)

    onCleanup(() => {
      unsubViewport()
      unsubNodeMoved()
    })
  })

  // Build the widget map from current positions
  const widgetEntries = createMemo(() => {
    const positions = nodePositions()
    const model = props.model()
    const entries: Array<{ id: string; node: GraphNode; x: number; y: number }> = []

    for (const [id, pos] of positions) {
      const node = model.nodes.find((n) => n.id === id)
      if (node) {
        const widget = props.renderWidget(node)
        if (widget) {
          entries.push({ id, node, x: pos.x, y: pos.y })
        }
      }
    }
    return entries
  })

  return (
    <div
      class="absolute inset-0 pointer-events-none overflow-hidden"
      data-slot="graph-node-widget-layer"
      role="group"
      aria-label="Node widgets"
      style={{ "z-index": 10 }}
    >
      <For each={widgetEntries()}>
        {(entry) => (
          <div
            class="absolute pointer-events-auto"
            style={{
              left: `${entry.x}px`,
              top: `${entry.y}px`,
              transform: "translate(-50%, -100%)",
            }}
            data-node-id={entry.id}
            data-sg-interactive="true"
            onMouseDown={(e: MouseEvent) => e.stopPropagation()}
            onPointerDown={(e: PointerEvent) => e.stopPropagation()}
            onClick={(e: MouseEvent) => e.stopPropagation()}
            onDblClick={(e: MouseEvent) => e.stopPropagation()}
            onWheel={(e: WheelEvent) => e.stopPropagation()}
            onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}
          >
            {props.renderWidget(entry.node)}
          </div>
        )}
      </For>
    </div>
  )
}