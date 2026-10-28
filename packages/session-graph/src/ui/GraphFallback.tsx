import { useI18n } from "@opencode/ui/context/i18n"
import { Show } from "solid-js"

export type GraphFallbackProps = {
  fallback: boolean
  error: string | undefined
}

export const GraphFallback = (props: GraphFallbackProps) => {
  const i18n = useI18n()

  return (
    <Show when={props.fallback && !props.error}>
      <div
        data-slot="graph-fallback"
        class="border-b border-border-weaker-base bg-surface-base px-2 py-1 text-12-regular text-text-weak"
      >
        {i18n.t("ui.sessionGraph.fallback")}
      </div>
    </Show>
  )
}
