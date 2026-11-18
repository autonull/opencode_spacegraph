import type { RenderTheme, RendererViewport } from "@spacegraphjs/renderer"
import { createMemo, createSignal, For, Show } from "solid-js"
import type { GraphNode } from "../../model"
import { statusAccent } from "./cardTemplate"
import {
  MINIMAP_BOX,
  minimapPanPoint,
  minimapProjection,
  nearestNode,
  type Point,
} from "./minimap-geometry"

const DOT_R = 2.5

export type GraphMinimapProps = {
  nodes: readonly GraphNode[]
  positions: ReadonlyMap<string, Point>
  theme: RenderTheme
  label: string
  viewport?: RendererViewport
  onFocus: (nodeID: string) => void
}

/** Renderer-agnostic SVG overview: the canvas layout dots, a viewport frame, and click/drag to focus. */
export function GraphMinimap(props: GraphMinimapProps) {
  const [dragging, setDragging] = createSignal(false)
  const projection = createMemo(() =>
    minimapProjection(
      new Map(props.nodes.map((node) => [node.id, props.positions.get(node.id)]).filter((entry): entry is [string, Point] => !!entry[1])),
      props.viewport,
    ),
  )

  const pan = (clientX: number, clientY: number, target: SVGSVGElement) => {
    if (props.positions.size === 0) return
    const point = minimapPanPoint(clientX, clientY, target.getBoundingClientRect(), projection())
    const nearest = nearestNode(point, props.positions)
    if (nearest) props.onFocus(nearest)
  }

  return (
    <svg
      class="sg-minimap"
      data-component="session-graph-minimap"
      data-slot="graph-minimap"
      role="application"
      aria-label={props.label}
      width={MINIMAP_BOX.width}
      height={MINIMAP_BOX.height}
      viewBox={`0 0 ${MINIMAP_BOX.width} ${MINIMAP_BOX.height}`}
      style={{
        width: `${MINIMAP_BOX.width}px`,
        height: `${MINIMAP_BOX.height}px`,
        background: props.theme.surfaceMuted,
        border: `1px solid ${props.theme.border}`,
        "border-radius": "6px",
        cursor: "crosshair",
      }}
      onPointerDown={(event) => {
        setDragging(true)
        event.currentTarget.setPointerCapture?.(event.pointerId)
        pan(event.clientX, event.clientY, event.currentTarget)
        event.stopPropagation()
      }}
      onPointerMove={(event) => {
        if (!dragging()) return
        pan(event.clientX, event.clientY, event.currentTarget)
        event.stopPropagation()
      }}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setDragging(false)}
    >
      <For each={props.nodes}>
        {(node) => {
          const position = () => props.positions.get(node.id)
          const point = () => projection().project(position() ?? { x: 0, y: 0 })
          return (
            <Show when={position()}>
              <circle
                cx={point().x}
                cy={point().y}
                r={DOT_R}
                fill={statusAccent(props.theme, node.status, props.theme.textMuted)}
                opacity="0.85"
              />
            </Show>
          )
        }}
      </For>
      <Show when={projection().viewRect}>
        {(rect) => (
          <rect
            x={rect().x}
            y={rect().y}
            width={rect().width}
            height={rect().height}
            fill="none"
            stroke={props.theme.selection}
            stroke-width="1.5"
          />
        )}
      </Show>
    </svg>
  )
}
