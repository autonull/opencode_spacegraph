import { describe, it, expect } from "bun:test"
import type { RenderModel } from "@spacegraphjs/renderer"
import { buildCanvasRegionProps, type BuildCanvasRegionPropsInput } from "./GraphCanvasRegionProps"
import type { GraphViewData } from "@opencode/session-ui/graph"

// Minimal mock RenderModel for testing
const createMockRenderModel = (nodes: string[]): RenderModel => ({
  nodes: nodes.map((id) => ({ id, position: [0, 0, 0], size: [1, 1, 1], kind: "tool", label: id })) as any,
  edges: [],
  viewport: { zoom: 1, center: [0, 0, 0] },
  camera: { position: [0, 0, 10], target: [0, 0, 0], up: [0, 1, 0] },
}) as any

const emptyModel: GraphViewData = {
  root: "session",
  nodes: [],
  edges: [],
  turns: [],
  turnByMessageID: new Map(),
}

describe("buildCanvasRegionProps reactive boundary", () => {
  it("passes renderModel accessor through unchanged (tracks updates)", () => {
    let currentModel = createMockRenderModel(["tool:1"])
    const renderModelAccessor = () => currentModel

    const input: BuildCanvasRegionPropsInput = {
      model: () => emptyModel,
      theme: () => ({} as any),
      renderModel: renderModelAccessor,
      projection: () => "2d" as any,
      depth: () => "flat" as any,
      layout: () => "lanes" as any,
      level: () => "Execution" as any,
      selection: () => [],
      select: () => {},
      onNodeDoubleClick: () => {},
      onBackgroundClick: () => {},
      onHover: () => {},
      onEdgeHover: () => {},
      onEdgeSelect: () => {},
      onGroupToggle: () => {},
      onGroupMenu: () => {},
      onNodeMoved: () => {},
      onNodeResized: () => {},
      cardFacing: () => "plane" as any,
      applyModel: () => {},
      detailMode: () => "none" as any,
      effectiveDetailMode: () => "none" as any,
      files: () => false,
      ordered: () => createMockRenderModel([]),
      groupAnnouncement: () => undefined,
      peekFrame: () => undefined,
      peekEdge: () => undefined,
      popoverVisible: () => undefined,
      popoverNode: () => undefined,
      popoverPlacement: () => ({ left: 0, top: 0 }),
      setPopoverDismissed: () => {},
      annotations: {} as any,
      noteTargetNode: () => undefined,
      noteAnchor: {} as any,
      searchOpen: () => false,
      searchInitial: () => undefined,
      setSearchOpen: () => {},
      jumpTo: () => {},
      contentIDs: () => [],
      legendOpen: () => false,
      setLegendOpen: () => {},
      edgeKinds: {} as any,
      rules: () => undefined,
      galleryOpen: () => false,
      setGalleryOpen: () => {},
      changeLayout: () => {},
      groupMenu: () => undefined,
      setGroupMenu: () => {},
      groupCollapse: {} as any,
      camera: {} as any,
      toggleGroupByID: () => {},
      modelForGroupMenu: () => emptyModel,
      graphSelection: {} as any,
      handleRegionKeyDown: () => {},
      error: () => undefined,
      onError: () => {},
      onBack: undefined,
      diffSource: undefined,
      link: undefined,
      onOpenTranscript: undefined,
      onOpenSession: undefined,
      onOpenWindow: undefined,
      onCopyView: () => {},
      renderSummary: undefined,
      viewAnnouncement: () => "",
      a11yInstructionsId: "",
      announce: () => {},
      i18n: {} as any,
      canvasRegionRef: () => {},
      onViewportChange: () => {},
      setViewport: () => {},
      viewportTracker: {} as any,
      reducedMotion: () => false,
      global: () => false,
    }

    const props = buildCanvasRegionProps(input)

    // Verify the accessor is passed through (not called)
    expect(typeof props.renderModel).toBe("function")

    // First call returns initial model
    const model1 = props.renderModel()
    expect(model1.nodes).toHaveLength(1)
    expect(model1.nodes[0].id).toBe("tool:1")

    // Update the source
    currentModel = createMockRenderModel(["tool:1", "tool:2", "tool:3"])

    // Second call returns updated model (accessor tracks changes)
    const model2 = props.renderModel()
    expect(model2.nodes).toHaveLength(3)
    expect(model2.nodes.map((n) => n.id)).toEqual(["tool:1", "tool:2", "tool:3"])
  })

  it("passes all accessor props through as functions", () => {
    const input: BuildCanvasRegionPropsInput = {
      model: () => emptyModel,
      theme: () => ({} as any),
      renderModel: () => createMockRenderModel([]),
      projection: () => "2d" as any,
      depth: () => "flat" as any,
      layout: () => "lanes" as any,
      level: () => "Execution" as any,
      selection: () => [],
      select: () => {},
      onNodeDoubleClick: () => {},
      onBackgroundClick: () => {},
      onHover: () => {},
      onEdgeHover: () => {},
      onEdgeSelect: () => {},
      onGroupToggle: () => {},
      onGroupMenu: () => {},
      onNodeMoved: () => {},
      onNodeResized: () => {},
      cardFacing: () => "plane" as any,
      applyModel: () => {},
      detailMode: () => "none" as any,
      effectiveDetailMode: () => "none" as any,
      files: () => false,
      ordered: () => createMockRenderModel([]),
      groupAnnouncement: () => undefined,
      peekFrame: () => undefined,
      peekEdge: () => undefined,
      popoverVisible: () => undefined,
      popoverNode: () => undefined,
      popoverPlacement: () => ({ left: 0, top: 0 }),
      setPopoverDismissed: () => {},
      annotations: {} as any,
      noteTargetNode: () => undefined,
      noteAnchor: {} as any,
      searchOpen: () => false,
      searchInitial: () => undefined,
      setSearchOpen: () => {},
      jumpTo: () => {},
      contentIDs: () => [],
      legendOpen: () => false,
      setLegendOpen: () => {},
      edgeKinds: {} as any,
      rules: () => undefined,
      galleryOpen: () => false,
      setGalleryOpen: () => {},
      changeLayout: () => {},
      groupMenu: () => undefined,
      setGroupMenu: () => {},
      groupCollapse: {} as any,
      camera: {} as any,
      toggleGroupByID: () => {},
      modelForGroupMenu: () => emptyModel,
      graphSelection: {} as any,
      handleRegionKeyDown: () => {},
      error: () => undefined,
      onError: () => {},
      onBack: undefined,
      diffSource: undefined,
      link: undefined,
      onOpenTranscript: undefined,
      onOpenSession: undefined,
      onOpenWindow: undefined,
      onCopyView: () => {},
      renderSummary: undefined,
      viewAnnouncement: () => "",
      a11yInstructionsId: "",
      announce: () => {},
      i18n: {} as any,
      canvasRegionRef: () => {},
      onViewportChange: () => {},
      setViewport: () => {},
      viewportTracker: {} as any,
      reducedMotion: () => false,
      global: () => false,
    }

    const props = buildCanvasRegionProps(input)

    // All these should be functions (accessors), not called values
    const accessorProps = [
      "model",
      "theme",
      "renderModel",
      "projection",
      "depth",
      "layout",
      "level",
      "selection",
      "cardFacing",
      "detailMode",
      "effectiveDetailMode",
      "files",
      "peekFrame",
      "peekEdge",
      "popoverVisible",
      "popoverNode",
      "popoverPlacement",
      "legendOpen",
      "rules",
      "galleryOpen",
      "groupMenu",
      "modelForGroupMenu",
      "error",
      "viewAnnouncement",
      "reducedMotion",
    ] as const

    for (const key of accessorProps) {
      expect(typeof props[key]).toBe("function")
    }
  })
})