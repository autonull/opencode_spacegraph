import { useI18n } from "@opencode/ui/context/i18n"
import type { GraphViewData } from "@opencode/session-ui/graph"
import { scaleWindow } from "@opencode/session-ui/graph"

export type GraphScaleNoticeProps = {
  model: () => GraphViewData
  selectedTurn: () => string | undefined
  frameTurn: () => string | undefined
  followLog: boolean
  activeTurn: string | undefined
}

export const GraphScaleNotice = (props: GraphScaleNoticeProps) => {
  const i18n = useI18n()

  const scale = scaleWindow(
    props.model(),
    [props.selectedTurn(), props.frameTurn(), props.followLog ? props.activeTurn : undefined].filter(
      (id): id is string => !!id,
    ),
  )

  if (scale.hidden === 0) return null

  return (
    <div
      data-slot="graph-scale-notice"
      class="flex items-center gap-2 border-b border-border-weaker-base px-3 py-1 text-12-regular text-text-weak"
    >
      <span class="min-w-0 flex-1 truncate">
        {i18n.t("ui.sessionGraph.scale.notice", { shown: scale.turns.size, total: scale.total })}
      </span>
    </div>
  )
}