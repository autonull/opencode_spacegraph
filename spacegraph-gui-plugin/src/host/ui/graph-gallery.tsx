import type { RenderTheme } from "@spacegraphjs/renderer"
import { renderToSVG } from "@spacegraphjs/svg-renderer"
import { useI18n } from "../i18n"
import { For, onMount } from "solid-js"
import type { GraphViewData, Layout } from "../../model"
import { LAYOUT_STRATEGIES, layoutGraph } from "../../model"
import { buildRenderModel } from "../canvas/buildRenderModel"
import { createCardTemplate } from "./cardTemplate"
import { createCardCopy } from "./card-copy"

export type GalleryLabels = {
  title: string
  close: string
  layout: (strategy: Layout) => string
}

/** The same model in every layout, side by side, as static SVG pictures. Picking one opens it full size. */
export function GraphGallery(props: {
  model: GraphViewData
  theme: RenderTheme
  labels: GalleryLabels
  current?: Layout
  onOpen: (layout: Layout) => void
  onClose: () => void
}) {
  const i18n = useI18n()
  let panel!: HTMLDivElement
  onMount(() => panel.focus())

  const thumbnails = () => {
    const renderCard = createCardTemplate(props.theme, { copy: createCardCopy(i18n) })
    return LAYOUT_STRATEGIES.map((strategy) => {
      const layout = layoutGraph(props.model, { strategy, level: "overview" })
      const renderModel = buildRenderModel(props.model, {
        level: "overview",
        positions: layout.positions,
        edges: true,
        renderCard,
      })
      return { strategy, svg: renderToSVG(renderModel, { theme: props.theme, padding: 16 }) }
    })
  }

  return (
    <div
      ref={panel}
      tabindex="-1"
      class="sg-gallery"
      data-component="session-graph-gallery"
      data-slot="graph-gallery"
      role="dialog"
      aria-label={props.labels.title}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation()
          props.onClose()
        }
      }}
    >
      <div class="sg-gallery__head">
        <span>{props.labels.title}</span>
        <button type="button" aria-label={props.labels.close} onClick={props.onClose}>×</button>
      </div>
      <div class="sg-gallery__grid">
        <For each={thumbnails()}>
          {(thumbnail) => (
            <button
              type="button"
              data-slot="graph-gallery-item"
              data-strategy={thumbnail.strategy}
              aria-pressed={props.current === thumbnail.strategy}
              onClick={() => {
                props.onOpen(thumbnail.strategy)
                props.onClose()
              }}
            >
              <span class="sg-gallery__thumb" innerHTML={thumbnail.svg} />
              <span>{props.labels.layout(thumbnail.strategy)}</span>
            </button>
          )}
        </For>
      </div>
    </div>
  )
}
