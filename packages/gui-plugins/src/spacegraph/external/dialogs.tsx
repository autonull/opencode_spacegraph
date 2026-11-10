// Fallbacks for hosts that do not provide `ctx.surfaces`. The map and the hybrid arrangement open as dialogs there;
// the side Panel remains the primary map.

import type { JSX } from "solid-js"
import type { MountedSession, SessionScreen, SetupContext } from "@opencode/plugin/gui"
import definition from ".."
import { SessionGraph } from "@opencode/session-graph"
import { LAYOUT_STRATEGIES } from "@opencode/session-ui/graph"
import type { SpacegraphModel } from "../model"
import { TurnMapBody } from "../turn-map-body"

type Ctx = SetupContext<typeof definition>

export function MapDialog(props: {
  ctx: Ctx
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  title: string
}): JSX.Element {
  const graph = props.model.graph(props.session)

  const focused = () => props.model.focused(props.session)
  const preferredRenderer = () => props.model.renderer()
  const detailMode = () => props.model.detailMode(props.session)
  const arrangement = () => props.model.arrangement(props.session)
  const arrangementSide = () => props.model.side(props.session)

  return (
    <props.ctx.ui.Dialog title={props.title} size="x-large">
      <div class="h-[min(64vh,560px)] min-h-0">
        <SessionGraph
          model={graph()}
          level={props.model.level(props.session)}
          layout={props.model.layout(props.session)}
          depth={props.model.depth(props.session)}
          detailMode={detailMode()}
          selection={focused()}
          frame={focused()}
          activeTurn={graph().activeTurn}
          onSelect={(id: string | undefined) => props.model.focus(props.session, id)}
          onLayoutChange={(next: string) => {
            const layout = LAYOUT_STRATEGIES.find((candidate: string) => candidate === next)

            if (layout) props.model.setLayout(props.session, layout)
          }}
          onDepthChange={(next: import("@opencode/session-ui/graph").DepthMode) => props.model.setDepth(props.session, next)}
          onDetailModeChange={(next: import("@opencode/session-ui/graph").DetailMode) => props.model.setDetailMode(props.session, next)}
          arrangement={arrangement()}
          arrangementSide={arrangementSide()}
          refitKey={arrangement()}
          onArrangementChange={(next: import("@opencode/session-ui/graph").GraphArrangement) => props.model.setArrangement(props.session, next)}
          onArrangementSideChange={(next: import("@opencode/session-ui/graph").GraphSide) => props.model.setSide(props.session, next)}
          preferredRenderer={preferredRenderer}
          chrome={true}
          shell="full"
        />
      </div>
    </props.ctx.ui.Dialog>
  )
}

export function TurnMapDialog(props: {
  ctx: Ctx
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  labels: { title: string; open: string; empty: string }
  openFull: () => void
}): JSX.Element {
  return (
    <props.ctx.ui.Dialog
      title={props.labels.title}
      size="normal"
      footer={
        <props.ctx.ui.Button variant="ghost" onClick={props.openFull}>
          {props.labels.open}
        </props.ctx.ui.Button>
      }
    >
      <div class="flex flex-col gap-2">
        <TurnMapBody model={props.model} session={props.session} screen={props.screen} empty={props.labels.empty} />
      </div>
    </props.ctx.ui.Dialog>
  )
}
