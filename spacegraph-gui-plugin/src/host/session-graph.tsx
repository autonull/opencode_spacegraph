import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import { Windows, type WindowState } from "@spacegraphjs/window-manager"
import { createMemo, createSignal, For, Show } from "solid-js"
import { layoutGraph, navigationResults, rankedSearch, type GraphNode } from "../model"
import type { SpacegraphModel } from "../plugin/model"
import { createHostWidgetRegistry } from "../plugin/widget-host"
import { GraphLegend, GraphToolbar, type ChromeInput } from "./chrome"
import { openInspectorWindow } from "./chrome-helpers"
import { createComparison } from "./ui/useComparison"
import { createDetailCopy } from "./ui/detail-copy"
import { GraphCompare } from "./ui/graph-compare"
import { GraphDetailSurface, type GraphDetailProps } from "./ui/graph-detail"
import { GraphFilesystemWindow } from "./ui/graph-filesystem-window"
import { GraphGallery } from "./ui/graph-gallery"
import { GraphPopover } from "./ui/graph-popover"
import { proposeWindow } from "./ui/window-placement"
import { buildRenderModel } from "./canvas/buildRenderModel"
import { DARK_THEME } from "./canvas/fixtures"
import { GraphCanvas } from "./graph-canvas"
import { GraphA11y } from "./ui/graph-a11y"
import { GraphFind } from "./ui/graph-find"
import { GraphMinimap } from "./ui/graph-minimap"
import { GraphStatusBar } from "./ui/graph-status-bar"
import { createGraphAnnotations } from "./ui/useGraphAnnotations"

/**
 * The composed session graph: the renderer canvas plus the interactive toolbar, palette, find, legend and
 * inspector windows. Surfaces and the side panel mount this one host so every view carries the same chrome.
 */
export function SessionGraph(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  class?: string
}) {
  const ctx = props.model.ctx
  const [windows, setWindows] = createSignal<WindowState[]>([])
  const [showFind, setShowFind] = createSignal(false)
  const [showLegend, setShowLegend] = createSignal(false)
  const [showMinimap, setShowMinimap] = createSignal(false)
  const [showGallery, setShowGallery] = createSignal(false)
  const [showPopover, setShowPopover] = createSignal(false)
  const [searchQuery, setSearchQuery] = createSignal("")
  const [searchResults, setSearchResults] = createSignal<GraphNode[]>([])
  const [searchIndex, setSearchIndex] = createSignal(0)
  let body!: HTMLDivElement

  const live = props.model.graph(props.session)
  const graph = createMemo(() => props.model.graphAt(props.session, live()))
  const positions = createMemo(() => layoutGraph(graph(), { level: "execution" }).positions)
  const renderModel = createMemo(() =>
    buildRenderModel(graph(), { level: props.model.level(props.session), positions: positions() }),
  )
  const selection = () => {
    const id = props.model.focused(props.session)
    return id ? [id] : []
  }
  const comparisonHook = createComparison({
    model: live,
    checkpoint: () => props.model.checkpoint(props.session),
    selection,
  })
  const comparison = comparisonHook.comparison
  const comparing = () => comparisonHook.comparedTurns() !== null

  const [announcement, setAnnouncement] = createSignal(
    ctx.t("a11y.view", {
      level: props.model.level(props.session),
      layout: props.model.layout(props.session),
      depth: props.model.depth(props.session),
    }),
  )
  const annotations = createGraphAnnotations({
    model: graph,
    selection,
    i18n: { t: ctx.t, plural: ctx.plural },
    notes: () => props.model.notes(props.session),
    setNotes: (next) => props.model.setNotes(props.session, next),
    onAnnounce: setAnnouncement,
    traceKind: () => props.model.traceKind(props.session) ?? null,
    onTraceKindChange: (kind) => props.model.setTraceKind(props.session, kind),
    traceSource: () => props.model.traceSource(props.session) ?? null,
    onTraceSourceChange: (source) => props.model.setTraceSource(props.session, source),
    traceHistory: () => props.model.traceHistory(props.session),
    onTraceHistoryChange: (history) => props.model.setTraceHistory(props.session, history),
    traceHistoryIndex: () => props.model.traceHistoryIndex(props.session),
    onTraceHistoryIndexChange: (index) => props.model.setTraceHistoryIndex(props.session, index),
  })
  const detailCopy = createDetailCopy(ctx.t, {
    traceKind: annotations.traceKind(),
    onTrace: (kind, id) => annotations.startTrace(kind, id),
    onClearTrace: () => annotations.clearTrace(),
    onCopyTraceOutline: () => annotations.copyTraceOutline(),
  })
  const registry = createHostWidgetRegistry({
    ctx,
    model: props.model,
    session: props.session,
    screen: props.screen,
    graph,
  })
  const chrome: ChromeInput = {
    model: props.model,
    session: props.session,
    screen: props.screen,
    graph,
    onOpenWindow: openInspector,
  }

  function openInspector(nodeID: string) {
    setWindows((previous) => openInspectorWindow(previous, nodeID))
  }

  const closeWindow = (id: string) => setWindows((previous) => previous.filter((window) => window.id !== id))

  const toggleCompare = () => {
    if (comparing()) {
      comparisonHook.clearComparison()
      setWindows((previous) => previous.filter((window) => window.kind !== "compare"))
      return
    }
    comparisonHook.compareVisibleTurns()
    setWindows((previous) => [...previous, proposeWindow("compare", undefined, { canvas: bounds(), windows: previous })])
  }

  const toggleFilesystem = () => setWindows((previous) => {
    if (previous.some((window) => window.kind === "filesystem")) {
      return previous.filter((window) => window.kind !== "filesystem")
    }
    return [...previous, proposeWindow("filesystem", undefined, { canvas: bounds(), windows: previous })]
  })

  const detailProps = (): Omit<GraphDetailProps, "node"> => ({
    model: graph(),
    copy: detailCopy,
    onSelect: (id) => {
      props.model.focus(props.session, id)
      openInspector(id)
    },
    onOpenTranscript: (messageID, partID) => {
      const transcript = (props.screen as { transcript?: { reveal?: (m: string, p?: string) => void } }).transcript
      transcript?.reveal?.(messageID, partID)
    },
    onOpenWindow: (node) => openInspector(node.id),
    onOpenFile: (file) => void navigator.clipboard?.writeText(file),
    onActionNavigate: (target) => {
      if (target.node) props.model.focus(props.session, target.node)
      if (target.file) void navigator.clipboard?.writeText(target.file)
    },
    onActionReveal: (target) => {
      if (target.file) void navigator.clipboard?.writeText(target.file)
    },
    onActionCopy: (value) => void navigator.clipboard?.writeText(value),
    onActionRun: (operation) => props.model.runPaletteAction(props.session, operation.id),
    onNote: (node, action) => {
      if (action === "delete") annotations.deleteNote(node)
      if (action === "copy") annotations.copyNote(node)
    },
  })

  const windowTitle = (window: WindowState) => {
    if (window.kind === "compare") return ctx.t("compare.title")
    if (window.kind === "filesystem") return ctx.t("ui.sessionGraph.filesystem.root")
    if (!window.nodeID) return window.kind
    return graph().nodes.find((node) => node.id === window.nodeID)?.label ?? window.kind
  }

  const windowContent = (window: WindowState) => {
    if (window.kind === "compare") {
      return (
        <Show when={comparison()}>
          {(changes) => (
            <GraphCompare
              model={graph()}
              changes={changes()}
              labels={{
                added: ctx.t("compare.added"),
                removed: ctx.t("compare.removed"),
                changed: ctx.t("compare.changed"),
                empty: ctx.t("compare.empty"),
                turnStats: ctx.t("compare.turnStats"),
                turn: ctx.t("compare.turn"),
                files: ctx.t("compare.files"),
                tools: ctx.t("compare.tools"),
                errors: ctx.t("compare.errors"),
                retries: ctx.t("compare.retries"),
                duration: ctx.t("compare.duration"),
                turnNumber: (num) => ctx.t("compare.turnNumber", { num }),
              }}
            />
          )}
        </Show>
      )
    }
    if (window.kind === "filesystem") {
      return (
        <GraphFilesystemWindow
          model={graph()}
          workspaceRoot={graph().workspaceRoot ?? graph().root}
          labels={{
            root: ctx.t("ui.sessionGraph.filesystem.root"),
            session: ctx.t("ui.sessionGraph.filesystem.session"),
            touched: ctx.t("ui.sessionGraph.filesystem.touched"),
            loading: ctx.t("ui.sessionGraph.filesystem.loading"),
          }}
          onSelect={(id) => props.model.focus(props.session, id)}
          selection={props.model.focused(props.session)}
        />
      )
    }
    if (window.kind !== "inspector" || !window.nodeID) return <div>{window.kind}</div>
    const node = graph().nodes.find((candidate) => candidate.id === window.nodeID)
    return <Show when={node}>{(found) => <GraphDetailSurface {...detailProps()} node={found()} />}</Show>
  }

  const bounds = () => ({ width: body?.clientWidth ?? 800, height: body?.clientHeight ?? 600 })

  const focusedNode = () => {
    const id = props.model.focused(props.session)
    return id ? graph().nodes.find((node) => node.id === id) : undefined
  }

  const search = (query: string) => {
    setSearchResults(navigationResults(graph(), query) ?? rankedSearch(graph(), query))
    setSearchIndex(0)
  }

  const openSearchResult = (node: GraphNode) => {
    props.model.focus(props.session, node.id)
    setSearchQuery("")
    setSearchResults([])
  }

  return (
    <div class={`sg-session-graph ${props.class ?? ""}`}>
      <div class="sg-session-graph__header">
        <span>{ctx.t("panel.title")}</span>
        <div class="sg-session-graph__header-actions">
          <input
            type="text"
            placeholder={ctx.t("command.search")}
            value={searchQuery()}
            onInput={(event) => {
              setSearchQuery(event.currentTarget.value)
              search(event.currentTarget.value)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                const results = searchResults()
                if (results.length > 0) openSearchResult(results[searchIndex()])
              } else if (event.key === "ArrowDown") {
                event.preventDefault()
                setSearchIndex((index) => Math.min(index + 1, searchResults().length - 1))
              } else if (event.key === "ArrowUp") {
                event.preventDefault()
                setSearchIndex((index) => Math.max(index - 1, 0))
              } else if (event.key === "Escape") {
                setSearchQuery("")
                setSearchResults([])
              }
            }}
          />
          <button type="button" aria-pressed={showFind()} onClick={() => setShowFind((value) => !value)}>
            {ctx.t("chrome.find")}
          </button>
          <button type="button" aria-pressed={showLegend()} onClick={() => setShowLegend((value) => !value)}>
            {ctx.t("chrome.legend")}
          </button>
          <button type="button" aria-pressed={showMinimap()} onClick={() => setShowMinimap((value) => !value)}>
            {ctx.t("minimap.show")}
          </button>
          <button type="button" aria-pressed={showGallery()} onClick={() => setShowGallery((value) => !value)}>
            {ctx.t("ui.sessionGraph.gallery.label")}
          </button>
          <button type="button" onClick={toggleFilesystem}>
            {ctx.t("ui.sessionGraph.filesystem.root")}
          </button>
          <button type="button" aria-pressed={showPopover()} onClick={() => setShowPopover((value) => !value)}>
            {ctx.t("ui.sessionGraph.inspector.title")}
          </button>
        </div>
      </div>
      <GraphToolbar {...chrome} />
      <Show when={focusedNode()}>
        {(node) => (
          <GraphStatusBar
            count={1}
            labels={{
              selected: ctx.t("status.selected", { count: 1 }),
              frame: ctx.t("status.frame"),
              keepOnly: ctx.t("status.keepOnly"),
              copyPaths: ctx.t("status.copyPaths"),
              exportSubset: ctx.t("status.exportSubset"),
              addNote: ctx.t("status.addNote"),
              compare: ctx.t("status.compare"),
              clearCompare: ctx.t("status.clearCompare"),
              collapseGroup: ctx.t("status.collapseGroup"),
              expandGroup: ctx.t("status.expandGroup"),
              collapseOthers: ctx.t("status.collapseOthers"),
              pin: ctx.t("status.pin"),
              unpin: ctx.t("status.unpin"),
              clear: ctx.t("status.clear"),
            }}
            onFrame={() => props.model.setLevel(props.session, "detail")}
            onKeepOnly={() =>
              props.model.saveFacets(props.session, {
                query: node().label,
                kinds: new Set(),
                statuses: new Set(),
                domains: new Set(["session"]),
              })
            }
            onCopyPaths={() => {
              const path = (node().data?.path as string | undefined) ?? node().label
              void navigator.clipboard?.writeText(path)
            }}
            onExportSubset={() => props.model.export(props.session, "json")}
            onAddNote={() => {
              annotations.openNoteComposer()
              const body = window.prompt(ctx.t("status.addNote"))
              if (body) annotations.saveNote(body)
            }}
            compare={{ active: comparing(), onCompare: toggleCompare, onClear: toggleCompare }}
            pinned={props.model.pins(props.session).includes(node().id)}
            onTogglePin={() => props.model.togglePin(props.session, node().id)}
            onClear={() => props.model.focus(props.session, undefined)}
          />
        )}
      </Show>
      <Show when={showFind()}>
        <GraphFind model={chrome.model} session={chrome.session} graph={chrome.graph} onClose={() => setShowFind(false)} />
      </Show>
      <div class="sg-session-graph__body" ref={body}>
        <GraphCanvas session={props.session} class="sg-session-graph__canvas" registry={registry} graph={graph} />
        <GraphA11y
          model={renderModel()}
          selection={focusedNode() ? [focusedNode()!.id] : []}
          announcement={announcement()}
          label={ctx.t("a11y.label")}
          edgeLabel={ctx.t("a11y.edgeLabel")}
          instructions={ctx.t("a11y.instructions")}
          selectedMessage={(labels) => ctx.t("a11y.selected", { labels: labels.join(", ") })}
          clearedMessage={ctx.t("a11y.cleared")}
          connectionsMessage={(edges) => ctx.t("a11y.connections", { edges: edges.join(", ") })}
          onSelect={(id) => props.model.focus(props.session, id)}
          onEscape={() => props.model.focus(props.session, undefined)}
        />
        <Show when={showLegend()}>
          <GraphLegend />
        </Show>
        <Show when={showMinimap()}>
          <GraphMinimap
            nodes={graph().nodes}
            positions={positions()}
            theme={DARK_THEME}
            label={ctx.t("minimap.label")}
            onFocus={(id) => props.model.focus(props.session, id)}
          />
        </Show>
        <Show when={showPopover() && focusedNode()}>
          {(node) => (
            <GraphPopover
              {...detailProps()}
              node={node()}
              closeLabel={ctx.t("ui.sessionGraph.popover.close")}
              onClose={() => setShowPopover(false)}
            />
          )}
        </Show>
        <Show when={showGallery()}>
          <GraphGallery
            model={graph()}
            theme={DARK_THEME}
            current={props.model.layout(props.session)}
            labels={{
              title: ctx.t("ui.sessionGraph.gallery.label"),
              close: ctx.t("ui.sessionGraph.gallery.close"),
              layout: (strategy) => ctx.t(`layout.${strategy}`),
            }}
            onOpen={(layout) => props.model.setLayout(props.session, layout)}
            onClose={() => setShowGallery(false)}
          />
        </Show>
        <Windows
          windows={windows()}
          onChange={setWindows}
          onClose={closeWindow}
          render={windowContent}
          title={windowTitle}
          bounds={bounds}
          emptyTitle={ctx.t("panel.window")}
        />
        <Show when={searchQuery().length > 0 && searchResults().length > 0}>
          <div class="sg-panel__results">
            <div class="sg-panel__results-head">{ctx.plural("panel.searchResults", searchResults().length)}</div>
            <ul class="sg-panel__results-list" role="listbox" aria-label={ctx.t("command.search")}>
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
                      class="sg-panel__result"
                      classList={{ "sg-panel__result--active": index() === searchIndex() }}
                      onMouseEnter={() => setSearchIndex(index())}
                      onClick={() => openSearchResult(node)}
                    >
                      <span class="sg-panel__result-label">{node.label}</span>
                      <Show when={node.summary}>
                        <span class="sg-panel__result-summary">{node.summary}</span>
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
