import type { RenderTheme } from "@spacegraphjs/renderer"
import { nodeByID, type GraphModel } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js"
import { ScopedOverlay } from "spacegraphjs/overlays"
import { GraphCanvas } from "../canvas/GraphCanvas"
import type { CardTemplate } from "../canvas/buildRenderModel"
import type { RendererFactory, RendererID } from "../canvas/renderer-registry"
import { GraphInspector } from "./GraphInspector"
import { buildTurnRenderModel } from "./turnMap"
import { createGraphTheme } from "./theme"
import { GraphIconButton } from "./GraphIconButton"

export type TurnMapOverlayProps = {
  model: GraphModel
  /** The turn to summarize; the overlay is empty when it is not in the model. */
  turnID: string
  /** Defaults to the live host theme read from CSS tokens (U3.7). */
  theme?: RenderTheme
  /** Maximum nodes shown, including the turn itself (§H6.2: seven). */
  limit?: number
  preferredRenderer?: RendererID
  rendererOverrides?: Partial<Record<RendererID, RendererFactory>>
  renderCard?: CardTemplate
  onSelect?: (id: string | undefined) => void
  onOpenFullGraph?: (turnID: string) => void
  onClose: () => void
}

/**
 * The hybrid turn map (H6.2): a compact, execution-level subgraph of one turn opened over the
 * transcript so the reader keeps their place. It shows the same detail panel as the full graph,
 * traps focus, closes on Escape, and restores focus to the control that opened it. It is sized by
 * the host container, which must be `position: relative`.
 *
 * The scope and the focus behaviour live in the library (`spacegraphjs/overlays`); this component is
 * the session's vocabulary and its slots.
 */
export const TurnMapOverlay = (props: TurnMapOverlayProps) => {
  const i18n = useI18n()
  const resolvedTheme = createGraphTheme()
  const [selection, setSelection] = createSignal<readonly string[]>([])
  let dialog!: HTMLDivElement
  let overlay: ScopedOverlay | undefined

  const theme = () => props.theme ?? resolvedTheme()
  const turn = createMemo(() => nodeByID(props.model, props.turnID))
  const renderModel = createMemo(() =>
    buildTurnRenderModel(props.model, props.turnID, { limit: props.limit ?? 7, renderCard: props.renderCard }),
  )
  const selectedNode = () => {
    const id = selection()[0]

    return id ? nodeByID(props.model, id) : undefined
  }
  const select = (id: string | undefined) => {
    setSelection(id ? [id] : [])
    props.onSelect?.(id)
  }

  onMount(() => {
    overlay = new ScopedOverlay({ container: dialog, onClose: () => props.onClose() })
  })
  onCleanup(() => {
    overlay?.dispose()
    overlay = undefined
  })

  return (
    <div class="absolute inset-0 z-40 flex items-center justify-center p-4" data-component="session-graph-turn-map">
      <div class="absolute inset-0 bg-background-base/60" aria-hidden="true" onClick={() => props.onClose()} />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={i18n.t("ui.sessionGraph.turnMap.label")}
        tabindex="-1"
        data-slot="graph-turn-map"
        class="relative flex h-[min(520px,100%)] w-[min(760px,100%)] flex-col overflow-hidden rounded-md border border-border-base bg-background-base shadow-lg"
      >
        <div class="flex items-center gap-2 border-b border-border-weaker-base px-3 py-1.5">
          <span class="text-13-medium text-text-strong" style={{ "line-height": "var(--line-height-compact)" }}>
            {i18n.t("ui.sessionGraph.turnMap.title")}
          </span>
          <span class="min-w-0 flex-1 truncate text-12-regular text-text-weak">{turn()?.label ?? ""}</span>
          <GraphIconButton
          label={i18n.t("ui.sessionGraph.turnMap.close")}
          icon="close"
          onClick={() => props.onClose()}
        />
        </div>
        <div class="relative flex min-h-0 flex-1">
          <div class="relative min-w-0 flex-1" data-slot="graph-turn-map-canvas">
            <GraphCanvas
              model={renderModel()}
              theme={theme()}
              selection={selection()}
              preferredRenderer={props.preferredRenderer}
              overrides={props.rendererOverrides}
              onSelect={(ids) => select(ids[0])}
              onBackgroundClick={() => select(undefined)}
            />
          </div>
          <div class="w-64 max-w-[45%] shrink-0">
            <GraphInspector model={props.model} node={selectedNode()} onSelect={select} />
          </div>
        </div>
        <Show when={props.onOpenFullGraph}>
          <div class="flex items-center justify-end border-t border-border-weaker-base px-3 py-1.5">
            <button
              type="button"
              class="rounded-sm border border-border-base px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
              onClick={() => props.onOpenFullGraph?.(props.turnID)}
            >
              {i18n.t("ui.sessionGraph.turnMap.openFull")}
            </button>
          </div>
        </Show>
      </div>
    </div>
  )
}
