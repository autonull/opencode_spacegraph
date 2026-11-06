import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"
import { FullMap } from "./full-map"
import { GraphToolbarViewControls } from "@opencode/session-graph"
import { useI18n } from "@opencode/ui/context/i18n"

export function MapSurface(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  onSplitView?: () => void
}) {
  const i18n = useI18n()

  return (
    <div class="relative size-full min-h-0" data-slot="spacegraph-surface-map">
      <FullMap
        model={props.model}
        session={props.session}
        screen={props.screen}
        onSplitView={props.onSplitView}
      />
      <GraphToolbarViewControls
        i18n={i18n}
        onExport={(format, model) => props.model.export(props.session, format)}
        renderModel={props.model.graph(props.session)()}
        onCopyPermalink={() => props.model.copyPermalink(props.session)}
      />
    </div>
  )
}
