import { Show } from "solid-js"

export type StatusBarLabels = {
  selected: string
  frame: string
  keepOnly: string
  copyPaths: string
  exportSubset: string
  addNote: string
  compare: string
  clearCompare: string
  collapseGroup: string
  expandGroup: string
  collapseOthers: string
  pin: string
  unpin: string
  clear: string
}

export type GraphStatusBarProps = {
  count: number
  labels: StatusBarLabels
  onFrame: () => void
  onKeepOnly: () => void
  onCopyPaths: () => void
  onExportSubset: () => void
  onClear: () => void
  onAddNote?: () => void
  compare?: { active: boolean; onCompare: () => void; onClear: () => void }
  group?: { collapsed: boolean; onToggle: () => void; onCollapseOthers: () => void }
  pinned?: boolean
  onTogglePin?: () => void
}

/** The selection is a set, not a click: every verb is pure over the selected ids. */
export function GraphStatusBar(props: GraphStatusBarProps) {
  return (
    <Show when={props.count > 0}>
      <div class="sg-status-bar" data-component="session-graph-status-bar" data-slot="graph-status-bar" data-selection-count={props.count}>
        <span data-slot="graph-status-count">{props.labels.selected.replace("{count}", String(props.count))}</span>
        <div class="sg-status-bar__verbs">
          <button type="button" data-slot="graph-status-frame" onClick={() => props.onFrame()}>{props.labels.frame}</button>
          <button type="button" data-slot="graph-status-keep-only" onClick={() => props.onKeepOnly()}>{props.labels.keepOnly}</button>
          <button type="button" data-slot="graph-status-copy-paths" onClick={() => props.onCopyPaths()}>{props.labels.copyPaths}</button>
          <button type="button" data-slot="graph-status-export" onClick={() => props.onExportSubset()}>{props.labels.exportSubset}</button>
          <Show when={props.onAddNote}>
            <button type="button" data-slot="graph-status-add-note" onClick={() => props.onAddNote?.()}>{props.labels.addNote}</button>
          </Show>
          <Show when={props.compare}>
            {(compare) => (
              <button
                type="button"
                data-slot="graph-status-compare"
                data-active={compare().active}
                onClick={() => (compare().active ? compare().onClear() : compare().onCompare())}
              >
                {compare().active ? props.labels.clearCompare : props.labels.compare}
              </button>
            )}
          </Show>
          <Show when={props.group}>
            {(group) => (
              <>
                <button type="button" data-slot="graph-status-group-toggle" data-collapsed={group().collapsed} onClick={() => group().onToggle()}>
                  {group().collapsed ? props.labels.expandGroup : props.labels.collapseGroup}
                </button>
                <button type="button" data-slot="graph-status-group-others" onClick={() => group().onCollapseOthers()}>
                  {props.labels.collapseOthers}
                </button>
              </>
            )}
          </Show>
          <Show when={props.onTogglePin}>
            <button type="button" data-slot="graph-status-pin" aria-pressed={props.pinned} onClick={() => props.onTogglePin?.()}>
              {props.pinned ? props.labels.unpin : props.labels.pin}
            </button>
          </Show>
        </div>
        <button type="button" class="sg-status-bar__clear" data-slot="graph-status-clear" aria-label={props.labels.clear} onClick={() => props.onClear()}>
          ×
        </button>
      </div>
    </Show>
  )
}
