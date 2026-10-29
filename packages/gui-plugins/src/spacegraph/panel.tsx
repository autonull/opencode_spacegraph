import { usePlugin, type MountedSession, type SessionScreen } from "@opencode/plugin/gui"
import { createMemo, createSignal, For, Show } from "solid-js"
import { buildGraph, navigationResults, rankedSearch, type GraphNode } from "@opencode/session-ui/graph"
import type { SpacegraphModel } from "./model"
import { FullMap } from "./full-map"
import { Inspector } from "./Inspector"
import { Windows } from "./Windows"
import type { WindowState } from "./Windows"

export default function SpacegraphPanel(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
}) {
  const ctx = usePlugin()

  const [windows, setWindows] = createSignal<WindowState[]>([])
  const [searchQuery, setSearchQuery] = createSignal("")
  const [searchResults, setSearchResults] = createSignal<GraphNode[]>([])
  const [searchIndex, setSearchIndex] = createSignal(0)

  const graph = createMemo(() => {
    const status: { type: "busy" | "idle" } =
      props.session.server.data.session.status(props.session.id) === "running" ? { type: "busy" } : { type: "idle" }

    return buildGraph({ messages: props.session.server.data.session.message.list(props.session.id), status })
  })

  const search = (query: string) => {
    const results = navigationResults(graph(), query) ?? rankedSearch(graph(), query)
    setSearchResults(results)
    setSearchIndex(0)
  }

  const openSearchResult = (node: GraphNode) => {
    props.model.focus(props.session, node.id)
    setSearchQuery("")
  }

  const closeWindow = (id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id))
  }

  const windowTitle = (window: WindowState) => {
    if (window.nodeID) {
      const node = graph().nodes.find((n: GraphNode) => n.id === window.nodeID)

      return node?.label ?? window.kind
    }

    return window.kind
  }

  const windowContent = (window: WindowState) => {
    if (window.kind === "inspector" && window.nodeID) {
      const node = graph().nodes.find((n: GraphNode) => n.id === window.nodeID)

      return (
        <Inspector
          model={graph()}
          node={node}
          onSelect={(id) => props.model.focus(props.session, id)}
          onOpenTranscript={(messageID, partID) => props.screen.transcript.reveal(messageID, partID)}
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
        <FullMap model={props.model} session={props.session} screen={props.screen} />
        <Windows
          windows={windows()}
          onChange={(windows) => setWindows(windows)}
          onClose={closeWindow}
          render={windowContent}
          title={windowTitle}
          anchorOf={anchorOf}
          bounds={bounds}
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
