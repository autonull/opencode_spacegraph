import type { JSX } from "solid-js"
import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"
import { GraphCanvas } from "./graph-canvas"

export function HybridSurface(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  transcript: JSX.Element
}) {
  return (
    <div class="flex size-full min-h-0" data-slot="spacegraph-surface-hybrid">
      <div class="min-w-0 flex-1">{props.transcript}</div>
      <div class="w-2/5 shrink-0 border-l border-v2-border-border-base">
        <GraphCanvas model={props.model} session={props.session} screen={props.screen} />
      </div>
    </div>
  )
}
