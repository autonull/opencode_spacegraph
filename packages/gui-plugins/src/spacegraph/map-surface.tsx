import type { JSX } from "solid-js"
import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"
import { GraphCanvas } from "./graph-canvas"

export function MapSurface(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  transcript: JSX.Element
}) {
  return (
    <div class="relative size-full min-h-0" data-slot="spacegraph-surface-map">
      <GraphCanvas
        model={props.model}
        session={props.session}
        screen={props.screen}
        level={() => props.model.level(props.session)}
        layout={() => props.model.layout(props.session)}
      />
      <div class="invisible absolute inset-0">{props.transcript}</div>
    </div>
  )
}
