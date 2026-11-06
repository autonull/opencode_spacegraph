import type {
  Projection,
  RenderTheme,
  RenderModel,
  RendererViewport,
  GraphRenderer,
} from "@spacegraphjs/renderer"
import type {
  DetailMode,
  EqualizerRuleSet,
  GraphViewData,
  GraphNode,
  GraphEdge,
  Layout,
  ZoomLevel,
} from "@opencode/session-ui/graph"
import type { RendererFactory, RendererID } from "../canvas/renderer-registry"
import type { GraphDiffSource } from "./GraphDiff"
import type { UseGraphAnnotationsReturn } from "./useGraphAnnotations"
import type { UseGroupCollapseReturn } from "./useGroupCollapse"
import type { UseEdgeKindsReturn } from "./useEdgeKinds"
import type { GraphViewportTrackerReturn } from "./useGraphViewport"
import type { UseGraphSelectionReturn } from "./useGraphSelection"
import type { GraphCanvasReady } from "../canvas/GraphCanvas"
import { createNodeAnchor } from "./graph-anchors"
import type { JSX } from "solid-js"

export type GraphCanvasRegionProps = {
  // Core rendering
  model: () => GraphViewData
  theme: () => RenderTheme
  renderModel: () => RenderModel
  projection: () => Projection
  depth: () => "flat" | "layered" | "depth-stack" | "orbit"
  layout: () => Layout
  level: () => ZoomLevel

  // Selection & navigation
  selection: () => readonly string[]
  select: (id: string | undefined, add?: boolean) => void
  onNodeDoubleClick: (id: string) => void
  onBackgroundClick: () => void
  onHover: (id: string | undefined) => void
  onEdgeHover: (id: string | undefined) => void
  onEdgeSelect: (id: string) => void
  onGroupToggle: (id: string) => void
  onGroupMenu: (id: string, at: { x: number; y: number }) => void

  // Layout interactions
  onNodeMoved: (nodes: readonly { id: string; position: [number, number, number] }[]) => void
  onNodeResized: (resize: { id: string; size: [number, number]; position: [number, number, number] }) => void
  cardFacing: () => "plane" | "camera"
  applyModel: (instance: any) => void
  onRenderer?: (renderer: GraphRenderer | undefined) => void
  onRendererMounted?: (renderer: GraphRenderer, id: RendererID) => void
  onReady?: (info: GraphCanvasReady) => void
  preferredRenderer?: () => RendererID
  rendererOverrides?: Partial<Record<RendererID, RendererFactory>>

  // Detail mode
  detailMode: () => DetailMode
  effectiveDetailMode: () => DetailMode
  files: () => boolean

  // Debug handles
  global: () => boolean

  // Peek
  peekFrame: () => { node: GraphNode; left: number; top: number } | undefined
  peekEdge: () => GraphEdge | undefined

  // Popover
  popoverVisible: () => GraphNode | undefined
  popoverNode: () => GraphNode | undefined
  popoverPlacement: () => { left: number; top: number }
  setPopoverDismissed: (dismissed: boolean) => void

  // Annotations (notes + trace)
  annotations: UseGraphAnnotationsReturn
  noteTargetNode: () => GraphNode | undefined
  noteAnchor: ReturnType<typeof createNodeAnchor>

  // Search
  searchOpen: () => boolean
  searchInitial: () => string | undefined
  setSearchOpen: (open: boolean) => void
  jumpTo: (node: GraphNode) => void
  contentIDs: () => string[]

  // Legend
  legendOpen: () => boolean
  setLegendOpen: (open: boolean) => void
  edgeKinds: UseEdgeKindsReturn
  rules: () => EqualizerRuleSet | undefined

  // Gallery
  galleryOpen: () => boolean
  setGalleryOpen: (open: boolean) => void
  changeLayout: (layout: Layout) => void

  // Group menu
  groupMenu: () => { id: string; x: number; y: number } | undefined
  setGroupMenu: (menu: { id: string; x: number; y: number } | undefined) => void
  groupCollapse: UseGroupCollapseReturn
  camera: GraphViewportTrackerReturn["camera"]
  toggleGroupByID: (id: string) => void
  modelForGroupMenu: () => GraphViewData
  graphSelection: UseGraphSelectionReturn
  handleRegionKeyDown: (event: KeyboardEvent) => void

  // Error/Empty states
  error: () => string | undefined
  onError: (error: string | undefined) => void
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
  viewAnnouncement: () => string
  a11yInstructionsId: string
  announce: (message: string) => void
  i18n: ReturnType<typeof import("@opencode/ui/context/i18n").useI18n>

  // Canvas ref
  canvasRegionRef: (el: HTMLDivElement | undefined) => void

  // Viewport
  onViewportChange: (viewport: RendererViewport) => void
  setViewport: (vp: { zoom: number; center: number[] } | undefined) => void
  viewportTracker: GraphViewportTrackerReturn

  // Reduced motion
  reducedMotion: () => boolean
}

export interface BuildCanvasRegionPropsInput {
  // Core rendering
  model: () => GraphViewData
  theme: () => RenderTheme
  renderModel: () => RenderModel
  projection: () => Projection
  depth: () => "flat" | "layered" | "depth-stack" | "orbit"
  layout: () => Layout
  level: () => ZoomLevel

  // Selection & navigation
  selection: () => readonly string[]
  select: (id: string | undefined, add?: boolean) => void
  onNodeDoubleClick: (id: string) => void
  onBackgroundClick: () => void
  onHover: (id: string | undefined) => void
  onEdgeHover: (id: string | undefined) => void
  onEdgeSelect: (id: string) => void
  onGroupToggle: (id: string) => void
  onGroupMenu: (id: string, at: { x: number; y: number }) => void

  // Layout interactions
  onNodeMoved: (nodes: readonly { id: string; position: [number, number, number] }[]) => void
  onNodeResized: (resize: { id: string; size: [number, number]; position: [number, number, number] }) => void
  cardFacing: () => "plane" | "camera"
  applyModel: (instance: any) => void
  onRenderer?: (renderer: GraphRenderer | undefined) => void
  onRendererMounted?: (renderer: GraphRenderer, id: RendererID) => void
  onReady?: (info: GraphCanvasReady) => void
  preferredRenderer?: () => RendererID
  rendererOverrides?: Partial<Record<RendererID, RendererFactory>>

  // Detail mode
  detailMode: () => DetailMode
  effectiveDetailMode: () => DetailMode
  files: () => boolean

  // Debug handles
  global: () => boolean

  // Peek
  peekFrame: () => { node: GraphNode; left: number; top: number } | undefined
  peekEdge: () => GraphEdge | undefined

  // Popover
  popoverVisible: () => GraphNode | undefined
  popoverNode: () => GraphNode | undefined
  popoverPlacement: () => { left: number; top: number }
  setPopoverDismissed: (dismissed: boolean) => void

  // Annotations (notes + trace)
  annotations: UseGraphAnnotationsReturn
  noteTargetNode: () => GraphNode | undefined
  noteAnchor: ReturnType<typeof createNodeAnchor>

  // Search
  searchOpen: () => boolean
  searchInitial: () => string | undefined
  setSearchOpen: (open: boolean) => void
  jumpTo: (node: GraphNode) => void
  contentIDs: () => string[]

  // Legend
  legendOpen: () => boolean
  setLegendOpen: (open: boolean) => void
  edgeKinds: UseEdgeKindsReturn
  rules: () => EqualizerRuleSet | undefined

  // Gallery
  galleryOpen: () => boolean
  setGalleryOpen: (open: boolean) => void
  changeLayout: (layout: Layout) => void

  // Group menu
  groupMenu: () => { id: string; x: number; y: number } | undefined
  setGroupMenu: (menu: { id: string; x: number; y: number } | undefined) => void
  groupCollapse: UseGroupCollapseReturn
  camera: GraphViewportTrackerReturn["camera"]
  toggleGroupByID: (id: string) => void
  modelForGroupMenu: () => GraphViewData
  graphSelection: UseGraphSelectionReturn
  handleRegionKeyDown: (event: KeyboardEvent) => void

  // Error/Empty states
  error: () => string | undefined
  onError: (error: string | undefined) => void
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
  viewAnnouncement: () => string
  a11yInstructionsId: string
  announce: (message: string) => void
  i18n: ReturnType<typeof import("@opencode/ui/context/i18n").useI18n>

  // Canvas ref
  canvasRegionRef: (el: HTMLDivElement | undefined) => void

  // Viewport
  onViewportChange: (viewport: RendererViewport) => void
  setViewport: (vp: { zoom: number; center: number[] } | undefined) => void
  viewportTracker: GraphViewportTrackerReturn

  // Reduced motion
  reducedMotion: () => boolean
}

/**
 * Builds the props object for GraphCanvasRegion from individual getters/functions.
 * This separates the props construction logic from GraphView.tsx to reduce its size.
 */
export function buildCanvasRegionProps(input: BuildCanvasRegionPropsInput): GraphCanvasRegionProps {
  return {
    // Core rendering
    model: input.model,
    theme: input.theme,
    renderModel: input.renderModel,
    projection: input.projection,
    depth: input.depth,
    layout: input.layout,
    level: input.level,

    // Selection & navigation
    selection: input.selection,
    select: input.select,
    onNodeDoubleClick: input.onNodeDoubleClick,
    onBackgroundClick: input.onBackgroundClick,
    onHover: input.onHover,
    onEdgeHover: input.onEdgeHover,
    onEdgeSelect: input.onEdgeSelect,
    onGroupToggle: input.onGroupToggle,
    onGroupMenu: input.onGroupMenu,

    // Layout interactions
    onNodeMoved: input.onNodeMoved,
    onNodeResized: input.onNodeResized,
    cardFacing: input.cardFacing,
    applyModel: input.applyModel,
    onRenderer: input.onRenderer,
    onRendererMounted: input.onRendererMounted,
    onReady: input.onReady,
    preferredRenderer: input.preferredRenderer,
    rendererOverrides: input.rendererOverrides,

    // Detail mode
    detailMode: input.detailMode,
    effectiveDetailMode: input.effectiveDetailMode,
    files: input.files,

    // Debug handles
    global: input.global,

    // Peek
    peekFrame: input.peekFrame,
    peekEdge: input.peekEdge,

    // Popover
    popoverVisible: input.popoverVisible,
    popoverNode: input.popoverNode,
    popoverPlacement: input.popoverPlacement,
    setPopoverDismissed: input.setPopoverDismissed,

    // Annotations (notes + trace)
    annotations: input.annotations,
    noteTargetNode: input.noteTargetNode,
    noteAnchor: input.noteAnchor,

    // Search
    searchOpen: input.searchOpen,
    searchInitial: input.searchInitial,
    setSearchOpen: input.setSearchOpen,
    jumpTo: input.jumpTo,
    contentIDs: input.contentIDs,

    // Legend
    legendOpen: input.legendOpen,
    setLegendOpen: input.setLegendOpen,
    edgeKinds: input.edgeKinds,
    rules: input.rules,

    // Gallery
    galleryOpen: input.galleryOpen,
    setGalleryOpen: input.setGalleryOpen,
    changeLayout: input.changeLayout,

    // Group menu
    groupMenu: input.groupMenu,
    setGroupMenu: input.setGroupMenu,
    groupCollapse: input.groupCollapse,
    camera: input.camera,
    toggleGroupByID: input.toggleGroupByID,
    modelForGroupMenu: input.modelForGroupMenu,
    graphSelection: input.graphSelection,
    handleRegionKeyDown: input.handleRegionKeyDown,

    // Error/Empty states
    error: input.error,
    onError: input.onError,
    onBack: input.onBack,

    // Diff
    diffSource: input.diffSource,
    link: input.link,
    onOpenTranscript: input.onOpenTranscript,
    onOpenSession: input.onOpenSession,
    onOpenWindow: input.onOpenWindow,
    onCopyView: input.onCopyView,
    renderSummary: input.renderSummary,

    // A11y
    viewAnnouncement: input.viewAnnouncement,
    a11yInstructionsId: input.a11yInstructionsId,
    announce: input.announce,
    i18n: input.i18n,

    // Canvas ref
    canvasRegionRef: input.canvasRegionRef,

    // Viewport
    onViewportChange: input.onViewportChange,
    setViewport: input.setViewport,
    viewportTracker: input.viewportTracker,

    // Reduced motion
    reducedMotion: input.reducedMotion,
  }
}