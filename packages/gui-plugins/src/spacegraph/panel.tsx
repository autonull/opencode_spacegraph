import { usePlugin, type MountedSession, type SessionScreen } from "@opencode/plugin/gui"
import { useI18n } from "@opencode/ui/context/i18n"
import { createSignal, createMemo, For, Show, type JSX } from "solid-js"
import { navigationResults, rankedSearch, EDIT_TOOLS, type GraphNode as SessionGraphNode, type GraphViewData as SessionGraphViewData } from "@opencode/session-ui/graph"
import { formatProvenance, text } from "@opencode/session-graph"
import type { SpacegraphModel } from "./model"
import { SessionGraph, ComposerNodeWidget, SubagentNodeWidget, TodoNodeWidget, TerminalNodeWidget, DiffNodeWidget, type ComposerNodeWidgetProps } from "@opencode/session-graph"
import { Inspector, type GraphNode as InspectorGraphNode, type GraphViewData as InspectorGraphViewData } from "@spacegraphjs/inspector"
import { Windows, type WindowState } from "@spacegraphjs/window-manager"
import { LAYOUT_STRATEGIES } from "@opencode/session-ui/graph"
import type { DepthMode, DetailMode, GraphArrangement, GraphSide, Annotations } from "@opencode/session-ui/graph"

function convertGraphData(data: SessionGraphViewData): InspectorGraphViewData {
  return {
    nodes: data.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      kind: n.kind,
      summary: n.summary,
      provenance: n.provenance,
      data: n.data,
    })),
    edges: data.edges.map((e) => ({
      from: e.source,
      to: e.target,
      kind: e.kind,
    })),
  }
}

function convertNode(node: SessionGraphNode): InspectorGraphNode {
  return {
    id: node.id,
    label: node.label,
    kind: node.kind,
    summary: node.summary,
    provenance: node.provenance,
    data: node.data,
  }
}

function toInspectorFormatProvenance(
  provenance: import("@opencode/session-ui/graph").Provenance | undefined,
  now: number,
): string | undefined {
  return formatProvenance(provenance as any, now)
}

export default function SpacegraphPanel(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  onOpenTranscript?: (id: string) => void
}) {
  const ctx = usePlugin<typeof import("./index").default>()
  const i18n = useI18n()

  const [windows, setWindows] = createSignal<WindowState[]>([])
  const [searchQuery, setSearchQuery] = createSignal("")
  const [searchResults, setSearchResults] = createSignal<SessionGraphNode[]>([])
  const [searchIndex, setSearchIndex] = createSignal(0)

  const live = props.model.graph(props.session)
  const graph = createMemo(() => props.model.graphAt(props.session, live()))
  const timeTravel = () => props.model.timeTravelEnabled()
  const turnCount = () => live().turns.length

  const search = (query: string) => {
    const results = navigationResults(graph(), query) ?? rankedSearch(graph(), query)
    setSearchResults(results as SessionGraphNode[])
    setSearchIndex(0)
  }

  const openSearchResult = (node: SessionGraphNode) => {
    props.model.focus(props.session, node.id)
    setSearchQuery("")
  }

  const closeWindow = (id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id))
  }

  const windowTitle = (window: WindowState) => {
    if (window.nodeID) {
      const node = graph().nodes.find((n: SessionGraphNode) => n.id === window.nodeID)

      return node?.label ?? window.kind
    }

    return window.kind
  }

  const windowContent = (window: WindowState) => {
    if (window.kind === "inspector" && window.nodeID) {
      const node = graph().nodes.find((n: SessionGraphNode) => n.id === window.nodeID)
      const convertedGraph = convertGraphData(graph())
      const convertedNode = node ? convertNode(node) : undefined

      return (
        <Inspector
          model={convertedGraph}
          node={convertedNode}
          onSelect={(id: string) => props.model.focus(props.session, id)}
          onOpenTranscript={(messageID: string, partID?: string) => props.screen.transcript.reveal(messageID, partID)}
          t={i18n.t}
          plural={(key: string, count: number, params?: Record<string, string | number | boolean | undefined>) => i18n.plural(key as any, count, params as any)}
          formatProvenance={(prov, now) => toInspectorFormatProvenance(prov as any, now)}
          formatOutput={text}
        />
      )
    }

    return <div>Window content for {window.kind}</div>
  }

  const anchorOf = (nodeID: string) => {
    // This would need actual canvas coordinates - simplified for now
    return undefined
  }

  const bounds = () => {
    const el = document.querySelector('[data-slot="spacegraph-panel"]')

    return { width: el?.clientWidth ?? 800, height: el?.clientHeight ?? 600 }
  }

  const focused = () => props.model.focused(props.session)
  const detailMode = () => props.model.detailMode(props.session)
  const arrangement = () => props.model.arrangement(props.session)
  const arrangementSide = () => props.model.side(props.session)

  // Shared state from model (Phase 17.2)
  const traceKind = () => props.model.traceKind(props.session)
  const traceSource = () => props.model.traceSource(props.session)
  const traceHistory = () => props.model.traceHistory(props.session)
  const traceHistoryIndex = () => props.model.traceHistoryIndex(props.session)
  const explicitlyCollapsedGroups = () => props.model.explicitlyCollapsedGroups(props.session)
  const notes = () => props.model.notes(props.session)

  // Widgets enabled check (Phase 19.9 - node widget breadth)
  const widgetsEnabled = createMemo(() => {
    const prefs = ctx.stores.prefs.value
    return ctx.flags.enabled("graph_node_widgets") && prefs.widgets?.enabled === true
  })

  const widgetEnabled = (name: "todo" | "diff" | "terminal" | "composer") => {
    if (!widgetsEnabled()) return false
    return ctx.stores.prefs.value.widgets?.[name] !== false
  }

  // Get the composer from the screen
  const composer = createMemo(() => props.screen.composer)

  const diffFiles = (nodeID: string) =>
    graph().edges.flatMap((edge) => {
      if (edge.kind !== "writes" || edge.source !== nodeID) return []
      const target = graph().nodes.find((candidate: SessionGraphNode) => candidate.id === edge.target)
      const path = typeof target?.data?.path === "string" ? target.data.path : undefined
      if (!path) return []
      return [{ path, additions: edge.data?.additions, deletions: edge.data?.deletions }]
    })

  // Render node widget for the session root node and subagent nodes when widgets are enabled
  const renderNodeWidget = createMemo(() => {
    if (!widgetsEnabled()) return undefined

    return (node: SessionGraphNode): JSX.Element | undefined => {
      // Composer widget on session root node
      if (node.kind === "session" && node.id === "session" && widgetEnabled("composer")) {
        const composerInstance = composer()
        if (!composerInstance) return undefined

        const widgetProps: ComposerNodeWidgetProps = {
          node,
          composer: composerInstance,
          readOnly: props.model.parked(props.session),
          maxHeight: 140,
        }

        return <ComposerNodeWidget {...widgetProps} />
      }

      // Subagent widget on subagent nodes
      if (node.kind === "subagent") {
        const handleDrillDown = (subagentID: string) => {
          props.model.focus(props.session, subagentID)
          // The expandToGraph navigation will be triggered by the widget's onDrillDown
        }

        return (
          <SubagentNodeWidget
            node={node}
            model={graph()}
            onDrillDown={handleDrillDown}
            maxDepth={1}
            inPopover={false}
          />
        )
      }

      if (node.kind === "tool" && node.data?.name === "todowrite" && widgetEnabled("todo"))
        return <TodoNodeWidget node={node} />

      if (
        node.kind === "tool" &&
        typeof node.data?.name === "string" &&
        EDIT_TOOLS.has(node.data.name) &&
        widgetEnabled("diff")
      )
        return <DiffNodeWidget node={node} files={diffFiles(node.id)} />

      if (node.kind === "result" && typeof node.data?.output === "string" && widgetEnabled("terminal"))
        return <TerminalNodeWidget node={node} />

      return undefined
    }
  })

  return (
    <div class="flex size-full min-h-0 flex-col bg-v2-background-bg-base" data-slot="spacegraph-panel">
      <div class="flex shrink-0 items-center justify-between gap-2 border-b border-v2-border-border-base px-4 py-2.5">
        <span class="text-13-medium text-text-base">{ctx.t("panel.title")}</span>
        <div class="flex items-center gap-2">
          <input
            type="text"
            placeholder={ctx.t("command.search")}
            value={searchQuery()}
            class="w-48 rounded-md border border-v2-border-border-base bg-v2-background-bg-base px-2 py-1 text-13-regular text-text-base outline-none placeholder:text-text-weak"
            onInput={(e) => {
              setSearchQuery(e.currentTarget.value)
              search(e.currentTarget.value)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const results = searchResults()

                if (results.length > 0) openSearchResult(results[searchIndex()])
              } else if (e.key === "ArrowDown") {
                e.preventDefault()
                setSearchIndex((i) => Math.min(i + 1, searchResults().length - 1))
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setSearchIndex((i) => Math.max(i - 1, 0))
              } else if (e.key === "Escape") {
                setSearchQuery("")
              }
            }}
          />
        </div>
      </div>
      <div class="min-h-0 flex-1 relative">
        <SessionGraph
          model={graph()}
          level={props.model.level(props.session)}
          density={props.model.density()}
          layout={props.model.layout(props.session)}
          depth={props.model.depth(props.session)}
          detailMode={detailMode()}
          selection={focused()}
          frame={focused()}
          activeTurn={graph().activeTurn}
          liveModel={timeTravel() ? live() : undefined}
          checkpoint={timeTravel() ? props.model.checkpointIndex(props.session, live()) : undefined}
          turnCount={timeTravel() ? turnCount() : undefined}
          onCheckpoint={
            timeTravel() ? (index: number) => props.model.setCheckpoint(props.session, index, turnCount()) : undefined
          }
          onSelect={(id: string | undefined) => props.model.focus(props.session, id)}
          onLayoutChange={(next: string) => {
            const layout = LAYOUT_STRATEGIES.find((candidate: string) => candidate === next)

            if (layout) props.model.setLayout(props.session, layout)
          }}
          onDepthChange={(next: DepthMode) => props.model.setDepth(props.session, next)}
          onDetailModeChange={(next: DetailMode) => props.model.setDetailMode(props.session, next)}
          arrangement={arrangement()}
          arrangementSide={arrangementSide()}
          refitKey={arrangement()}
          onArrangementChange={(next: GraphArrangement) => props.model.setArrangement(props.session, next)}
          onArrangementSideChange={(next: GraphSide) => props.model.setSide(props.session, next)}
          onSplitView={() => {}}
          preferredRenderer={props.model.renderer}
          chrome={true}
          shell="full"
          onOpenTranscript={props.onOpenTranscript}
          // Shared trace state
          traceKind={traceKind()}
          onTraceKindChange={(kind) => props.model.setTraceKind(props.session, kind)}
          traceSource={traceSource()}
          onTraceSourceChange={(source) => props.model.setTraceSource(props.session, source)}
          traceHistory={traceHistory()}
          onTraceHistoryChange={(history) => {
            // Note: trace history is updated via pushTraceHistory and setTraceHistoryIndex
          }}
          traceHistoryIndex={traceHistoryIndex()}
          onTraceHistoryIndexChange={(index) => props.model.setTraceHistoryIndex(props.session, index)}
          // Shared group collapse state
          explicitlyCollapsedGroups={explicitlyCollapsedGroups()}
          onExplicitlyCollapsedGroupsChange={(groups) => {
            // The model handles this via toggleExplicitlyCollapsedGroup
          }}
          // Shared notes state
          notes={notes()}
          onNotesChange={(notes: Annotations) => props.model.setNotes(props.session, notes)}
          pins={props.model.pins(props.session)}
          onPinsChange={(pins) => props.model.setPins(props.session, pins)}
          savedQueries={props.model.savedQueries(props.session)}
          onSavedQueriesChange={(queries) => props.model.setSavedQueries(props.session, queries)}
          layouts={props.model.availableLayouts()}
          palette={props.model.paletteEnabled() ? props.model.paletteSources(props.session) : undefined}
          onPaletteAction={(entry) => props.model.runPaletteAction(props.session, entry.action?.id ?? "")}
          onPaletteLens={(entry) => entry.lens && props.model.applyLensById(props.session, entry.lens.id)}
          onPaletteSurface={(entry) => entry.surface && props.model.select(props.session, entry.surface.id)}
          // Node widget (Phase 19.9 - widget breadth)
          renderNodeWidget={renderNodeWidget()}
          enableCostLens={ctx.flags.enabled("graph_cost_lens")}
        />
        <Windows
          windows={windows()}
          onChange={(windows) => setWindows(windows)}
          onClose={closeWindow}
          render={windowContent}
          title={windowTitle}
          anchorOf={anchorOf}
          bounds={bounds}
          emptyTitle={ctx.t("panel.window")}
        />
        <Show when={searchQuery().length > 0 && searchResults().length > 0}>
          <div class="absolute left-2 top-2 z-10 flex w-72 max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-md border border-v2-border-border-base bg-v2-background-bg-base shadow-md">
            <div class="flex items-center gap-2 px-2 py-1.5 border-b border-v2-border-border-base">
              <span class="text-12-regular text-text-weak">
                {ctx.plural("panel.searchResults", searchResults().length)}
              </span>
            </div>
            <ul class="max-h-60 overflow-y-auto" role="listbox" aria-label={ctx.t("command.search")}>
              <For each={searchResults()}>
                {(node, index) => (
                  <li>
                    <button
                      type="button"
                      data-index={index()}
                      data-node-id={node.id}
                      data-active={index() === searchIndex()}
                      role="option"
                      aria-selected={index() === searchIndex()}
                      class="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left hover:bg-v2-overlay-simple-overlay-hover"
                      classList={{ "bg-v2-overlay-simple-overlay-hover": index() === searchIndex() }}
                      onMouseEnter={() => setSearchIndex(index())}
                      onClick={() => openSearchResult(node)}
                    >
                      <span class="truncate text-12-regular text-text-strong">{node.label}</span>
                      <Show when={node.summary}>
                        <span class="truncate text-12-regular text-text-weak">{node.summary}</span>
                      </Show>
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </Show>
      </div>
    </div>
  )
}
