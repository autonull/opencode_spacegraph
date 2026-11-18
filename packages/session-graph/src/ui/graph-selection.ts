import { breadcrumbs, type GraphViewData } from "@opencode/session-ui/graph"
import { GraphController } from "spacegraphjs/control"
import { createEffect, createSignal, onCleanup } from "solid-js"

export type GraphSelectionOptions = {
  /** The model the selection is read from. */
  model: () => GraphViewData
  /** The host's controlled selection; the view mirrors it into the controller. */
  controlled: () => string | undefined
  /** The host is told what the reader selected. */
  onSelect: (id: string | undefined) => void
  /** The reader picked something: a surface that was showing the old node lets go. */
  onChange?: () => void
  /** The selection is an interaction, and the host counts it. */
  count?: () => void
}

export type GraphSelection = {
  /** The selected node ids; the first one is the one the reader is reading. */
  selection: () => readonly string[]
  /** The path to the selected node, from the session root down. */
  crumbs: () => readonly { id: string; label: string }[]
  /** Selects a node (or clears the selection). */
  select: (target: string | readonly string[] | undefined, counted?: boolean) => void
}

/**
 * The selection: what is selected, and the path to it.
 *
 * The library's controller owns the state — the selection and the trail — and the view mirrors it
 * into signals, so the DOM and the renderer read one source. The trail is seeded from the model's
 * own `part-of` ancestry, so one primitive backs both the selection and the breadcrumb line.
 */
export function createGraphSelection(options: GraphSelectionOptions): GraphSelection {
  const initial = options.controlled()
  const [selection, setSelection] = createSignal<readonly string[]>(initial ? [initial] : [])
  const [crumbs, setCrumbs] = createSignal<readonly { id: string; label: string }[]>([])
  const controller = new GraphController({ selection: initial ? [initial] : [] })

  const sameIDs = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((id, index) => id === b[index])

  controller.onChange((snapshot) => {
    setSelection((current) => (sameIDs(current, snapshot.selection) ? current : [...snapshot.selection]))
    setCrumbs(snapshot.trail.map((entry) => ({ id: entry.id, label: entry.label ?? entry.id })))
  })

  onCleanup(() => controller.dispose())

  const seedTrail = (id: string | undefined) => {
    controller.trail.reset()

    if (!id) return

    for (const node of breadcrumbs(options.model(), id))
      controller.trail.push({ id: node.id, label: node.label, kind: node.kind })
  }

  const select = (target: string | readonly string[] | undefined, counted = true) => {
    const id = typeof target === "string" ? target : target?.[0]
    controller.select(target ?? null)
    seedTrail(id)
    options.onChange?.()
    options.onSelect(id)
    // A permalink frames a node without a participant acting, so it is not an interaction.
    if (counted && id) options.count?.()
  }

  // Keep the controller's model in step with the host model; it reconciles selection + trail by id,
  // so streaming appends never clear either.
  createEffect(() => controller.setModel(options.model()))

  // Controlled selection: mirror the host value into the controller, and seed the path on mount.
  createEffect(() => {
    const next = options.controlled()
    if (next === undefined) return
    if (controller.selection[0] !== next) controller.select(next)
    seedTrail(next)
  })

  return { selection, crumbs, select }
}
