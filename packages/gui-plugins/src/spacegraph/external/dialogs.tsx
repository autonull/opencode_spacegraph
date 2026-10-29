// Fallbacks for hosts that do not provide `ctx.surfaces`. The map and the hybrid arrangement open as dialogs there;
// the side Panel remains the primary map.

import type { JSX } from "solid-js"
import type { MountedSession, SessionScreen, SetupContext } from "@opencode/plugin/gui"
import definition from ".."
import { FullMap } from "../full-map"
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
  return (
    <props.ctx.ui.Dialog title={props.title} size="x-large">
      <div class="h-[min(64vh,560px)] min-h-0">
        <FullMap model={props.model} session={props.session} screen={props.screen} />
      </div>
    </props.ctx.ui.Dialog>
  )
}

export function TurnMapDialog(props: {
  ctx: Ctx
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
        <TurnMapBody session={props.session} screen={props.screen} empty={props.labels.empty} />
      </div>
    </props.ctx.ui.Dialog>
  )
}
