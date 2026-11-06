import { AccessibilityLayer, type AccessibleEdge, type AccessibleItem } from "@spacegraphjs/a11y"
import type { RenderModel } from "@spacegraphjs/renderer"
import { useI18n } from "@opencode/ui/context/i18n"
import { createEffect, onCleanup, onMount } from "solid-js"

export type GraphA11yProps = {
  model: RenderModel
  selection?: readonly string[]
  /** Anchors the wrapper's `aria-describedby`; the instructions live here. */
  instructionsId?: string
  /** T6.8: what the view changed (level, representation, depth); announced when it changes. */
  announcement?: string
  /** Current zoom band for group state determination (folded/summary/expanded). */
  band?: "overview" | "execution" | "detail"
  /** Explicitly collapsed group IDs. */
  collapsedGroups?: ReadonlySet<string>
  onSelect: (id: string) => void
  onEscape?: () => void
}

/**
 * The accessibility mirror (U3.14). It mounts the library `AccessibilityLayer` — a visually hidden,
 * ordered node list with roving tabindex, arrow traversal, Enter/Space selection, Escape, and an
 * `aria-live` announcement — over the current render model, so keyboard users reach every node the
 * canvas draws. The layer never imports a renderer, so it is identical in both.
 *
 * T4.7: the mirror also lists the connections and announces the ones of the selected node, so the
 * structure of the graph is reachable and not only its nodes.
 *
 * Phase 4.6: Groups are exposed as tree items with children when expanded, and aria-expanded
 * reflects the group state (folded/summary/expanded).
 */
export const GraphA11y = (props: GraphA11yProps) => {
  const i18n = useI18n()
  let container!: HTMLDivElement
  let layer: AccessibilityLayer | undefined
  let announced: string | undefined

  const items = (): AccessibleItem[] => {
    const nodes = props.model.nodes.filter((node) => node.interactive !== false)
    const nodeMap = new Map(nodes.map((node) => [node.id, node]))
    const band = props.band ?? "overview"
    const collapsedGroups = props.collapsedGroups ?? new Set<string>()

    // Build parent -> children map from the `parent` field on nodes
    const childrenMap = new Map<string, string[]>()
    for (const node of nodes) {
      if (node.parent) {
        const existing = childrenMap.get(node.parent)
        if (existing) existing.push(node.id)
        else childrenMap.set(node.parent, [node.id])
      }
    }

    // Determine group state for each group node
    const isGroupNode = (node: typeof nodes[0]) =>
      (node.kind === "phase" ||
        node.kind === "file-group" ||
        node.kind === "error-group" ||
        node.kind === "subagent-group") &&
      node.shape === "group"

    const getGroupState = (node: typeof nodes[0]): "folded" | "summary" | "expanded" => {
      if (!isGroupNode(node)) return "expanded"
      const explicitlyCollapsed = collapsedGroups.has(node.id)
      if (band === "overview") return "folded"
      if (explicitlyCollapsed) return "summary"
      return "expanded"
    }

    // Build tree recursively
    const buildTree = (nodeIds: string[]): AccessibleItem[] => {
      const result: AccessibleItem[] = []
      for (const id of nodeIds) {
        const node = nodeMap.get(id)
        if (!node) continue

        const groupState = getGroupState(node)
        const hasChildren = childrenMap.has(node.id)
        const isExpanded = groupState === "expanded"

        const item: AccessibleItem = {
          id: node.id,
          label: node.label,
          kind: node.kind,
          status: node.status,
          interactive: true,
          expanded: hasChildren ? isExpanded : undefined,
          children: hasChildren && isExpanded ? buildTree(childrenMap.get(node.id)!) : undefined,
        }
        result.push(item)
      }
      return result
    }

    // Root nodes are those without a parent
    const rootIds = nodes.filter((node) => !node.parent).map((node) => node.id)
    return buildTree(rootIds)
  }

  const edges = (): AccessibleEdge[] => {
    const labels = new Map(props.model.nodes.map((node) => [node.id, node.label]))

    return props.model.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      kind: edge.kind,
      label: `${labels.get(edge.source) ?? edge.source} → ${labels.get(edge.target) ?? edge.target}`,
    }))
  }

  onMount(() => {
    layer = new AccessibilityLayer(container, {
      label: i18n.t("ui.sessionGraph.a11y.label"),
      edgeLabel: i18n.t("ui.sessionGraph.a11y.edgeLabel"),
      onSelect: (id) => props.onSelect(id),
      onEscape: () => props.onEscape?.(),
      formatSelection: (labels) =>
        labels.length
          ? i18n.t("ui.sessionGraph.a11y.selected", { labels: labels.join(", ") })
          : i18n.t("ui.sessionGraph.a11y.cleared"),
      edgeAnnouncer: (connections) =>
        connections.length
          ? i18n.t("ui.sessionGraph.a11y.connections", { edges: connections.map((edge) => edge.label).join(", ") })
          : "",
    })
    // The first view state is not a change, so it is not announced.
    announced = props.announcement
  })

  createEffect(() => layer?.setItems(items()))
  createEffect(() => layer?.setEdges(edges()))
  createEffect(() => layer?.setSelected(props.selection ?? null))
  // T6.8: the view says what it changed, so a screen-reader user knows the map moved.
  createEffect(() => {
    const message = props.announcement
    if (!message || message === announced) return
    announced = message
    layer?.announce(message)
  })

  onCleanup(() => {
    layer?.dispose()
    layer = undefined
  })

  return (
    <>
      <p id={props.instructionsId} data-slot="graph-a11y-instructions" class="sr-only">
        {i18n.t("ui.sessionGraph.a11y.instructions")}
      </p>
      <div ref={container} data-component="session-graph-a11y" data-slot="graph-a11y" />
    </>
  )
}