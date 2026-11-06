import { useI18n } from "@opencode/ui/context/i18n"
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import { GraphCanvas } from "../canvas/GraphCanvas"
import { GraphOverlayManager } from "./GraphOverlayManager"
import { attachTouchGestures } from "./graph-utils"
import type { GraphCanvasRegionProps } from "./GraphCanvasRegionProps"
import type { GraphRenderer, RendererViewport } from "@spacegraphjs/renderer"
import type { RendererID } from "../canvas/renderer-registry"

/**
 * The canvas region of the graph view — the renderer, overlays, and all interactive surfaces
 * that live on or above the canvas.
 */
export const GraphCanvasRegion = (props: GraphCanvasRegionProps) => {
  const i18n = useI18n()
  const [canvasRegionEl, setCanvasRegionEl] = createSignal<HTMLDivElement | undefined>()
  const [renderer, setRenderer] = createSignal<GraphRenderer | undefined>()

  // Subscribe to projection/depth getters so this component re-renders when they change
  const projection = createMemo(() => props.projection())
  const depth = createMemo(() => props.depth())

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
      class="relative min-w-0 flex-1"
      data-slot="graph-canvas-region"
      role="group"
      aria-label={i18n.t("ui.sessionGraph.canvas.label")}
      aria-describedby={props.a11yInstructionsId}
      tabindex="0"
      onKeyDown={props.handleRegionKeyDown}
    >
      <GraphCanvas
        model={props.renderModel()}
        theme={props.theme()}
        projection={projection()}
        depth={depth()}
        cardFacing={props.cardFacing()}
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
        a11yInstructionsId={props.a11yInstructionsId}
        announce={props.announce}
        i18n={props.i18n}
      />
    </div>
  )
}