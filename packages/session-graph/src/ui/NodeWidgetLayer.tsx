import type { GraphRenderer } from "@spacegraphjs/renderer"
import type { GraphNode } from "@opencode/session-ui/graph"
import { WidgetLayer, type MountedWidget } from "spacegraphjs/widgets"
import { createEffect, createMemo, createSignal, For, onCleanup, onMount } from "solid-js"
import type { JSX } from "solid-js"
import type { WidgetRegistry } from "spacegraphjs/widgets"
import { widgetRequestNode } from "./widget-registry"

/**
 * Props for the {@link NodeWidgetLayer} component.
 *
 * @public
 */
export type NodeWidgetLayerProps = {
  /** Accessor for the renderer instance */
  renderer: () => GraphRenderer | undefined
  /** Accessor for the drawn nodes (contentIDs) */
  contentIDs: () => string[]
  /** Accessor for the model to look up nodes by ID */
  model: () => { nodes: GraphNode[] }
  /** Host-owned widget registry. The library layer resolves, mounts and fades; the host supplies content. */
  registry: () => WidgetRegistry | undefined
  /** Optional: container element to constrain widget bounds */
  container?: () => HTMLElement | undefined
}

type WidgetEntry = { widget: MountedWidget; x: number; y: number }

/**
 * NodeWidgetLayer - renders host-registered Solid widgets anchored to graph nodes.
 *
 * Eligibility, lifecycle and DOM fog come from the library's `WidgetLayer`. This host component owns
 * screen positioning, event routing and keyboard focus. Widgets carry `data-sg-interactive` so the
 * canvas never starts a drag from inside a widget.
 *
 * @public
 */
export const NodeWidgetLayer = (props: NodeWidgetLayerProps) => {
  const [tick, setTick] = createSignal(0)
  const [mounted, setMounted] = createSignal<readonly MountedWidget[]>([])
  const [active, setActive] = createSignal(0)
  const refs: Array<HTMLDivElement | undefined> = []

  const layer = createMemo(() => {
    const registry = props.registry()
    if (!registry) return undefined
    return new WidgetLayer({ registry, slots: ["body"], representationOf: () => "card" })
  })

  createEffect(() => {
    const instance = layer()
    if (!instance) {
      setMounted([])
      return
    }
    const drawn = new Set(props.contentIDs())
    const nodes = props.model().nodes.filter((node) => drawn.has(node.id)).map(widgetRequestNode)
    instance.sync(nodes)
    setMounted([...instance.mounted()])
    onCleanup(() => instance.destroy())
  })

  onMount(() => {
    const renderer = props.renderer()
    if (!renderer) return
    const invalidate = () => setTick((value) => value + 1)
    const unsubViewport = renderer.on("viewportChange", invalidate)
    const unsubNodeMoved = renderer.on("nodeMoved", invalidate)
    onCleanup(() => {
      unsubViewport()
      unsubNodeMoved()
    })
  })

  const entries = createMemo((): readonly WidgetEntry[] => {
    tick()
    const renderer = props.renderer()
    if (!renderer?.getNodeScreenPosition) return []
    return mounted().flatMap((widget) => {
      const pos = renderer.getNodeScreenPosition?.(widget.nodeId)
      return pos ? [{ widget, x: pos.x, y: pos.y }] : []
    })
  })

  const activeIndex = () => Math.min(active(), Math.max(0, entries().length - 1))

  const moveFocus = (event: KeyboardEvent) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = (activeIndex() + delta + entries().length) % entries().length
    setActive(next)
    refs[next]?.focus()
  }

  return (
    <div
      class="absolute inset-0 pointer-events-none overflow-hidden"
      data-slot="graph-node-widget-layer"
      data-component="session-node-widget-layer"
      role="group"
      aria-label="Node widgets"
      style={{ "z-index": 10 }}
    >
      <For each={entries()}>
        {(entry, index) => {
          const label = () =>
            props.registry()?.get(entry.widget.descriptorId)?.label ?? entry.widget.descriptorId
          return (
            <div
              ref={(element) => { refs[index()] = element }}
              class="absolute pointer-events-auto"
              style={{
                left: `${entry.x}px`,
                top: `${entry.y}px`,
                transform: "translate(-50%, -100%)",
              }}
              data-node-id={entry.widget.nodeId}
              data-slot="session-node-widget-wrapper"
              data-component="session-node-widget"
              data-sg-interactive="true"
              role="group"
              aria-label={`${label()} widget`}
              tabindex={index() === activeIndex() ? 0 : -1}
              onKeyDown={(event: KeyboardEvent) => moveFocus(event)}
              onMouseDown={(event: MouseEvent) => event.stopPropagation()}
              onPointerDown={(event: PointerEvent) => event.stopPropagation()}
              onClick={(event: MouseEvent) => event.stopPropagation()}
              onDblClick={(event: MouseEvent) => event.stopPropagation()}
              onWheel={(event: WheelEvent) => event.stopPropagation()}
            >
              {entry.widget.handle.element as JSX.Element}
            </div>
          )
        }}
      </For>
    </div>
  )
}
