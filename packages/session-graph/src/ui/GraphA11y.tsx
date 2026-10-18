import { AccessibilityLayer, type AccessibleItem } from "spacegraphjs/a11y"
import type { RenderModel } from "@spacegraphjs/renderer"
import { useI18n } from "@opencode/ui/context/i18n"
import { createEffect, onCleanup, onMount } from "solid-js"

export type GraphA11yProps = {
  model: RenderModel
  selection?: readonly string[]
  /** Anchors the wrapper's `aria-describedby`; the instructions live here. */
  instructionsId?: string
  onSelect: (id: string) => void
  onEscape?: () => void
}

/**
 * The accessibility mirror (U3.14). It mounts the library `AccessibilityLayer` — a visually hidden,
 * ordered node list with roving tabindex, arrow traversal, Enter/Space selection, Escape, and an
 * `aria-live` announcement — over the current render model, so keyboard users reach every node the
 * canvas draws. The layer never imports a renderer, so it is identical in both.
 */
export const GraphA11y = (props: GraphA11yProps) => {
  const i18n = useI18n()
  let container!: HTMLDivElement
  let layer: AccessibilityLayer | undefined

  const items = (): AccessibleItem[] =>
    props.model.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      kind: node.kind,
      status: node.status,
      interactive: node.interactive !== false,
    }))

  onMount(() => {
    layer = new AccessibilityLayer(container, {
      label: i18n.t("ui.sessionGraph.a11y.label"),
      onSelect: (id) => props.onSelect(id),
      onEscape: () => props.onEscape?.(),
      formatSelection: (labels) =>
        labels.length
          ? i18n.t("ui.sessionGraph.a11y.selected", { labels: labels.join(", ") })
          : i18n.t("ui.sessionGraph.a11y.cleared"),
    })
  })

  createEffect(() => layer?.setItems(items()))
  createEffect(() => layer?.setSelected(props.selection ?? null))

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
