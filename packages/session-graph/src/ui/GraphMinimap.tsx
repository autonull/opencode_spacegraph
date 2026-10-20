import type { RendererViewport, RenderTheme } from "@spacegraphjs/renderer"
import type { GraphModel, GraphNode, Position } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { Navigation } from "spacegraphjs/navigation"
import { createMemo, For, Show, createSignal } from "solid-js"

const BOX_W = 176
const BOX_H = 132
const PAD = 8
const DOT_R = 2.5

export type GraphMinimapProps = {
  model: GraphModel
  positions: ReadonlyMap<string, Position>
  theme: RenderTheme
  /** Latest viewport report from the active renderer; drives the view rectangle. */
  viewport?: RendererViewport
  /** Pan the main camera so `center` (graph x/y) is the viewport centre. */
  onPan: (center: [number, number]) => void
}

/**
 * U3.13 — a renderer-agnostic SVG overview fed by the same layout positions as the canvas. It reads
 * node positions and the adapter's reported viewport, so it stays in sync with either renderer and
 * never runs a second scene pass. Clicking or dragging pans through the shared viewport contract.
 *
 * The geometry lives in the library (`spacegraphjs/navigation`); this component owns the dots, the
 * colours, and the pointer handling.
 */
export const GraphMinimap = (props: GraphMinimapProps) => {
  const i18n = useI18n()
  const [dragging, setDragging] = createSignal(false)

  const placed = createMemo(() =>
    props.model.nodes
      .map((node) => ({ node, position: props.positions.get(node.id) }))
      .filter((entry): entry is { node: GraphNode; position: Position } => entry.position !== undefined),
  )

  const projection = createMemo(() =>
    Navigation.project({
      positions: new Map(placed().map((entry) => [entry.node.id, entry.position])),
      box: { width: BOX_W, height: BOX_H },
      padding: PAD,
      viewport: props.viewport?.extent
        ? { center: [props.viewport.center[0], props.viewport.center[1]], extent: props.viewport.extent }
        : undefined,
    }),
  )

  const colorFor = (node: GraphNode) => {
    switch (node.status) {
      case "failed":
        return props.theme.error
      case "interrupted":
        return props.theme.warning
      case "success":
        return props.theme.success
      case "running":
      case "pending":
        return props.theme.accent
      default:
        return props.theme.textMuted
    }
  }

  const panTo = (clientX: number, clientY: number, target: SVGSVGElement) => {
    if (placed().length === 0) return
    const rect = target.getBoundingClientRect()
    const point = projection().unproject({
      x: ((clientX - rect.left) / rect.width) * BOX_W,
      y: ((clientY - rect.top) / rect.height) * BOX_H,
    })
    props.onPan([point.x, point.y])
  }

  return (
    <svg
      data-component="session-graph-minimap"
      data-slot="graph-minimap"
      role="application"
      aria-label={i18n.t("ui.sessionGraph.minimap.label")}
      width={BOX_W}
      height={BOX_H}
      viewBox={`0 0 ${BOX_W} ${BOX_H}`}
      style={{
        width: `${BOX_W}px`,
        height: `${BOX_H}px`,
        background: props.theme.surfaceMuted,
        border: `1px solid ${props.theme.border}`,
        "border-radius": "6px",
        cursor: "crosshair",
      }}
      onPointerDown={(event) => {
        setDragging(true)
        event.currentTarget.setPointerCapture?.(event.pointerId)
        panTo(event.clientX, event.clientY, event.currentTarget)
        event.stopPropagation()
      }}
      onPointerMove={(event) => {
        if (!dragging()) return
        panTo(event.clientX, event.clientY, event.currentTarget)
        event.stopPropagation()
      }}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setDragging(false)}
    >
      <For each={placed()}>
        {(entry) => {
          const point = () => projection().project(entry.position)
          return (
            <circle cx={point().x} cy={point().y} r={DOT_R} fill={colorFor(entry.node)} opacity="0.85" />
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
