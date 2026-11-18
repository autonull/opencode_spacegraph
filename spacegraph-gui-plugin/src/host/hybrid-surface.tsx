import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import type { JSX } from "solid-js"
import type { SpacegraphModel } from "../plugin/model"
import { SessionGraph } from "./session-graph"
import { HybridTranscript } from "./ui/hybrid-transcript"

export function HybridSurface(props: {
  session: MountedSession
  screen: SessionScreen
  transcript: JSX.Element
  model: SpacegraphModel
}) {
  return (
    <div class="sg-hybrid" data-slot="spacegraph-surface-hybrid">
      <SessionGraph model={props.model} session={props.session} screen={props.screen} class="sg-hybrid-canvas" />
      <div class="sg-hybrid__transcript">
        <HybridTranscript session={props.session} />
      </div>
    </div>
  )
}
