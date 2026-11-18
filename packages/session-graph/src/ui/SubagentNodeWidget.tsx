import { createSignal, Show } from "solid-js"
import { useI18n } from "@opencode/ui/context/i18n"
import type { GraphViewData, GraphNode } from "@opencode/session-ui/graph"
import { subagentSubgraph } from "@opencode/session-ui/graph"
import { TurnMapInlineGraph } from "./TurnMapInlineGraph"
import "./subagent-node-widget.css"

/**
 * SubagentNodeWidget - renders a depth-1 static preview of a subagent's graph
 * inside a subagent node. Clicking the widget opens the full fractal drill-down.
 * 
 * Guards against recursion: max depth 1 in widgets, 2 in popovers.
 */
export type SubagentNodeWidgetProps = {
  /** The graph node this widget is attached to (must be kind="subagent") */
  node: GraphNode
  /** The full session graph model to extract the subagent subgraph from */
  model: GraphViewData
  /** Callback to open the full drill-down for this subagent */
  onDrillDown: (subagentID: string) => void
  /** Maximum depth of the preview (default: 1 for widgets) */
  maxDepth?: number
  /** Whether the widget is in a popover (allows depth 2) */
  inPopover?: boolean
}

export const SubagentNodeWidget = (props: SubagentNodeWidgetProps) => {
  const i18n = useI18n()
  const [isHovered, setIsHovered] = createSignal(false)
  
  // Calculate the maximum depth based on context
  // Widgets: depth 1, Popovers: depth 2
  const effectiveMaxDepth = props.inPopover ? 2 : (props.maxDepth ?? 1)

  // Build the subagent subgraph for the preview
  const subgraph = subagentSubgraph(props.model, props.node.id)
  
  // Limit nodes for the static preview based on max depth
  // For depth 1: show subagent + immediate children
  // For depth 2: show subagent + children + grandchildren
  const previewNodes = subgraph.nodes.slice(0, effectiveMaxDepth === 1 ? 6 : 12)
  const previewNodeIds = new Set(previewNodes.map((n) => n.id))
  const previewEdges = subgraph.edges.filter(
    (e) => previewNodeIds.has(e.source) && previewNodeIds.has(e.target)
  )

  const previewModel: GraphViewData = {
    ...props.model,
    nodes: previewNodes,
    edges: previewEdges,
    turns: [],
    root: props.node.id,
  }

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    props.onDrillDown(props.node.id)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      e.stopPropagation()
      props.onDrillDown(props.node.id)
    }
  }

  const nodeCount = subgraph.nodes.length
  const edgeCount = subgraph.edges.length

  return (
    <div
      class="subagent-node-widget"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={i18n.t("ui.sessionGraph.subagentWidget.drillDownLabel", { 
        label: props.node.label ?? "Subagent" 
      })}
      data-slot="subagent-node-widget"
      data-max-depth={effectiveMaxDepth}
    >
      <div class="subagent-node-widget-preview">
        <TurnMapInlineGraph
          model={previewModel}
          turnID={props.node.id}
          limit={effectiveMaxDepth === 1 ? 5 : 10}
          width={200}
          height={140}
          ariaLabel={i18n.t("ui.sessionGraph.subagentWidget.previewLabel", { 
            label: props.node.label ?? "Subagent" 
          })}
        />
      </div>
      <Show when={isHovered}>
        <div class="subagent-node-widget-overlay">
          <div class="subagent-node-widget-info">
            <span class="text-11-regular text-text-weak">
              {i18n.t("ui.sessionGraph.subagentWidget.nodeCount", { count: nodeCount })}
            </span>
            <span class="text-11-regular text-text-weak">
              {i18n.t("ui.sessionGraph.subagentWidget.edgeCount", { count: edgeCount })}
            </span>
          </div>
          <div class="subagent-node-widget-action">
            <span class="text-11-medium text-text-base">
              {i18n.t("ui.sessionGraph.subagentWidget.clickToExpand")}
            </span>
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M8 4l4 4-4 4" />
            </svg>
          </div>
        </div>
      </Show>
    </div>
  )
}