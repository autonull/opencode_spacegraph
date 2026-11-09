import { useI18n } from "@opencode/ui/context/i18n"
import { GraphIconButton } from "./GraphIconButton"
import { GraphZoomControl } from "./GraphZoomControl"
import { GraphRendererStatus } from "./GraphRendererStatus"

export type GraphToolbarCommandControlsProps = {
  zoomPercent?: number
  onZoomOut?: () => void
  onZoomIn?: () => void
  zoomOutDisabled?: boolean
  zoomInDisabled?: boolean
  onFit: () => void
  onSplitView?: () => void
  onBack?: () => void
  renderer?: string
  compact?: boolean
  endInset?: string
  i18n: ReturnType<typeof import("@opencode/ui/context/i18n")["useI18n"]>
}

export function GraphToolbarCommandControls(props: GraphToolbarCommandControlsProps) {
  const i18n = useI18n()

  return (
    <>
      <GraphZoomControl
        zoomPercent={props.zoomPercent}
        onZoomOut={props.onZoomOut}
        onZoomIn={props.onZoomIn}
        zoomOutDisabled={props.zoomOutDisabled}
        zoomInDisabled={props.zoomInDisabled}
        onFit={props.onFit}
      />

      <GraphIconButton label={i18n.t("ui.sessionGraph.toolbar.fit")} icon="expand" onClick={props.onFit} />

      {props.onSplitView && (
        <GraphRendererStatus
          renderer={props.renderer as any}
          compact={props.compact}
          onSplitView={props.onSplitView}
          onBack={props.onBack}
          endInset={props.endInset}
        />
      )}
    </>
  )
}