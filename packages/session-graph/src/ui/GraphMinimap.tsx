import type { RendererViewport, RenderTheme } from "@spacegraphjs/renderer"
import type { GraphModel, GraphNode, Position } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
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
 */
export const GraphMinimap = (props: GraphMinimapProps) => {
  const i18n = useI18n()
  const [dragging, setDragging] = createSignal(false)

  const placed = createMemo(() =>
    props.model.nodes
      .map((node) => ({ node, position: props.positions.get(node.id) }))
      .filter((entry): entry is { node: GraphNode; position: Position } => entry.position !== undefined),
  )

  const bounds = createMemo(() => {
    const points = placed().map((entry) => entry.position)
    if (points.length === 0) return undefined
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
  })

  const scale = () => {
    const b = bounds()
    if (!b) return 1
    const spanX = Math.max(b.maxX - b.minX, 1)
    const spanY = Math.max(b.maxY - b.minY, 1)
    return Math.min((BOX_W - PAD * 2) / spanX, (BOX_H - PAD * 2) / spanY)
  }

  // Y is flipped so the overview matches the y-up graph space the default renderer draws.
  const project = (x: number, y: number) => {
    const b = bounds()
    if (!b) return { x: 0, y: 0 }
    const s = scale()
    const offsetX = (BOX_W - (b.maxX - b.minX) * s) / 2
    const offsetY = (BOX_H - (b.maxY - b.minY) * s) / 2
    return { x: (x - b.minX) * s + offsetX, y: (b.maxY - y) * s + offsetY }
  }

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

  const viewRect = createMemo(() => {
    const viewport = props.viewport
    if (!viewport?.extent) return undefined
    const [cx, cy] = viewport.center
    const { width, height } = viewport.extent
    const topLeft = project(cx - width / 2, cy + height / 2)
    return { x: topLeft.x, y: topLeft.y, width: width * scale(), height: height * scale() }
  })

  const panTo = (clientX: number, clientY: number, target: SVGSVGElement) => {
    const rect = target.getBoundingClientRect()
    const b = bounds()
    if (!b) return
    const s = scale()
    const spanX = b.maxX - b.minX
    const spanY = b.maxY - b.minY
    const offsetX = (BOX_W - spanX * s) / 2
    const offsetY = (BOX_H - spanY * s) / 2
    const sx = ((clientX - rect.left) / rect.width) * BOX_W
    const sy = ((clientY - rect.top) / rect.height) * BOX_H
    props.onPan([b.minX + (sx - offsetX) / s, b.maxY - (sy - offsetY) / s])
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
          const point = () => project(entry.position.x, entry.position.y)
          return (
            <circle cx={point().x} cy={point().y} r={DOT_R} fill={colorFor(entry.node)} opacity="0.85" />
          )
        }}
      </For>
      <Show when={viewRect()}>
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
