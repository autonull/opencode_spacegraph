import { useI18n } from "@opencode/ui/context/i18n"
import { createEffect, createSignal, onCleanup, For, Show } from "solid-js"
import { GraphCanvas } from "../canvas/GraphCanvas"
import { GraphOverlayManager } from "./GraphOverlayManager"
import { NodeWidgetLayer } from "./NodeWidgetLayer"
import { attachTouchGestures } from "./graph-utils"
import type { GraphCanvasRegionProps } from "./GraphCanvasRegionProps"
import type { GraphRenderer, RendererViewport } from "@spacegraphjs/renderer"
import type { RendererID } from "../canvas/renderer-registry"
import type { GraphNode } from "@opencode/session-ui/graph"
import type { JSX } from "solid-js"

/**
 * The canvas region of the graph view — the renderer, overlays, and all interactive surfaces
 * that live on or above the canvas.
 */
export const GraphCanvasRegion = (props: GraphCanvasRegionProps & {
  renderNodeWidget?: (node: GraphNode) => JSX.Element | undefined
}) => {
  const i18n = useI18n()
  const [canvasRegionEl, setCanvasRegionEl] = createSignal<HTMLDivElement | undefined>()
  const [renderer, setRenderer] = createSignal<GraphRenderer | undefined>()

  // V117: Touch gestures for mobile - set up when renderer and canvas are available
  createEffect(() => {
    const r = renderer()
    const el = canvasRegionEl()
    if (!r || !el) return
    const cleanup = attachTouchGestures(el, {
      getViewport: () => r.getViewport?.(),
      setViewport: (vp: RendererViewport) => r.setViewport?.(vp),
      capabilities: r.capabilities ?? { zoomRange: { min: 0.1, max: 10 } },
    })
    onCleanup(cleanup)
  })

  return (
    <div
      ref={setCanvasRegionEl}
      class="relative min-w-0 flex-1 flex flex-col"
      data-slot="graph-canvas-region"
      role="group"
      aria-label={i18n.t("ui.sessionGraph.canvas.label")}
      aria-describedby={props.a11yInstructionsId}
      tabindex="0"
      onKeyDown={props.handleRegionKeyDown}
    >
      {/* Drill-down breadcrumbs (Phase 10.3) */}
      <Show when={props.canDrillDown()}>
        <div class="flex items-center gap-1 px-2 py-1 border-b border-border-weaker-base bg-background-base/95 backdrop-blur-sm">
          <span class="text-11-regular text-text-weak">{i18n.t("ui.sessionGraph.drillDown.breadcrumbLabel")}</span>
          <For each={props.drillDownStack()}>
            {(entry, index) => (
              <span class="flex items-center gap-1">
                <span class="text-11-regular text-text-base px-1.5 py-0.5 rounded-sm bg-surface-base-hover">
                  {props.model().nodes.find((n) => n.id === entry.selection)?.label ?? entry.selection ?? "Session"}
                </span>
                <Show when={index() < props.drillDownStack().length - 1}>
                  <span class="text-text-weaker" aria-hidden="true">›</span>
                </Show>
              </span>
            )}
          </For>
          <button
            type="button"
            class="flex items-center gap-1 ml-2 rounded-sm px-2 py-1 text-11-regular text-text-base hover:bg-surface-base-hover"
            onClick={props.exitDrillDown}
            aria-label={i18n.t("ui.sessionGraph.drillDown.exit")}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 12l-4-4 4-4" />
            </svg>
            <span>{i18n.t("ui.sessionGraph.drillDown.exit")}</span>
          </button>
        </div>
      </Show>
      <div class="relative min-w-0 flex-1">
        <GraphCanvas
        model={props.renderModel()}
        theme={props.theme()}
        projection={props.projection}
        depth={props.depth}
        cardFacing={props.cardFacing}
        selection={props.selection()}
        preferredRenderer={props.preferredRenderer}
        overrides={props.rendererOverrides}
        onSelect={(ids) => {
          props.setGroupMenu(undefined)
          if (ids.length > 0) props.select(ids[0])
        }}
        onNodeDoubleClick={props.onNodeDoubleClick}
        onBackgroundClick={() => {
          props.setGroupMenu(undefined)
          props.select(undefined)
        }}
        onHover={props.onHover}
        onEdgeHover={props.onEdgeHover}
        onEdgeSelect={props.onEdgeSelect}
        onGroupToggle={props.onGroupToggle}
        onGroupMenu={(id, at) => {
          const rect = canvasRegionEl()?.getBoundingClientRect()
          if (rect) props.setGroupMenu({ id, x: at.x - rect.left, y: at.y - rect.top })
        }}
        onNodeMoved={props.onNodeMoved}
        onNodeResized={props.onNodeResized}
        onModelApplied={props.applyModel}
        onRenderer={(instance) => {
          props.onRenderer?.(instance)
        }}
        onRendererMounted={(renderer: GraphRenderer, id: RendererID) => {
          setRenderer(renderer)
          props.onRendererMounted?.(renderer, id)
        }}
        onReady={props.onReady}
        onViewportChange={props.onViewportChange}
        onError={props.onError}
        reducedMotion={props.reducedMotion()}
        global={props.global()}
      />
      <NodeWidgetLayer
        renderer={() => renderer()}
        contentIDs={props.contentIDs}
        renderWidget={props.renderNodeWidget ?? (() => undefined)}
        model={props.model}
        container={canvasRegionEl}
      />
      <GraphOverlayManager
        // Model & theme
        model={props.model}
        theme={props.theme()}
        projection={props.projection()}
        depth={props.depth()}
        detailMode={props.detailMode()}
        effectiveDetailMode={props.effectiveDetailMode()}
        layout={props.layout()}

        // Selection & navigation
        selection={props.selection}
        select={props.select}
        graphSelection={props.graphSelection}

        // Peek
        peekFrame={props.peekFrame()}
        peekEdge={props.peekEdge()}

        // Popover
        popoverVisible={props.popoverVisible()}
        popoverNode={props.popoverNode()}
        popoverPlacement={props.popoverPlacement()}
        setPopoverDismissed={props.setPopoverDismissed}

        // Annotations (notes + trace)
        annotations={props.annotations}
        noteTargetNode={props.noteTargetNode}
        noteAnchor={props.noteAnchor}

        // Search
        searchOpen={props.searchOpen}
        searchInitial={props.searchInitial() ?? ""}
        setSearchOpen={props.setSearchOpen}
        jumpTo={props.jumpTo}
        contentIDs={props.contentIDs}

        // Legend
        legendOpen={props.legendOpen}
        setLegendOpen={props.setLegendOpen}
        edgeKinds={props.edgeKinds}
        rules={props.rules()}

        // Gallery
        galleryOpen={props.galleryOpen}
        setGalleryOpen={props.setGalleryOpen}
        changeLayout={props.changeLayout}

        // Group menu
        groupMenu={props.groupMenu}
        setGroupMenu={props.setGroupMenu}
        groupCollapse={props.groupCollapse}
        camera={props.camera}
        toggleGroupByID={props.toggleGroupByID}
        modelForGroupMenu={props.modelForGroupMenu}

        // Error/Empty states
        error={props.error() ?? ""}
        onBack={props.onBack}

        // Diff
        diffSource={props.diffSource}
        link={props.link}
        onOpenTranscript={props.onOpenTranscript}
        onOpenSession={props.onOpenSession}
        onOpenWindow={props.onOpenWindow}
        onCopyView={props.onCopyView}
        renderSummary={props.renderSummary}

        // A11y
        renderModel={props.renderModel()}
        viewAnnouncement={props.viewAnnouncement()}
        groupAnnouncement={props.groupAnnouncement()}
        a11yInstructionsId={props.a11yInstructionsId}
        announce={props.announce}
        i18n={props.i18n}
      />
      </div>
    </div>
  )
}