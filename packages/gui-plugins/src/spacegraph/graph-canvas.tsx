import { For, Show, createMemo, type Accessor } from "solid-js"
import { buildGraph, layoutGraph, nodeSize, nodesAtLevel, turnNodeID } from "@opencode/session-ui/graph"
import type { GraphNode, GraphViewData, LayoutStrategy, ZoomLevel } from "@opencode/session-ui/graph"
import type { SessionStatus } from "@opencode/client/promise"
import { createKeyed, usePlugin } from "@opencode/plugin/gui"
import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"

const PAD = 32

const TURN_PREFIX = "turn:"

export function GraphCanvas(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  level: Accessor<ZoomLevel>
  layout: Accessor<LayoutStrategy>
}) {
  const ctx = usePlugin()

  const graph = createMemo<GraphViewData>(() => {
    const status: SessionStatus =
      props.session.server.data.session.status(props.session.id) === "running" ? { type: "busy" } : { type: "idle" }

    return buildGraph({ messages: props.session.server.data.session.message.list(props.session.id), status })
  })

  const geometry = createMemo(() => {
    const value = graph()
    const positions = layoutGraph(value, { level: props.level(), strategy: props.layout() }).positions

    const boxes = nodesAtLevel(value, props.level()).flatMap((node) => {
      const position = positions.get(node.id)

      if (!position) return []
      const [w, h] = nodeSize(node)

      return [{ node, x: position.x, y: position.y, w, h, left: position.x - w / 2, top: position.y - h / 2 }]
    })

    const left = Math.min(...boxes.map((box) => box.left), 0)
    const top = Math.min(...boxes.map((box) => box.top), 0)
    const right = Math.max(...boxes.map((box) => box.left + box.w), 0)
    const bottom = Math.max(...boxes.map((box) => box.top + box.h), 0)

    return {
      boxes,
      left: left - PAD,
      top: top - PAD,
      width: right - left + PAD * 2,
      height: bottom - top + PAD * 2,
    }
  })

  const viewBox = createMemo(() => {
    const canvas = geometry()
    const camera = props.model.camera(props.session)
    const width = canvas.width / camera.zoom
    const height = canvas.height / camera.zoom

    return `${canvas.left + (canvas.width - width) / 2 + camera.x} ${canvas.top + (canvas.height - height) / 2 + camera.y} ${width} ${height}`
  })

  let drag: { x: number; y: number } | undefined

  const pointerdown = (event: PointerEvent) => {
    if (event.button !== 0) return
    drag = { x: event.clientX, y: event.clientY }
    event.currentTarget instanceof Element && event.currentTarget.setPointerCapture(event.pointerId)
  }

  const pointermove = (event: PointerEvent) => {
    if (!drag) return

    const target = event.currentTarget

    if (!(target instanceof Element)) return

    const canvas = geometry()
    const camera = props.model.camera(props.session)
    const scale = canvas.width / camera.zoom / Math.max(1, target.clientWidth)

    props.model.panBy(props.session, -(event.clientX - drag.x) * scale, -(event.clientY - drag.y) * scale)
    drag = { x: event.clientX, y: event.clientY }
  }

  const pointerup = (event: PointerEvent) => {
    drag = undefined

    if (event.currentTarget instanceof Element && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  createKeyed(
    () => {
      const id = props.model.focused(props.session)
      const canvas = geometry()

      if (!id || !canvas.boxes.length) return undefined

      return `${id}\u0000${canvas.boxes.length}`
    },
    (key) => {
      const id = key.slice(0, key.lastIndexOf("\u0000"))
      const canvas = geometry()
      const box = canvas.boxes.find((candidate) => candidate.node.id === id)

      if (!box) return

      props.model.setCamera(props.session, {
        zoom: 2,
        x: box.x - (canvas.left + canvas.width / 2),
        y: box.y - (canvas.top + canvas.height / 2),
      })
    },
  )

  const activeID = createMemo(() => {
    const value = graph()
    const messageID = props.screen.transcript.activeMessageID()
    const owner = messageID ? value.turnByMessageID.get(messageID) : undefined

    return (owner ? turnNodeID(owner) : undefined) ?? props.model.focused(props.session) ?? value.activeTurn
  })

  const reveal = (node: GraphNode) => {
    const opener =
      node.messageID ?? (node.turnID?.startsWith(TURN_PREFIX) ? node.turnID.slice(TURN_PREFIX.length) : undefined)

    if (!opener) return
    props.model.focus(props.session, node.id)
    props.screen.transcript.reveal(opener)
  }

  const levelLabel = () => {
    switch (props.level()) {
      case "overview":
        return ctx.t("level.overview")
      case "execution":
        return ctx.t("level.execution")
      case "detail":
        return ctx.t("level.detail")
    }
  }

  const layoutLabel = () => {
    switch (props.layout()) {
      case "lanes":
        return ctx.t("layout.lanes")
      case "timeline":
        return ctx.t("layout.timeline")
      case "hierarchy":
        return ctx.t("layout.hierarchy")
      case "tree":
        return ctx.t("layout.tree")
      case "force":
        return ctx.t("layout.force")
    }
  }

  const label = (node: GraphNode) => {
    const count = node.clusterOf?.length ?? 0
    const text = node.derived && count > 0 ? `${node.label} · ${count}` : node.label

    return text.length > 22 ? `${text.slice(0, 21)}…` : text
  }

  return (
    <div class="relative size-full overflow-hidden bg-v2-background-bg-base" data-slot="spacegraph-map">
      <div class="absolute right-2 top-2 z-10 flex gap-1">
        <button
          type="button"
          class="rounded-md border border-v2-border-border-base bg-v2-background-bg-base px-2 py-1 text-13-regular text-text-base hover:bg-v2-overlay-simple-overlay-hover"
          aria-label={ctx.t("command.level")}
          onClick={() => props.model.cycleLevel(props.session)}
        >
          {levelLabel()}
        </button>
        <button
          type="button"
          class="rounded-md border border-v2-border-border-base bg-v2-background-bg-base px-2 py-1 text-13-regular text-text-base hover:bg-v2-overlay-simple-overlay-hover"
          aria-label={ctx.t("command.layout")}
          onClick={() => props.model.cycleLayout(props.session)}
        >
          {layoutLabel()}
        </button>
      </div>
      <div class="absolute bottom-2 left-2 z-10 flex gap-1">
        <button
          type="button"
          class="rounded-md border border-v2-border-border-base bg-v2-background-bg-base px-2 py-1 text-13-regular text-text-base hover:bg-v2-overlay-simple-overlay-hover"
          aria-label={ctx.t("camera.zoomOut")}
          onClick={() => props.model.zoomBy(props.session, 0.8)}
        >
          −
        </button>
        <button
          type="button"
          class="rounded-md border border-v2-border-border-base bg-v2-background-bg-base px-2 py-1 text-13-regular text-text-base hover:bg-v2-overlay-simple-overlay-hover"
          aria-label={ctx.t("camera.zoomIn")}
          onClick={() => props.model.zoomBy(props.session, 1.25)}
        >
          +
        </button>
        <button
          type="button"
          class="rounded-md border border-v2-border-border-base bg-v2-background-bg-base px-2 py-1 text-13-regular text-text-base hover:bg-v2-overlay-simple-overlay-hover"
          aria-label={ctx.t("camera.reset")}
          onClick={() => props.model.resetCamera(props.session)}
        >
          ⟲
        </button>
      </div>
      <Show
        when={geometry().boxes.length > 0}
        fallback={
          <div class="flex size-full items-center justify-center px-6 text-center text-13-regular text-text-weak">
            {ctx.t("empty")}
          </div>
        }
      >
        <svg
          class="size-full cursor-grab active:cursor-grabbing"
          viewBox={viewBox()}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={ctx.t("surface.map")}
          onPointerDown={pointerdown}
          onPointerMove={pointermove}
          onPointerUp={pointerup}
          onPointerCancel={pointerup}
        >
          <For each={geometry().boxes}>
            {(box) => (
              <g
                class="cursor-pointer"
                data-slot="spacegraph-node"
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
  )
}
