import type { RenderTheme } from "@spacegraphjs/renderer"
import { renderToSVG } from "@spacegraphjs/svg-renderer"
import type { GraphModel, Layout } from "@opencode/session-ui/graph"
import { LAYOUT_STRATEGIES, layoutGraph } from "@opencode/session-ui/graph"
import { Icon } from "@opencode/ui/icon"
import { useI18n } from "@opencode/ui/context/i18n"
import { For, onMount } from "solid-js"
import { buildRenderModel } from "../canvas/buildRenderModel"
import { createCardCopy } from "./card-copy"
import { createCardTemplate } from "./cardTemplate"
import { LAYOUT_KEY } from "./vocabulary"
import { GraphIconButton } from "./GraphIconButton"

export type GraphGalleryProps = {
  model: GraphModel
  theme: RenderTheme
  /** The layout the reader is looking at; it is marked in the gallery. */
  current?: Layout
  /** Opens a layout in the full surface. */
  onOpen: (layout: Layout) => void
  onClose: () => void
}

/**
 * T7.5 — the layout gallery: the same model in every layout, side by side.
 *
 * Nobody knows which layout is best, so the point is to compare rather than to commit. Each
 * thumbnail is a static picture of the layout (the library's SVG renderer, no canvas and no WebGL
 * context), and picking one opens it in the full surface.
 */
export const GraphGallery = (props: GraphGalleryProps) => {
  const i18n = useI18n()
  let panel!: HTMLDivElement

  onMount(() => panel.focus())

  const thumbnails = () => {
    const renderCard = createCardTemplate(props.theme, { copy: createCardCopy(i18n) })

    return LAYOUT_STRATEGIES.map((strategy) => {
      const layout = layoutGraph(props.model, { strategy, level: "overview" })
      const model = buildRenderModel(props.model, {
        level: "overview",
        positions: layout.positions,
        edges: true,
        renderCard,
      })

      return { strategy, svg: renderToSVG(model, { theme: props.theme, padding: 16 }) }
    })
  }

  return (
    <div
      ref={panel}
      tabindex="-1"
      data-component="session-graph-gallery"
      data-slot="graph-gallery"
      class="absolute left-2 top-2 z-10 flex max-h-[calc(100%-1rem)] w-[min(56rem,calc(100%-1rem))] flex-col overflow-hidden rounded-md border border-border-base bg-background-base shadow-md outline-none"
      role="dialog"
      aria-label={i18n.t("ui.sessionGraph.gallery.label")}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return
        event.stopPropagation()
        props.onClose()
      }}
    >
      <div class="flex items-center gap-2 px-2 py-1.5">
        <Icon name="dot-grid" size="small" class="shrink-0 text-text-weak" />
        <span class="flex-1 text-14-regular text-text-strong">{i18n.t("ui.sessionGraph.gallery.label")}</span>
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.gallery.close")}
          icon="close-small"
          onClick={props.onClose}
        />
      </div>

      <div class="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto border-t border-border-weaker-base p-2 md:grid-cols-3">
        <For each={thumbnails()}>
          {(thumbnail) => (
            <button
              type="button"
              data-slot="graph-gallery-item"
              data-strategy={thumbnail.strategy}
              data-active={props.current === thumbnail.strategy ? "true" : undefined}
              aria-pressed={props.current === thumbnail.strategy}
              class="flex flex-col gap-1 rounded-sm border border-border-weaker-base p-1 text-start hover:border-border-base hover:bg-surface-base-hover"
              onClick={() => {
                props.onOpen(thumbnail.strategy)
                props.onClose()
              }}
            >
              <span class="block h-24 w-full overflow-hidden rounded-sm bg-surface-base">
                <span class="block h-full w-full [&>svg]:h-full [&>svg]:w-full" innerHTML={thumbnail.svg} />
              </span>
              <span class="text-12-regular text-text-base">{i18n.t(LAYOUT_KEY[thumbnail.strategy])}</span>
            </button>
          )}
        </For>
      </div>
    </div>
  )
}
