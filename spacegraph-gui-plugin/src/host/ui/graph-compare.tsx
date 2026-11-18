import { For, Show } from "solid-js"
import type { GraphViewData, TurnStats } from "../../model"
import type { ComparisonChanges } from "./comparison"

export type GraphCompareLabels = {
  added: string
  removed: string
  changed: string
  empty: string
  turnStats: string
  turn: string
  files: string
  tools: string
  errors: string
  retries: string
  duration: string
  turnNumber: (num: number) => string
}

/** The comparison window: three sets of named nodes plus the per-turn stats table. */
export function GraphCompare(props: {
  model: GraphViewData
  changes: Pick<ComparisonChanges, "added" | "removed" | "changed" | "turnStats">
  labels: GraphCompareLabels
}) {
  const sections = () => [
    { key: "added", label: props.labels.added, ids: props.changes.added },
    { key: "removed", label: props.labels.removed, ids: props.changes.removed },
    { key: "changed", label: props.labels.changed, ids: props.changes.changed },
  ]
  const label = (id: string) => props.model.nodes.find((node) => node.id === id)?.label ?? id
  const empty = () => props.changes.added.size + props.changes.removed.size + props.changes.changed.size === 0
  const stats = () => props.changes.turnStats ?? []

  return (
    <div class="sg-compare" data-slot="graph-compare-window">
      <Show when={!empty()} fallback={<p class="sg-compare__empty">{props.labels.empty}</p>}>
        <For each={sections()}>
          {(section) => (
            <Show when={section.ids.size > 0}>
              <div class="sg-compare__section" data-slot="graph-compare-section" data-diff={section.key}>
                <div class="sg-compare__section-label">{section.label} <span>{section.ids.size}</span></div>
                <ul>
                  <For each={[...section.ids]}>{(id) => <li title={label(id)}>{label(id)}</li>}</For>
                </ul>
              </div>
            </Show>
          )}
        </For>
      </Show>

      <Show when={stats().length > 0}>
        <div class="sg-compare__stats">
          <div class="sg-compare__section-label">{props.labels.turnStats}</div>
          <table>
            <thead>
              <tr>
                <th>{props.labels.turn}</th>
                <th>{props.labels.files}</th>
                <th>{props.labels.tools}</th>
                <th>{props.labels.errors}</th>
                <th>{props.labels.retries}</th>
                <th>{props.labels.duration}</th>
              </tr>
            </thead>
            <tbody>
              <For each={stats()}>
                {(stat: TurnStats) => (
                  <tr>
                    <td>{props.labels.turnNumber(stat.turnNumber)}</td>
                    <td>{stat.filesTouched}</td>
                    <td>{stat.toolsRun}</td>
                    <td>{stat.errors}</td>
                    <td>{stat.retries}</td>
                    <td>{Math.round(stat.durationMs / 1000)}s</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  )
}
