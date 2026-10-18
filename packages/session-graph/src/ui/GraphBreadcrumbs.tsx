import type { GraphModel } from "@opencode/session-ui/graph"
import { breadcrumbs } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { For, Show } from "solid-js"

export type GraphBreadcrumbsProps = {
  model: GraphModel
  selected?: string
  onSelect: (id: string) => void
}

/**
 * Session → turn → phase → node trail (U3.11). It reads the model's `part-of` ancestry; nothing here
 * depends on a renderer, so the breadcrumb line is identical in both.
 */
export const GraphBreadcrumbs = (props: GraphBreadcrumbsProps) => {
  const i18n = useI18n()
  const trail = () => (props.selected ? breadcrumbs(props.model, props.selected) : [])

  return (
    <Show when={trail().length > 0}>
      <nav
        data-component="session-graph-breadcrumbs"
        data-slot="graph-breadcrumbs"
        aria-label={i18n.t("ui.sessionGraph.breadcrumbs.label")}
        class="flex items-center gap-1 overflow-x-auto border-b border-border-weaker-base px-3 py-1 no-scrollbar"
      >
        <For each={trail()}>
          {(node, index) => (
            <>
              <Show when={index() > 0}>
                <span class="text-12-regular text-text-weaker" aria-hidden="true">
                  /
                </span>
              </Show>
              <button
                type="button"
                class="shrink-0 rounded-sm px-1 text-12-regular text-text-weak hover:text-text-strong"
                aria-current={index() === trail().length - 1 ? "location" : undefined}
                onClick={() => props.onSelect(node.id)}
              >
                <span class="truncate">{node.label}</span>
              </button>
            </>
          )}
        </For>
      </nav>
    </Show>
  )
}
