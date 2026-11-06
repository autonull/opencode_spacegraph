import { For, Show, createMemo } from "solid-js"
import { turnSubgraph } from "@opencode/session-ui/graph"
import type { GraphNode } from "@opencode/session-ui/graph"
import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"

const TURN_PREFIX = "turn:"

/** The turn's nodes, shared by the overlay layer and the no-surface dialog. */
export function TurnMapBody(props: { model: SpacegraphModel; session: MountedSession; screen: SessionScreen; empty: string }) {
  const graph = props.model.graph(props.session)

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

  return (
    <Show
      when={subgraph().nodes.length > 0}
      fallback={<div class="py-8 text-center text-13-regular text-text-weak">{props.empty}</div>}
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
  )
}
