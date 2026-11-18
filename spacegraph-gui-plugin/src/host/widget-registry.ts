import type { Composer } from "@opencode/plugin/gui"
import type { RenderModel, RenderNode } from "@spacegraphjs/renderer"
import { WidgetRegistry, type WidgetDescriptor, type WidgetHandle, type WidgetMountContext } from "spacegraphjs/widgets"
import { createComponent, getOwner, runWithOwner, type Component, type JSX, type Owner } from "solid-js"
import { render } from "solid-js/web"
import { EDIT_TOOLS, type GraphNode, type GraphViewData } from "../model"
import type {
  ComposerNodeWidgetProps,
  DiffNodeWidgetProps,
  SubagentNodeWidgetProps,
  TerminalNodeWidgetProps,
  TodoNodeWidgetProps,
} from "./widget-types"

/** Stable widget ids. An id is also the `RenderNode.widgets` request token (P3.6). */
export const SESSION_WIDGET_IDS = ["composer", "subagent", "todo", "diff", "terminal"] as const
export type SessionWidgetID = (typeof SESSION_WIDGET_IDS)[number]

/** The host's Solid components, injected so the pure registry stays headless. */
export type SessionWidgetComponents = {
  composer: Component<ComposerNodeWidgetProps>
  subagent: Component<SubagentNodeWidgetProps>
  todo: Component<TodoNodeWidgetProps>
  diff: Component<DiffNodeWidgetProps>
  terminal: Component<TerminalNodeWidgetProps>
}

/** Host policy injected into the registry. The library owns lifecycle; the host owns content. */
export type SessionWidgetHost = {
  readonly composer?: () => Composer | undefined
  readonly model?: () => GraphViewData
  readonly onDrillDown?: (id: string) => void
  readonly diffFiles?: (nodeID: string) => DiffNodeWidgetProps["files"]
  readonly readOnly?: () => boolean
  readonly enabled?: (id: SessionWidgetID) => boolean
}

const INITIAL_SIZE: Record<SessionWidgetID, { width: number; height: number }> = {
  composer: { width: 300, height: 140 },
  subagent: { width: 280, height: 180 },
  todo: { width: 240, height: 160 },
  diff: { width: 280, height: 160 },
  terminal: { width: 280, height: 150 },
}

/**
 * The host's kind → widget rule, moved verbatim from the panel's `renderNodeWidget`.
 * The registry resolves these tokens; it never inspects session vocabulary itself.
 */
export function sessionWidgetRequests(node: GraphNode): readonly SessionWidgetID[] {
  if (node.kind === "session" && node.id === "session") return ["composer"]
  if (node.kind === "subagent") return ["subagent"]
  if (node.kind === "tool" && node.data?.name === "todowrite") return ["todo"]
  if (node.kind === "tool" && typeof node.data?.name === "string" && EDIT_TOOLS.has(node.data.name))
    return ["diff"]
  if (node.kind === "result" && typeof node.data?.output === "string") return ["terminal"]
  return []
}

const graphNodeOf = (host: SessionWidgetHost, context: WidgetMountContext) =>
  host.model?.().nodes.find((node) => node.id === context.node.id)

function mountSolid(
  owner: Owner | null,
  id: SessionWidgetID,
  content: () => JSX.Element | undefined,
): WidgetHandle {
  const element = document.createElement("div")
  element.setAttribute("data-slot", `session-widget-${id}`)
  element.setAttribute("data-sg-interactive", "true")
  const dispose = owner
    ? runWithOwner(owner, () => render(() => content() ?? null, element))
    : render(() => content() ?? null, element)
  return {
    element,
    measure: () => ({ width: element.offsetWidth || 220, height: element.offsetHeight || 72 }),
    setOpacity: (opacity) => {
      element.style.opacity = String(opacity)
    },
    setInteractive: (interactive) => {
      element.style.pointerEvents = interactive ? "auto" : "none"
    },
    unmount: () => dispose?.(),
  }
}

/**
 * Register the five OpenCode widgets as `WidgetDescriptor`s. Each descriptor mounts an existing
 * Solid component into a host element through a `WidgetHandle`; no widget is hardcoded in the library.
 */
export function createSessionWidgetRegistry(
  host: SessionWidgetHost,
  components: SessionWidgetComponents,
): WidgetRegistry {
  const owner = getOwner()
  const registry = new WidgetRegistry()

  const register = <P extends object>(
    id: SessionWidgetID,
    label: string,
    component: Component<P>,
    propsFor: (node: GraphNode) => P | undefined,
  ) => {
    if (host.enabled && !host.enabled(id)) return
    const descriptor: WidgetDescriptor = {
      id,
      label,
      slots: ["body"],
      representations: ["card", "widget"],
      capabilities: ["interactive", "focus", "resize", "depth-fade"],
      initialSize: INITIAL_SIZE[id],
      mount: (context) => {
        const node = graphNodeOf(host, context)
        return mountSolid(owner, id, () => {
          const props = node ? propsFor(node) : undefined
          return props ? createComponent(component, props) : undefined
        })
      },
    }
    registry.register(descriptor)
  }

  register("composer", "Composer", components.composer, (node) => {
    const composer = host.composer?.()
    return composer ? { node, composer, readOnly: host.readOnly?.(), maxHeight: 140 } : undefined
  })
  register("subagent", "Subagent", components.subagent, (node) => {
    const model = host.model?.()
    return model
      ? {
          node,
          model,
          onDrillDown: host.onDrillDown ?? (() => undefined),
          maxDepth: 1 as const,
          inPopover: false,
        }
      : undefined
  })
  register("todo", "Todo", components.todo, (node) => ({ node }))
  register("diff", "Diff", components.diff, (node) => ({
    node,
    files: host.diffFiles?.(node.id),
  }))
  register("terminal", "Terminal", components.terminal, (node) => ({ node }))

  return registry
}

/**
 * Compatibility registry for the deprecated `renderNodeWidget` callback. It registers one descriptor
 * per session widget id, so the same `sessionWidgetRequests` gate decides eligibility while the
 * callback still supplies the content. Keeps `renderNodeWidget` working for one minor.
 */
export function legacyWidgetRegistry(
  render: (node: GraphNode) => JSX.Element | undefined,
  nodeOf: (id: string) => GraphNode | undefined,
): WidgetRegistry {
  const owner = getOwner()
  const registry = new WidgetRegistry()
  for (const id of SESSION_WIDGET_IDS) {
    registry.register({
      id,
      label: id,
      slots: ["body"],
      capabilities: ["interactive"],
      initialSize: INITIAL_SIZE[id],
      mount: (context) => {
        const node = nodeOf(context.node.id)
        return mountSolid(owner, id, () => (node ? render(node) : undefined))
      },
    })
  }
  return registry
}

/** Build the minimal `RenderNode` the library registry needs to resolve a widget request. */
export function widgetRequestNode(node: GraphNode): RenderNode {
  return {
    id: node.id,
    kind: node.kind,
    label: node.label,
    position: [0, 0, 0],
    widgets: sessionWidgetRequests(node),
  }
}

/** Attach widget request tokens to a built render model so a widget layer can resolve descriptors. */
export function withWidgetRequests(model: RenderModel, view: GraphViewData): RenderModel {
  const requests = new Map(view.nodes.map((node) => [node.id, sessionWidgetRequests(node)]))
  return {
    ...model,
    nodes: model.nodes.map((node) => {
      const widgets = requests.get(node.id)
      return widgets?.length ? { ...node, widgets } : node
    }),
  }
}
