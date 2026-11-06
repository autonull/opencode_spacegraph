import { GraphIconButton } from "./GraphIconButton"
import { useI18n } from "@opencode/ui/context/i18n"

export type GraphZoomControlProps = {
  zoomPercent?: number
  onZoomOut?: () => void
  onZoomIn?: () => void
  zoomOutDisabled?: boolean
  zoomInDisabled?: boolean
  onFit: () => void
}

export const GraphZoomControl = (props: GraphZoomControlProps) => {
  const i18n = useI18n()

  return (
    <div class="flex items-center gap-1">
      <GraphIconButton
        label={i18n.t("ui.sessionGraph.toolbar.zoomOut")}
        icon="expand"
        disabled={props.zoomOutDisabled}
        onClick={() => props.onZoomOut?.()}
      />
      <span
        data-slot="graph-zoom-level"
        class="min-w-9 text-center text-12-regular tabular-nums text-text-weak"
        aria-label={i18n.t("ui.sessionGraph.toolbar.zoomPercent", { percent: String(props.zoomPercent ?? 100) })}
      >
        {props.zoomPercent ?? 100}%
      </span>
      <GraphIconButton
        label={i18n.t("ui.sessionGraph.toolbar.zoomIn")}
        icon="plus"
        disabled={props.zoomInDisabled}
        onClick={() => props.onZoomIn?.()}
      />
    </div>
  )
}