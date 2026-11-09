import { useI18n } from "@opencode/ui/context/i18n"
import type { GraphRenderer } from "@spacegraphjs/renderer"
import type {
  EqualizerRule,
  EqualizerRuleSet,
  GraphFacets,
  GraphNode,
  GraphViewData,
  Layout,
  Position,
} from "@opencode/session-ui/graph"
import { nodeByID } from "@opencode/session-ui/graph"
import type { GraphDiffSource } from "./GraphDiff"
import { GraphCompare, type GraphCompareChanges } from "./GraphCompare"
import { GraphDetailSurface } from "./GraphDetail"
import { GraphEqualizerBody } from "./GraphEqualizer"
import { GraphFilesystemWindow } from "./GraphFilesystemWindow"
import { GraphFailureProgress } from "./GraphFailureProgress"
import { GraphFind } from "./GraphFind"
import { GraphLegendBody } from "./GraphLegend"
import { GraphMinimap } from "./GraphMinimap"
import type { RenderTheme } from "@spacegraphjs/renderer"
import { GraphWindows, type GraphWindowState } from "./GraphWindows"
import { windowKind, type GraphWindowKind } from "./graph-windows"
import type { RendererViewport } from "@spacegraphjs/renderer"
import { createMemo, type JSX } from "solid-js"
import type { UseGraphAnnotationsReturn } from "./useGraphAnnotations"

export type GraphWindowManagerProps = {
  windows: readonly GraphWindowState[]
  onWindowsChange: (windows: GraphWindowState[]) => void
  onOpenWindow: (window: GraphWindowState) => void
  model: () => GraphViewData
  theme: RenderTheme
  layout: Layout
  setLayout: (layout: Layout) => void
  canvasSize: { width: number; height: number }
  renderer: GraphRenderer | undefined
  viewport: RendererViewport | undefined
  displayPositions: () => ReadonlyMap<string, Position>
  selection: {
    selection: () => readonly string[]
    select: (id: string | undefined, add?: boolean) => void
  }
  annotations: UseGraphAnnotationsReturn
  edgeKinds: ReturnType<typeof import("./useEdgeKinds").useEdgeKinds>
  comparison: ReturnType<typeof import("./useComparison").useComparison>
  diffSource: GraphDiffSource | undefined
  link: string | undefined
  onOpenTranscript: ((id: string) => void) | undefined
  onOpenSession: ((sessionID: string) => void) | undefined
  onActionNavigate: ((target: { file?: string }) => void) | undefined
  rules: EqualizerRuleSet
  onRulesChange: ((rules: EqualizerRule[]) => void) | undefined
  findInitialTab: "search" | "filters" | "outline"
  i18n: ReturnType<typeof useI18n>
  renderSummary: ((node: GraphNode) => JSX.Element | undefined) | undefined
  facets: GraphFacets
  onFacetsChange: (facets: GraphFacets) => void
}

const GraphWindowManager = (props: GraphWindowManagerProps) => {
  const { model, selection, annotations, edgeKinds, comparison, i18n, renderer, viewport, displayPositions, canvasSize, layout, theme, diffSource, link, onOpenTranscript, onOpenSession, onActionNavigate, rules, onRulesChange, findInitialTab, renderSummary } = props

  const windowKinds = createMemo<GraphWindowKind[]>(() => [
    {
      name: "node",
      title: (window: GraphWindowState) => {
        const node = window.nodeID ? nodeByID(model(), window.nodeID) : undefined
        return node?.label ?? i18n.t("ui.sessionGraph.window.detail")
      },
      render: (window: GraphWindowState) => {
        const node = window.nodeID ? nodeByID(model(), window.nodeID) : undefined
        if (!node)
          return <div class="px-3 py-2 text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.window.missing")}</div>
        return (
          <GraphDetailSurface
            model={model()}
            node={node}
            diffSource={diffSource}
            renderSummary={renderSummary}
            link={link}
            onSelect={selection.select}
            onOpenTranscript={onOpenTranscript ? onOpenTranscript : undefined}
            onOpenSession={onOpenSession}
            traceKind={annotations.traceKind()}
            onTraceWhy={annotations.traceWhy}
            onTraceLedHere={annotations.traceLedHere}
            onTraceRelated={annotations.traceRelated}
            onClearTrace={annotations.clearTrace}
            onCopyTraceOutline={annotations.copyTraceOutline}
            onEditNote={annotations.editNote}
            onDeleteNote={annotations.deleteNote}
            onCopyNote={annotations.copyNote}
          />
        )
      },
    },
    {
      name: "filesystem",
      title: () => i18n.t("ui.sessionGraph.filesystem.title"),
      render: (window: GraphWindowState) => (
        <GraphFilesystemWindow
          model={model()}
          workspaceRoot={model().workspaceRoot ?? model().root}
          onSelect={(id: string) => selection.select(id)}
          onOpen={(file: GraphNode) => onActionNavigate?.({ file: file.id })}
          selection={selection.selection()[0]}
        />
      ),
    },
    {
      name: "legend",
      title: () => i18n.t("ui.sessionGraph.legend.label"),
      render: () => (
        <GraphLegendBody
          theme={theme}
          layout={layout}
          rules={rules}
          edgeKinds={edgeKinds.edgeKinds()}
          onToggleEdgeKind={edgeKinds.toggleEdgeKind}
        />
      ),
    },
    {
      name: "compare",
      title: () => i18n.t("ui.sessionGraph.compare.title"),
      render: () => {
        const changes = comparison.comparison()
        if (!changes)
          return <div class="px-3 py-2 text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.window.missing")}</div>
        const compareChanges: GraphCompareChanges = {
          added: changes.added,
          removed: changes.removed,
          changed: changes.changed,
          turnStats: changes.turnStats,
        }
        return <GraphCompare model={model()} changes={compareChanges} />
      },
    },
    {
      name: "equalizer",
      title: () => i18n.t("ui.sessionGraph.equalizer.title"),
      render: () => (
        <GraphEqualizerBody
          rules={rules ?? []}
          onChange={(rules) => onRulesChange?.(rules)}
        />
      ),
    },
    {
      name: "minimap",
      title: () => i18n.t("ui.sessionGraph.minimap.label"),
      render: () => (
        <GraphMinimap
          model={model()}
          positions={displayPositions()}
          theme={theme}
          viewport={viewport}
          onPan={(center: [number, number]) => {
            const current = viewport
            if (!current) return
            renderer?.setViewport({ zoom: current.zoom, center: [center[0], center[1], 0] })
          }}
        />
      ),
    },
    {
      name: "failureProgress",
      title: () => i18n.t("ui.sessionGraph.failureProgress.title"),
      render: () => {
        const overlay = annotations.traceOverlay()
        return (
          <GraphFailureProgress
            model={model()}
            traceOverlay={overlay ?? undefined}
            onSelect={(id: string) => selection.select(id)}
            onTraceWhy={annotations.traceWhy}
            onTraceLedHere={annotations.traceLedHere}
            onTraceRelated={annotations.traceRelated}
            onFrame={(ids) => renderer?.focus(ids[0])}
          />
        )
      },
    },
    {
      name: "find",
      title: () => i18n.t("ui.sessionGraph.find.title"),
      render: () => (
        <GraphFind
          model={model()}
          facets={props.facets}
          onFacetsChange={props.onFacetsChange}
          onSelect={(node: GraphNode) => selection.select(node.id)}
          onClose={() => props.onWindowsChange(props.windows.filter((w) => w.kind !== "find"))}
          initialTab={findInitialTab}
        />
      ),
    },
  ])

  const windowContent = (window: GraphWindowState) => {
    const kind = windowKind(windowKinds(), window)
    if (!kind)
      return <div class="px-3 py-2 text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.window.unknown")}</div>
    return kind.render(window)
  }

  return (
    <GraphWindows
      windows={props.windows}
      onChange={props.onWindowsChange}
      onClose={(id) => props.onWindowsChange(props.windows.filter((w) => w.id !== id))}
      title={(window) =>
        windowKind(windowKinds(), window)?.title(window) ?? i18n.t("ui.sessionGraph.window.detail")
      }
      render={windowContent}
      anchorOf={(nodeID): { x: number; y: number } | undefined =>
        renderer?.getNodeScreenPosition?.(nodeID) ??
        (viewport ? { x: viewport.center[0], y: viewport.center[1] } : undefined)
      }
      bounds={() => canvasSize}
    />
  )
}

export { GraphWindowManager }