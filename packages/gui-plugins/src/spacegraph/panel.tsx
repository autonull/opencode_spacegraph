import { usePlugin, type MountedSession, type SessionScreen } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"
import { FullMap } from "./full-map"

export default function SpacegraphPanel(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
}) {
  const ctx = usePlugin()

  return (
    <div class="flex size-full min-h-0 flex-col bg-v2-background-bg-base" data-slot="spacegraph-panel">
      <div class="flex shrink-0 items-center border-b border-v2-border-border-base px-4 py-2.5 text-13-medium text-text-base">
        {ctx.t("panel.title")}
      </div>
      <div class="min-h-0 flex-1">
        <FullMap model={props.model} session={props.session} screen={props.screen} />
      </div>
    </div>
  )
}
