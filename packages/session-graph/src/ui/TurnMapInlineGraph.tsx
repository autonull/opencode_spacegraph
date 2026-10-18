import type { RenderTheme } from "@spacegraphjs/renderer"
import { InlineGraph } from "@spacegraphjs/svg-renderer"
import { useI18n } from "@opencode/ui/context/i18n"
import type { GraphModel } from "@opencode/session-ui/graph"
import { createEffect, createMemo, onCleanup, onMount } from "solid-js"
import { buildTurnRenderModel } from "./turnMap"

export type TurnMapInlineGraphProps = {
  model: GraphModel
  turnID: string
  /** Partial theme override for the static SVG; the library fills the rest from its own defaults. */
  theme?: Partial<RenderTheme>
  /** Maximum nodes shown, including the turn itself (§H6.4: five). */
  limit?: number
  width?: number
  height?: number
  /** Accessible name; defaults to the localized `ui.sessionGraph.inline.label`. */
  ariaLabel?: string
}

/**
 * The generic inline subgraph (H6.4): a thin, non-interactive wrapper over the library
 * `@spacegraphjs/svg-renderer` `InlineGraph`. It adds no graph logic of its own, is theme-aware, and
 * renders a turn-scoped execution subset as static SVG, so it can sit inside the log without pan or
 * zoom. The whole-frame rebuild on `theme`/size change is a host remount concern; only the model
 * updates in place.
 */
export const TurnMapInlineGraph = (props: TurnMapInlineGraphProps) => {
  const i18n = useI18n()
  let host!: HTMLDivElement
  let graph: InlineGraph | undefined

  const renderModel = createMemo(() => buildTurnRenderModel(props.model, props.turnID, { limit: props.limit ?? 5 }))

  onMount(() => {
    graph = new InlineGraph(host, { theme: props.theme, width: props.width, height: props.height })
    graph.setModel(renderModel())
  })

  createEffect(() => graph?.setModel(renderModel()))

  onCleanup(() => {
    graph?.dispose()
    graph = undefined
  })

  return (
    <div
      ref={host}
      data-slot="graph-turn-inline"
      role="img"
      aria-label={props.ariaLabel ?? i18n.t("ui.sessionGraph.inline.label")}
    />
  )
}
