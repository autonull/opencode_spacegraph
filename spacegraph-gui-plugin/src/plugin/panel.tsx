import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import { SessionGraph } from "../host/session-graph"
import type { SpacegraphModel } from "./model"

/** The side panel entry: the full session-graph chrome, including search and inspector windows. */
export default function SpacegraphPanel(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
}) {
  return (
    <div class="sg-panel-host" data-slot="spacegraph-panel">
      <SessionGraph model={props.model} session={props.session} screen={props.screen} class="sg-panel" />
    </div>
  )
}
