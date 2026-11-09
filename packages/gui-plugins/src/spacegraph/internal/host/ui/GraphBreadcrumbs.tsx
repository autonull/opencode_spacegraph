import { useI18n } from "@opencode/ui/context/i18n"
import { For, Show } from "solid-js"

export type GraphBreadcrumb = { id: string; label: string }

export type GraphBreadcrumbsProps = {
  crumbs: readonly GraphBreadcrumb[]
  onSelect: (id: string) => void
}

/**
 * Session → turn → phase → node path (U3.11), supplied by the host from the library `Trail`. Nothing
 * here depends on a renderer, so the breadcrumb line is identical in both.
 */
export const GraphBreadcrumbs = (props: GraphBreadcrumbsProps) => {
  const i18n = useI18n()

  return (
    <Show when={props.crumbs.length > 0}>
      <nav
        data-component="session-graph-breadcrumbs"
        data-slot="graph-breadcrumbs"
        aria-label={i18n.t("ui.sessionGraph.breadcrumbs.label")}
        class="flex items-center gap-1 overflow-x-auto border-b border-border-weaker-base px-3 py-1 no-scrollbar"
      >
        <For each={props.crumbs}>
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
                aria-current={index() === props.crumbs.length - 1 ? "location" : undefined}
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
