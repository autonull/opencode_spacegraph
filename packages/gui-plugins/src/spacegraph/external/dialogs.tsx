// Fallbacks for hosts that do not provide `ctx.surfaces`. The map and the hybrid arrangement open as dialogs there;
// the side Panel remains the primary map.

import { createMemo, For, Show, type JSX } from "solid-js"
import type { SessionStatus } from "@opencode/client/promise"
import { buildGraph, turnSubgraph } from "@opencode/session-ui/graph"
import type { MountedSession, SessionScreen, SetupContext } from "@opencode/plugin/gui"
import definition from ".."
import { FullMap } from "../full-map"
import type { SpacegraphModel } from "../model"

const TURN_PREFIX = "turn:"

type Ctx = SetupContext<typeof definition>

function graphOf(session: MountedSession) {
  const status: SessionStatus =
    session.server.data.session.status(session.id) === "running" ? { type: "busy" } : { type: "idle" }

  return buildGraph({ messages: session.server.data.session.message.list(session.id), status })
}

export function MapDialog(props: {
  ctx: Ctx
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  title: string
}): JSX.Element {
  return (
    <props.ctx.ui.Dialog title={props.title} size="x-large">
      <div class="h-[min(64vh,560px)] min-h-0">
        <FullMap model={props.model} session={props.session} screen={props.screen} />
      </div>
    </props.ctx.ui.Dialog>
  )
}

export function TurnMapDialog(props: {
  ctx: Ctx
  session: MountedSession
  screen: SessionScreen
  labels: { title: string; open: string; empty: string }
  openFull: () => void
}): JSX.Element {
  const graph = createMemo(() => graphOf(props.session))

  const subgraph = createMemo(() => {
    const active = props.screen.transcript.activeMessageID()
    const turn = (active ? graph().turnByMessageID.get(active) : undefined) ?? graph().activeTurn

    return turn ? turnSubgraph(graph(), turn, 7) : { nodes: [], edges: [] }
  })

  const opener = (node: { messageID?: string; turnID?: string }) =>
    node.messageID ?? (node.turnID?.startsWith(TURN_PREFIX) ? node.turnID.slice(TURN_PREFIX.length) : undefined)

  return (
    <props.ctx.ui.Dialog
      title={props.labels.title}
      size="normal"
      footer={
        <props.ctx.ui.Button variant="ghost" onClick={props.openFull}>
          {props.labels.open}
        </props.ctx.ui.Button>
      }
    >
      <div class="flex flex-col gap-2">
        <Show
          when={subgraph().nodes.length > 0}
          fallback={<div class="py-8 text-center text-13-regular text-text-weak">{props.labels.empty}</div>}
        >
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
        </Show>
      </div>
    </props.ctx.ui.Dialog>
  )
}
