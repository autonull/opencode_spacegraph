import { createMemo } from "solid-js"
import type { BuildCanvasRegionPropsInput } from "./GraphCanvasRegionProps"
import type { GraphViewProps } from "./GraphView"
import type { GraphRenderer, RendererViewport } from "@spacegraphjs/renderer"
import type { UseGraphSelectionReturn } from "./useGraphSelection"
import type { UseGraphAnnotationsReturn } from "./useGraphAnnotations"
import type { UseGroupCollapseReturn } from "./useGroupCollapse"
import type { UseEdgeKindsReturn } from "./useEdgeKinds"
import type { GraphViewportTrackerReturn } from "./useGraphViewport"
import type { GraphViewData, GraphNode, GraphEdge, DetailMode, Layout, ZoomLevel, EqualizerRuleSet } from "@opencode/session-ui/graph"
import type { RenderModel } from "@spacegraphjs/renderer"
import type { RenderTheme } from "@spacegraphjs/renderer"
import type { Projection } from "@spacegraphjs/renderer"
import type { JSX } from "solid-js"
import { createNodeAnchor } from "./graph-anchors"

export function useCanvasRegionProps(
  props: GraphViewProps,
  state: {
    model: () => GraphViewData
    theme: () => RenderTheme
    renderModel: () => RenderModel
    projection: () => Projection
    depth: () => "flat" | "layered" | "depth-stack" | "orbit"
    layout: () => Layout
    level: () => ZoomLevel
    selection: () => readonly string[]
    select: (id: string | undefined, add?: boolean) => void
    expandToGraph: (id: string) => void
    onHover: (id: string | undefined) => void
    onEdgeHover: (id: string | undefined) => void
    onEdgeSelect: (id: string) => void
    onGroupToggle: (id: string) => void
    onGroupMenu: (id: string, at: { x: number; y: number }) => void
    moveNodes: (nodes: readonly { id: string; position: [number, number, number] }[]) => void
    resizeNode: (resize: { id: string; size: [number, number]; position: [number, number, number] }) => void
    cardFacing: () => "plane" | "camera"
    applyModel: (instance: GraphRenderer) => void
    preferredRenderer: () => import("../canvas/renderer-registry").RendererID | undefined
    rendererOverrides: GraphViewProps["rendererOverrides"]
    reducedMotion: () => boolean
    detailMode: () => DetailMode
    effectiveDetailMode: () => DetailMode
    files: () => boolean
    debugMode: () => boolean
    peekFrame: () => { node: GraphNode; left: number; top: number } | undefined
    peekEdge: () => GraphEdge | undefined
    popoverVisible: () => GraphNode | undefined
    popoverNode: () => GraphNode | undefined
    popoverPlacement: () => { left: number; top: number }
    setPopoverDismissed: (dismissed: boolean) => void
    annotations: UseGraphAnnotationsReturn
    noteTargetNode: () => GraphNode | undefined
    noteAnchor: ReturnType<typeof createNodeAnchor>
    searchOpen: () => boolean
    searchInitial: () => string | undefined
    setSearchOpen: (open: boolean) => void
    jumpTo: (node: GraphNode) => void
    contentIDs: () => string[]
    legendOpen: () => boolean
    setLegendOpen: (open: boolean) => void
    edgeKinds: UseEdgeKindsReturn
    rules: () => EqualizerRuleSet | undefined
    galleryOpen: () => boolean
    setGalleryOpen: (open: boolean) => void
    changeLayout: (layout: Layout) => void
    groupMenu: () => { id: string; x: number; y: number } | undefined
    setGroupMenu: (menu: { id: string; x: number; y: number } | undefined) => void
    groupCollapse: UseGroupCollapseReturn
    camera: GraphViewportTrackerReturn["camera"]
    toggleGroupByID: (id: string) => void
    modelForGroupMenu: () => GraphViewData
    graphSelection: UseGraphSelectionReturn
    handleRegionKeyDown: (event: KeyboardEvent) => void
    error: () => string | undefined
    onBack: (() => void) | undefined
    diffSource: GraphViewProps["diffSource"]
    link: GraphViewProps["link"]
    onOpenTranscript: GraphViewProps["onOpenTranscript"]
    onOpenSession: GraphViewProps["onOpenSession"]
    onOpenWindow: ((kind: string, nodeID?: string) => void) | undefined
    onCopyView: () => void
    renderSummary: ((node: GraphNode) => JSX.Element | undefined) | undefined
    viewAnnouncement: () => string
    a11yInstructionsId: string
    announce: (message: string) => void
    i18n: ReturnType<typeof import("@opencode/ui/context/i18n").useI18n>
    canvasRegionRef: (el: HTMLDivElement | undefined) => void
    onViewportChange: (viewport: RendererViewport) => void
    setViewport: (vp: { zoom: number; center: number[] } | undefined) => void
    viewportTracker: GraphViewportTrackerReturn
    onRenderer: (r: GraphRenderer | undefined) => void
    onRendererMounted: (renderer: GraphRenderer, id: import("../canvas/renderer-registry").RendererID) => void
    onReady: (info: { fallback: boolean }) => void
    onError: (error: string | undefined) => void
  },
): BuildCanvasRegionPropsInput {
  const projectionSignal = createMemo(() => state.projection())
  const depthSignal = createMemo(() => state.depth())

  return {
    // Core rendering
    model: state.model,
    theme: state.theme,
    renderModel: state.renderModel,
    projection: projectionSignal,
    depth: depthSignal,
    layout: state.layout,
    level: state.level,

    // Selection & navigation
    selection: state.selection,
    select: state.select,
    onNodeDoubleClick: state.expandToGraph,
    onBackgroundClick: () => state.select(undefined),
    onHover: state.onHover,
    onEdgeHover: state.onEdgeHover,
    onEdgeSelect: state.onEdgeSelect,
    onGroupToggle: state.onGroupToggle,
    onGroupMenu: state.onGroupMenu,

    // Layout interactions
    onNodeMoved: state.moveNodes,
    onNodeResized: state.resizeNode,
    cardFacing: state.cardFacing,
    applyModel: state.applyModel,
    onRenderer: state.onRenderer,
    onRendererMounted: state.onRendererMounted,
    onReady: state.onReady,
    preferredRenderer: props.preferredRenderer,
    rendererOverrides: props.rendererOverrides,

    // Detail mode
    detailMode: state.detailMode,
    effectiveDetailMode: state.effectiveDetailMode,
    files: state.files,

    // Debug handles
    global: state.debugMode,

    // Peek
    peekFrame: state.peekFrame,
    peekEdge: state.peekEdge,

    // Popover
    popoverVisible: state.popoverVisible,
    popoverNode: state.popoverNode,
    popoverPlacement: state.popoverPlacement,
    setPopoverDismissed: state.setPopoverDismissed,

    // Annotations (notes + trace)
    annotations: state.annotations,
    noteTargetNode: state.noteTargetNode,
    noteAnchor: state.noteAnchor,

    // Search
    searchOpen: state.searchOpen,
    searchInitial: state.searchInitial,
    setSearchOpen: state.setSearchOpen,
    jumpTo: state.jumpTo,
    contentIDs: state.contentIDs,

    // Legend
    legendOpen: state.legendOpen,
    setLegendOpen: state.setLegendOpen,
    edgeKinds: state.edgeKinds,
    rules: state.rules,

    // Gallery
    galleryOpen: state.galleryOpen,
    setGalleryOpen: state.setGalleryOpen,
    changeLayout: state.changeLayout,

    // Group menu
    groupMenu: state.groupMenu,
    setGroupMenu: state.setGroupMenu,
    groupCollapse: state.groupCollapse,
    camera: state.camera,
    toggleGroupByID: state.toggleGroupByID,
    modelForGroupMenu: state.modelForGroupMenu,
    graphSelection: state.graphSelection,
    handleRegionKeyDown: state.handleRegionKeyDown,

    // Error/Empty states
    error: state.error,
    onError: state.onError,
    onBack: props.onBack,

    // Diff
    diffSource: props.diffSource,
    link: props.link,
    onOpenTranscript: props.onOpenTranscript,
    onOpenSession: props.onOpenSession,
    onOpenWindow: state.onOpenWindow,
    onCopyView: state.onCopyView,
    renderSummary: props.renderSummary,

    // A11y
    viewAnnouncement: state.viewAnnouncement,
    a11yInstructionsId: state.a11yInstructionsId,
    announce: state.announce,
    i18n: state.i18n,

    // Canvas ref
    canvasRegionRef: state.canvasRegionRef,

    // Viewport
    onViewportChange: state.onViewportChange,
    setViewport: state.setViewport,
    viewportTracker: state.viewportTracker,

    // Reduced motion
    reducedMotion: state.reducedMotion,
  }
}