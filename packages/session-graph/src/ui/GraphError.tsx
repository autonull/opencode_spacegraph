import { Show } from "solid-js"
import { useI18n } from "@opencode/ui/context/i18n"

export type GraphErrorProps = {
  error: string | undefined
  onBack: (() => void) | undefined
}

export const GraphError = (props: GraphErrorProps) => {
  const i18n = useI18n()

  return (
    <Show when={props.error}>
      <div
        data-slot="graph-error"
        class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background-base/80 px-6 text-center"
      >
        <span class="text-14-medium text-text-strong">{i18n.t("ui.sessionGraph.canvas.error")}</span>
        <span class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.canvas.errorHint")}</span>
        <Show when={props.onBack}>
          <button
            type="button"
            class="rounded-sm border border-border-base px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
            onClick={props.onBack}
          >
            {i18n.t("ui.sessionGraph.toolbar.back")}
          </button>
        </Show>
      </div>
    </Show>
  )
}