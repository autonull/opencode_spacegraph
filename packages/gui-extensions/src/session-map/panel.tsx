import { For, Show, createMemo } from "solid-js"
import { buildGraph, layoutGraph, nodeSize, nodesAtLevel, turnNodeID } from "@opencode/session-ui/graph"
import type { GraphNode, GraphModel } from "@opencode/session-ui/graph"
import type { SessionStatus } from "@opencode/client/promise"
import { useExtension } from "../sdk"
import type { MountedSession, SessionScreen } from "../sdk"
import type { SessionMapModel } from "./model"

const PAD = 24

const TURN_PREFIX = "turn:"

/**
 * The side-panel session map: a compact, non-interactive spatial overview of the routed session's turns and
 * phases. It follows the transcript's active message and reveals a message when the user picks its node.
 */
export default function SessionMapPanel(props: {
  map: SessionMapModel
  session: MountedSession
  screen: SessionScreen
}) {
  const ctx = useExtension()

  const model = createMemo<GraphModel>(() => {
    const data = props.session.server.data

    const status: SessionStatus =
      data.session.status(props.session.id) === "running" ? { type: "busy" } : { type: "idle" }

    return buildGraph(data.session.message.list(props.session.id), status)
  })

  const geometry = createMemo(() => {
    const graph = model()
    const positions = layoutGraph(graph).positions

    const boxes = nodesAtLevel(graph, "overview").flatMap((node) => {
      const position = positions.get(node.id)

      if (!position) return []
      const [w, h] = nodeSize(node)

      return [{ node, x: position.x, y: position.y, w, h, left: position.x - w / 2, top: position.y - h / 2 }]
    })

    const left = Math.min(...boxes.map((box) => box.left), 0)
    const top = Math.min(...boxes.map((box) => box.top), 0)
    const right = Math.max(...boxes.map((box) => box.left + box.w), 0)
    const bottom = Math.max(...boxes.map((box) => box.top + box.h), 0)

    return { boxes, viewBox: `${left - PAD} ${top - PAD} ${right - left + PAD * 2} ${bottom - top + PAD * 2}` }
  })

  // The highlight prefers the turn the transcript shows, then the node the user last picked in this map, then the
  // model's own active turn (in-flight work), so a pick is never shadowed by an idle session's last turn.
  const activeID = createMemo(() => {
    const graph = model()
    const messageID = props.screen.transcript.activeMessageID()
    const owner = messageID ? graph.turnByMessageID.get(messageID) : undefined

    return (owner ? turnNodeID(owner) : undefined) ?? props.map.focused(props.session) ?? graph.activeTurn
  })

  const reveal = (node: GraphNode) => {
    const opener =
      node.messageID ?? (node.turnID?.startsWith(TURN_PREFIX) ? node.turnID.slice(TURN_PREFIX.length) : undefined)

    if (!opener) return
    props.map.focus(props.session, node.id)
    props.screen.transcript.reveal(opener)
  }

  const label = (node: GraphNode) => {
    const count = node.clusterOf?.length ?? 0
    const text = node.derived && count > 0 ? `${node.label} · ${count}` : node.label

    return text.length > 22 ? `${text.slice(0, 21)}…` : text
  }

  return (
    <div class="flex h-full min-h-0 flex-col bg-v2-background-bg-base" data-slot="session-map-panel">
      <div class="flex shrink-0 items-center gap-2 border-b border-v2-border-border-base px-4 py-2.5 text-13-medium text-text-base">
        {ctx.t("tab.title")}
      </div>
      <div class="relative min-h-0 flex-1 overflow-hidden">
        <Show
          when={geometry().boxes.length > 0}
          fallback={
            <div class="flex h-full items-center justify-center px-6 text-center text-13-regular text-text-weak">
              {ctx.t("empty")}
            </div>
          }
        >
          <svg
            class="size-full"
            viewBox={geometry().viewBox}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={ctx.t("tab.title")}
          >
            <For each={geometry().boxes}>
              {(box) => (
                <g
                  class="cursor-pointer"
                  data-slot="session-map-node"
                  data-node-id={box.node.id}
                  onClick={() => reveal(box.node)}
                >
                  <rect
                    x={box.left}
                    y={box.top}
                    width={box.w}
                    height={box.h}
                    rx={8}
                    fill={box.node.derived ? "var(--v2-background-bg-deep)" : "var(--v2-background-bg-base)"}
                    stroke={box.node.id === activeID() ? "var(--v2-text-text-base)" : "var(--v2-border-border-base)"}
                    stroke-width={box.node.id === activeID() ? 2 : 1}
                  />
                  <text
                    x={box.x}
                    y={box.y}
                    text-anchor="middle"
                    dy="0.32em"
                    font-size="11"
                    fill={box.node.id === activeID() ? "var(--v2-text-text-base)" : "var(--text-weak)"}
                  >
                    {label(box.node)}
                  </text>
                </g>
              )}
            </For>
          </svg>
        </Show>
      </div>
    </div>
  )
}
