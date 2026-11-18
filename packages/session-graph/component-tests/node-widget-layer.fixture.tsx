import type { GraphNode } from "@opencode/session-ui/graph"
import type { GraphRenderer } from "@spacegraphjs/renderer"
import { WidgetRegistry } from "spacegraphjs/widgets"
import { render } from "solid-js/web"
import { NodeWidgetLayer } from "../src/ui/NodeWidgetLayer"

/** Mount a widget layer with host-owned handles; no Solid widget code or i18n provider is needed. */
export function mountWidgetLayer(host: HTMLElement) {
  const registry = new WidgetRegistry()
  for (const id of ["composer", "todo", "diff"]) {
    registry.register({
      id,
      label: id,
      slots: ["body"],
      capabilities: ["interactive"],
      mount: () => {
        const element = document.createElement("div")
        element.textContent = `${id} content`
        return { element, measure: () => ({ width: 100, height: 50 }) }
      },
    })
  }

  const nodes: GraphNode[] = [
    { id: "session", kind: "session", label: "Session", status: "neutral" },
    { id: "tool:todo", kind: "tool", label: "Todo", status: "neutral", data: { name: "todowrite" } },
    { id: "tool:edit", kind: "tool", label: "Edit", status: "neutral", data: { name: "edit" } },
  ]
  const renderer = {
    getNodeScreenPosition: () => ({ x: 120, y: 120 }),
    on: () => () => undefined,
  } as unknown as GraphRenderer

  render(
    () => (
      <div style={{ position: "relative", width: "600px", height: "400px" }}>
        <NodeWidgetLayer
          renderer={() => renderer}
          contentIDs={() => nodes.map((node) => node.id)}
          model={() => ({ nodes })}
          registry={() => registry}
        />
      </div>
    ),
    host,
  )
}
