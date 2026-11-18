import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import type { JSX } from "solid-js"
import type { SpacegraphModel } from "../plugin/model"
import { SessionGraph } from "./session-graph"

export function MapSurface(props: {
  session: MountedSession
  screen: SessionScreen
  transcript: JSX.Element
  model: SpacegraphModel
}) {
  return (
    <div class="sg-map-canvas" data-slot="spacegraph-surface-map">
      <SessionGraph model={props.model} session={props.session} screen={props.screen} class="sg-map-canvas" />
      <div aria-hidden="true" style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", "clip-path": "inset(50%)" }}>
        {props.transcript}
      </div>
    </div>
  )
}
