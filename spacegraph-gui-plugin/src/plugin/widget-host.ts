import type { MountedSession, SessionScreen, SetupContext } from "@opencode/plugin/gui"
import type { WidgetRegistry } from "spacegraphjs/widgets"
import { createMemo, type Accessor } from "solid-js"
import { createOpenCodeWidgetRegistry } from "../host/widgets/session-widget-components"
import type { SessionWidgetID } from "../host/widget-registry"
import type { GraphViewData } from "../model"
import type definition from "./declarations"
import type { SpacegraphModel } from "./model"

/**
 * P3.6: the single host policy that binds OpenCode widgets to the library registry. Map and hybrid
 * surfaces share it so the same prefs gate decides which widgets appear on every graph.
 */
export function createHostWidgetRegistry(input: {
  ctx: SetupContext<typeof definition>
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  graph: Accessor<GraphViewData>
}): Accessor<WidgetRegistry | undefined> {
  const { ctx } = input

  const diffFiles = (nodeID: string) => {
    const graph = input.graph()

    return graph.edges.flatMap((edge) => {
      if (edge.kind !== "writes" || edge.source !== nodeID) return []
      const target = graph.nodes.find((candidate) => candidate.id === edge.target)
      const path = typeof target?.data?.path === "string" ? target.data.path : undefined

      return path ? [{ path, additions: edge.data?.additions, deletions: edge.data?.deletions }] : []
    })
  }

  return createMemo(() => {
    const prefs = ctx.stores.prefs.value.widgets
    if (prefs?.enabled !== true) return undefined
    const flags = prefs as Record<string, boolean | undefined>
    const enabled = (id: SessionWidgetID) => id === "subagent" || flags[id] !== false

    return createOpenCodeWidgetRegistry({
      composer: () => input.screen.composer,
      model: input.graph,
      onDrillDown: (id) => input.model.focus(input.session, id),
      diffFiles,
      readOnly: () => input.model.parked(input.session),
      enabled,
    })
  })
}
