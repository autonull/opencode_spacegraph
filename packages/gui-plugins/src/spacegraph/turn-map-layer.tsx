import { For, Show, createMemo, onMount } from "solid-js"
import { buildGraph, turnSubgraph } from "@opencode/session-ui/graph"
import type { SessionStatus } from "@opencode/client/promise"
import type { GraphNode } from "@opencode/session-ui/graph"
import type { MountedSession, SessionScreen, SessionSurface } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"

const TURN_PREFIX = "turn:"

export function TurnMapLayer(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  surface: SessionSurface
  labels: { title: string; open: string; close: string; empty: string }
  openFull: () => void
}) {
  let panel: HTMLDivElement | undefined

  const graph = createMemo(() => {
    const status: SessionStatus =
      props.session.server.data.session.status(props.session.id) === "running" ? { type: "busy" } : { type: "idle" }

    return buildGraph({ messages: props.session.server.data.session.message.list(props.session.id), status })
  })

  const turn = createMemo(() => {
    const messageID = props.screen.transcript.activeMessageID()

    return (messageID ? graph().turnByMessageID.get(messageID) : undefined) ?? graph().activeTurn
  })

  const subgraph = createMemo(() => {
    const id = turn()

    return id ? turnSubgraph(graph(), id, 7) : { nodes: [], edges: [] }
  })

  const opener = (node: GraphNode) =>
    node.messageID ?? (node.turnID?.startsWith(TURN_PREFIX) ? node.turnID.slice(TURN_PREFIX.length) : undefined)

  const close = () => props.model.closeTurnMap(props.session)

  const openFull = () => {
    close()
    props.openFull()
  }

  onMount(() => panel?.querySelector<HTMLElement>("button")?.focus())

  const keydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault()
      close()

      return
    }

    if (event.key !== "Tab" || !panel) return

    const focusable = panel.querySelectorAll<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    )

    const first = focusable.item(0)
    const last = focusable.item(focusable.length - 1)

    if (!(first instanceof HTMLElement) || !(last instanceof HTMLElement)) return

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <Show when={props.model.turnMap(props.session)}>
    <div
      class="absolute inset-0 z-10 flex items-center justify-center bg-v2-overlay-simple-overlay-scrim p-6"
      onKeyDown={keydown}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={props.labels.title}
        class="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-xl border border-v2-border-border-base bg-v2-background-bg-base shadow-xl"
        data-slot="spacegraph-turn-map"
      >
        <div class="flex shrink-0 items-center justify-between gap-3 border-b border-v2-border-border-base px-4 py-3">
          <span class="text-13-medium text-text-base">{props.labels.title}</span>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-13-regular text-text-weak hover:bg-v2-overlay-simple-overlay-hover hover:text-text-base"
            onClick={close}
          >
            {props.labels.close}
          </button>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto p-4" data-scrollable>
          <Show
            when={subgraph().nodes.length > 0}
            fallback={<div class="py-8 text-center text-13-regular text-text-weak">{props.labels.empty}</div>}
          >
            <div class="flex flex-col gap-2">
              <For each={subgraph().nodes}>
                {(node) => (
                  <button
                    type="button"
                    class="flex items-center gap-2 rounded-md border border-v2-border-border-base px-3 py-2 text-start text-13-regular text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                    onClick={() => {
                      const id = opener(node)

                      if (id) props.screen.transcript.reveal(id)
                    }}
                  >
                    <span class="min-w-0 truncate">{node.label}</span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
        <div class="flex shrink-0 justify-end border-t border-v2-border-border-base px-4 py-3">
          <button
            type="button"
            class="rounded-md border border-v2-border-border-base px-3 py-1.5 text-13-regular text-text-base hover:bg-v2-overlay-simple-overlay-hover"
            onClick={openFull}
          >
            {props.labels.open}
          </button>
        </div>
      </div>
    </div>
    </Show>
  )
}
