import { useI18n } from "@opencode/ui/context/i18n"
import type { GraphViewData } from "@opencode/session-ui/graph"
import { For, Show } from "solid-js"

export type GraphCompareChanges = {
  added: ReadonlySet<string>
  removed: ReadonlySet<string>
  changed: ReadonlySet<string>
}

/**
 * Compare-as-window: the same three counts the status chip shows, with the nodes named. The window is
 * screen space and the manager stays content-free; this component owns only the comparison's words.
 */
export const GraphCompare = (props: { model: GraphViewData; changes: GraphCompareChanges }) => {
  const i18n = useI18n()
  const sections = () => [
    { key: "added", label: i18n.t("ui.sessionGraph.compare.added"), ids: props.changes.added },
    { key: "removed", label: i18n.t("ui.sessionGraph.compare.removed"), ids: props.changes.removed },
    { key: "changed", label: i18n.t("ui.sessionGraph.compare.changed"), ids: props.changes.changed },
  ]
  const label = (id: string) => props.model.nodes.find((node) => node.id === id)?.label ?? id
  const empty = () => props.changes.added.size + props.changes.removed.size + props.changes.changed.size === 0

  return (
    <div data-slot="graph-compare-window" class="p-3">
      <Show
        when={!empty()}
        fallback={<div class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.compare.empty")}</div>}
      >
        <For each={sections()}>
          {(section) => (
            <Show when={section.ids.size > 0}>
              <div class="mt-2 first:mt-0" data-slot="graph-compare-section" data-diff={section.key}>
                <div class="text-12-medium text-text-strong">
                  {section.label} <span class="tabular-nums text-text-weak">{section.ids.size}</span>
                </div>
                <ul class="mt-1 flex flex-col gap-0.5">
                  <For each={[...section.ids]}>
                    {(id) => (
                      <li class="truncate text-12-regular text-text-base" title={label(id)}>
                        {label(id)}
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </Show>
          )}
        </For>
      </Show>
    </div>
  )
}
