import type {
  RenderTheme,
  Projection,
  RenderModel,
} from "@spacegraphjs/renderer"
import type {
  DetailMode,
  EqualizerRuleSet,
  GraphViewData,
  GraphNode,
  GraphEdge,
  Layout,
} from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { Show, type JSX } from "solid-js"
import { GraphA11y } from "./GraphA11y"
import { GraphLegend } from "./GraphLegend"
import type { GraphDiffSource } from "./GraphDiff"
import { GraphNoteComposer } from "./GraphNoteComposer"
import { GraphPeek } from "./GraphPeek"
import { GraphPopover } from "./GraphPopover"
import { GraphSearch } from "./GraphSearch"
import { GraphGroupMenu } from "./GraphGroupMenu"
import { GraphGallery } from "./GraphGallery"
import { GraphError } from "./GraphError"
import { GraphEmpty } from "./GraphEmpty"
import { createGraphCamera } from "./graph-camera"
import { createNodeAnchor } from "./graph-anchors"
import type { UseGraphAnnotationsReturn } from "./useGraphAnnotations"
import type { UseGraphSelectionReturn } from "./useGraphSelection"

export type GraphOverlayManagerProps = {
  // Model & theme
  model: () => GraphViewData
  theme: RenderTheme
  projection: Projection
  depth: "flat" | "layered" | "depth-stack" | "orbit"
  detailMode: DetailMode
  effectiveDetailMode: DetailMode
  layout: Layout

  // Selection & navigation
  selection: () => readonly string[]
  select: (id: string | undefined, add?: boolean) => void
  graphSelection: UseGraphSelectionReturn

  // Peek
  peekFrame: { node: GraphNode; left: number; top: number } | undefined
  peekEdge: GraphEdge | undefined

  // Popover
  popoverVisible: GraphNode | undefined
  popoverNode: GraphNode | undefined
  popoverPlacement: { left: number; top: number }
  setPopoverDismissed: (dismissed: boolean) => void

  // Annotations (notes + trace)
  annotations: UseGraphAnnotationsReturn
  noteTargetNode: () => GraphNode | undefined
  noteAnchor: ReturnType<typeof createNodeAnchor>

  // Search
  searchOpen: () => boolean
  searchInitial: string
  setSearchOpen: (open: boolean) => void
  jumpTo: (node: GraphNode) => void

  // Legend
  legendOpen: () => boolean
  setLegendOpen: (open: boolean) => void
  edgeKinds: ReturnType<typeof import("./useEdgeKinds").useEdgeKinds>
  rules: EqualizerRuleSet | undefined

  // Gallery
  galleryOpen: () => boolean
  setGalleryOpen: (open: boolean) => void
  changeLayout: (next: Layout) => void

  // Group menu
  groupMenu: () => { id: string; x: number; y: number } | undefined
  setGroupMenu: (menu: { id: string; x: number; y: number } | undefined) => void
  groupCollapse: ReturnType<typeof import("./useGroupCollapse").useGroupCollapse>
  camera: ReturnType<typeof createGraphCamera>
  toggleGroupByID: (id: string) => void
  modelForGroupMenu: () => GraphViewData

  // Error/Empty states
  error: string | undefined
  onBack: (() => void) | undefined

  // Diff
  diffSource: GraphDiffSource | undefined
  link: string | undefined
  onOpenTranscript: ((id: string) => void) | undefined
  onOpenSession: ((sessionID: string) => void) | undefined
  onOpenWindow: ((kind: string, nodeID?: string) => void) | undefined
  onCopyView: () => void
  renderSummary: ((node: GraphNode) => JSX.Element | undefined) | undefined

  // A11y
  ordered: RenderModel
  viewAnnouncement: string
  a11yInstructionsId: string
  announce: (message: string) => void
  i18n: ReturnType<typeof useI18n>
}

/**
 * The overlay manager for the graph canvas — all floating overlays that live
 * on or above the canvas (peek, popover, note composer, search, legend, gallery, group menu, A11y, error/empty states).
 */
export const GraphOverlayManager = (props: GraphOverlayManagerProps) => {

  return (
    <>
      <GraphA11y
        model={props.ordered}
        selection={props.selection()}
        instructionsId={props.a11yInstructionsId}
        announcement={props.viewAnnouncement}
        onSelect={props.select}
        onEscape={() => props.select(undefined)}
      />
      <Show when={props.peekFrame}>
        {(frame) => (
          <div
            data-slot="graph-peek-anchor"
            class="absolute z-20 -translate-x-1/2"
            style={{ left: `${frame().left}px`, top: `${frame().top}px` }}
          >
            <GraphPeek node={frame().node} />
          </div>
        )}
      </Show>
      <Show when={props.peekEdge}>
        {(edge) => (
          <div data-slot="graph-edge-peek-anchor" class="absolute bottom-2 left-2 z-20">
            <GraphPeek edge={edge()} />
          </div>
        )}
      </Show>
      <Show when={props.annotations.noteTarget()}>
        <GraphNoteComposer
          targetLabel={props.noteTargetNode()?.label ?? props.annotations.noteTarget() ?? ""}
          initialValue={props.annotations.editingNote() ? (props.annotations.notes as unknown as Record<string, { body: string }>)[props.annotations.editingNote()!]?.body : undefined}
          anchor={props.noteAnchor()}
          onSave={props.annotations.saveNote}
          onClose={props.annotations.closeNoteComposer}
        />
      </Show>
      <Show when={props.effectiveDetailMode === "popover"}>
        <div
          data-slot="graph-popover-anchor"
          class="absolute z-20"
          style={{
            left: `${props.popoverPlacement.left}px`,
            top: `${props.popoverPlacement.top}px`,
            display: props.popoverVisible ? "block" : "none",
          }}
        >
          <GraphPopover
            model={props.model()}
            node={props.popoverNode}
            diffSource={props.diffSource}
            renderSummary={props.renderSummary}
            link={props.link}
            onCopyView={props.onCopyView}
            onSelect={props.select}
            onOpenTranscript={props.onOpenTranscript}
            onOpenSession={props.onOpenSession}
            onOpenWindow={props.onOpenWindow ? (node) => props.onOpenWindow!("node", node.id) : undefined}
            onClose={() => props.setPopoverDismissed(true)}
            traceKind={props.annotations.traceKind()}
            onTraceWhy={props.annotations.traceWhy}
            onTraceLedHere={props.annotations.traceLedHere}
            onTraceRelated={props.annotations.traceRelated}
            onClearTrace={props.annotations.clearTrace}
            onCopyTraceOutline={props.annotations.copyTraceOutline}
            onEditNote={props.annotations.editNote}
            onDeleteNote={props.annotations.deleteNote}
            onCopyNote={props.annotations.copyNote}
          />
        </div>
      </Show>
      <GraphError error={props.error} onBack={props.onBack} />
      <GraphEmpty model={props.model} error={props.error} />
      <Show when={props.searchOpen()}>
        <GraphSearch
          model={props.model()}
          initialQuery={props.searchInitial}
          onSelect={(node) => {
            props.jumpTo(node)
            props.setSearchOpen(false)
          }}
          onClose={() => props.setSearchOpen(false)}
        />
      </Show>
      <Show when={props.legendOpen()}>
        <GraphLegend
          theme={props.theme}
          layout={props.layout}
          rules={props.rules}
          edgeKinds={props.edgeKinds.edgeKinds()}
          onToggleEdgeKind={props.edgeKinds.toggleEdgeKind}
          onClose={() => props.setLegendOpen(false)}
        />
      </Show>
      <Show when={props.galleryOpen()}>
        <GraphGallery
          model={props.model()}
          theme={props.theme}
          current={props.layout}
          onOpen={props.changeLayout}
          onClose={() => props.setGalleryOpen(false)}
        />
      </Show>
      <Show when={props.groupMenu()}>
        {(menu) => (
          <GraphGroupMenu
            id={menu().id}
            x={menu().x}
            y={menu().y}
            model={props.modelForGroupMenu}
            collapsedGroups={props.groupCollapse.collapsedGroups()}
            onToggleGroup={props.toggleGroupByID}
            onCollapseOthers={props.groupCollapse.collapseOtherGroups}
            onFrame={(id) => props.camera.frame([id])}
            onClose={() => props.setGroupMenu(undefined)}
          />
        )}
      </Show>
    </>
  )
}