import type { RenderModel } from "@spacegraphjs/renderer"
import { AccessibilityLayer, type AccessibleEdge, type AccessibleItem } from "spacegraphjs/a11y"
import { createEffect, onCleanup, onMount } from "solid-js"

export type GraphA11yProps = {
  model: RenderModel
  selection?: readonly string[]
  instructionsId?: string
  announcement?: string
  label: string
  edgeLabel: string
  instructions: string
  selectedMessage: (labels: readonly string[]) => string
  clearedMessage: string
  connectionsMessage: (edges: readonly string[]) => string
  onSelect: (id: string) => void
  onEscape?: () => void
}

/** Visually hidden, keyboard-navigable mirror of the canvas nodes and their connections. */
export function GraphA11y(props: GraphA11yProps) {
  let container!: HTMLDivElement
  let layer: AccessibilityLayer | undefined
  let announced: string | undefined

  const items = (): AccessibleItem[] =>
    props.model.nodes
      .filter((node) => node.interactive !== false)
      .map((node) => ({
        id: node.id,
        label: node.label,
        kind: node.kind,
        status: node.status,
        interactive: true,
      }))

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
      label: props.label,
      edgeLabel: props.edgeLabel,
      onSelect: (id) => props.onSelect(id),
      onEscape: () => props.onEscape?.(),
      formatSelection: (labels) => (labels.length ? props.selectedMessage(labels) : props.clearedMessage),
      edgeAnnouncer: (connections) => (connections.length ? props.connectionsMessage(connections.map((edge) => edge.label ?? "")) : ""),
    })
    announced = props.announcement
  })

  createEffect(() => layer?.setItems(items()))
  createEffect(() => layer?.setEdges(edges()))
  createEffect(() => layer?.setSelected(props.selection ?? null))
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
        {props.instructions}
      </p>
      <div ref={container} data-component="session-graph-a11y" data-slot="graph-a11y" />
    </>
  )
}
