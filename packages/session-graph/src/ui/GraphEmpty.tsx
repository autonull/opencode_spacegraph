import { Show } from "solid-js"
import { useI18n } from "@opencode/ui/context/i18n"
import type { GraphViewData } from "@opencode/session-ui/graph"

export type GraphEmptyProps = {
  model: () => GraphViewData
  error: string | undefined
}

export const GraphEmpty = (props: GraphEmptyProps) => {
  const i18n = useI18n()

  return (
    <Show when={!props.error && props.model().nodes.length === 0}>
      <div
        data-slot="graph-empty"
        class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center"
      >
        <span class="text-14-regular text-text-weak">{i18n.t("ui.sessionGraph.canvas.empty")}</span>
        <span class="text-12-regular text-text-weaker">{i18n.t("ui.sessionGraph.canvas.emptyHint")}</span>
      </div>
    </Show>
  )
}