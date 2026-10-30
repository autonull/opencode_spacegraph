import { createMemo } from "solid-js"
import { GraphView } from "@opencode/session-graph"
import { LAYOUT_STRATEGIES, buildGraph } from "@opencode/session-ui/graph"
import type { GraphArrangement, GraphSide } from "@opencode/session-ui/graph"
import type { SessionStatus } from "@opencode/client/promise"
import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"

export function FullMap(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  arrangement?: GraphArrangement
  arrangementSide?: GraphSide
  onSplitView?: () => void
}) {
  const graph = createMemo(() => {
    const status: SessionStatus =
      props.session.server.data.session.status(props.session.id) === "running" ? { type: "busy" } : { type: "idle" }

    return buildGraph({ messages: props.session.server.data.session.message.list(props.session.id), status })
  })

  const focused = () => props.model.focused(props.session)
  const preferredRenderer = () => props.model.renderer(props.session)
  const detailMode = () => props.model.detailMode(props.session)

  return (
    <GraphView
      model={graph()}
      level={props.model.level(props.session)}
      layout={props.model.layout(props.session)}
      depth={props.model.depth(props.session)}
      detailMode={detailMode()}
      selection={focused()}
      frame={focused()}
      activeTurn={graph().activeTurn}
      onSelect={(id) => props.model.focus(props.session, id)}
      onLayoutChange={(next) => {
        const layout = LAYOUT_STRATEGIES.find((candidate) => candidate === next)

        if (layout) props.model.setLayout(props.session, layout)
      }}
      onDepthChange={(next) => props.model.setDepth(props.session, next)}
      onDetailModeChange={(next) => props.model.setDetailMode(props.session, next)}
      arrangement={props.model.arrangement(props.session)}
      arrangementSide={props.model.side(props.session)}
      refitKey={props.arrangement}
      onArrangementChange={(next) => props.model.setArrangement(props.session, next)}
      onArrangementSideChange={(next) => props.model.setSide(props.session, next)}
      onSplitView={props.onSplitView}
      preferredRenderer={preferredRenderer}
    />
  )
}
