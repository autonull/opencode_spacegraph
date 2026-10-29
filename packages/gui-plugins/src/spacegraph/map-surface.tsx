import type { JSX } from "solid-js"
import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"
import { FullMap } from "./full-map"

export function MapSurface(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  transcript: JSX.Element
  onSplitView?: () => void
}) {
  return (
    <div class="relative size-full min-h-0" data-slot="spacegraph-surface-map">
      <FullMap
        model={props.model}
        session={props.session}
        screen={props.screen}
        onSplitView={props.onSplitView}
      />
    </div>
  )
}
