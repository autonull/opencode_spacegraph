import { useI18n } from "@opencode/ui/context/i18n"
import { createSignal } from "solid-js"
import { breadcrumbs, type GraphViewData } from "@opencode/session-ui/graph"
import { createGraphSelection } from "./graph-selection"

export type UseGraphSelectionOptions = {
  model: () => GraphViewData
  controlled: () => string | undefined
  onSelect: (id: string | undefined) => void
  onAnnounce: (message: string) => void
}

export type UseGraphSelectionReturn = {
  selection: ReturnType<typeof createGraphSelection>
  keptIds: () => ReadonlySet<string> | null
  setKeptIds: (ids: ReadonlySet<string> | null) => void
  keepOnlySelection: () => void
  clearSelection: () => void
  copySelectedPaths: () => void
  frameSelection: () => void
  exportSelection: (ordered: { nodes: { id: string }[]; edges: { source: string; target: string }[] }) => void
}

export function useGraphSelection(options: UseGraphSelectionOptions): UseGraphSelectionReturn {
  const i18n = useI18n()
  const [keptIds, setKeptIds] = createSignal<ReadonlySet<string> | null>(null)

  const selection = createGraphSelection({
    model: options.model,
    controlled: options.controlled,
    onSelect: options.onSelect,
    onChange: () => {},
    count: () => {},
  })

  const keepOnlySelection = () => {
    const ids = selection.selection()
    if (ids.length === 0) return
    setKeptIds(new Set(ids))
    options.onAnnounce(i18n.plural("ui.sessionGraph.status.kept", ids.length))
  }

  const copySelectedPaths = () => {
    const ids = selection.selection()
    const text = ids
      .map((id) => breadcrumbs(options.model(), id).map((node) => node.label).join(" › "))
      .filter((line) => line.length > 0)
      .join("\n")
    if (!text) return
    navigator.clipboard?.writeText(text)
    options.onAnnounce(i18n.plural("ui.sessionGraph.status.copied", ids.length))
  }

  const clearSelection = () => {
    setKeptIds(null)
    selection.select(undefined)
  }

  const frameSelection = () => {
    const ids = selection.selection()
    if (ids.length === 0) return
  }

  const exportSelection = (ordered: { nodes: { id: string }[]; edges: { source: string; target: string }[] }) => {
    const ids = new Set(selection.selection())
    if (ids.size === 0) return
  }

  return {
    selection,
    keptIds,
    setKeptIds,
    keepOnlySelection,
    clearSelection,
    copySelectedPaths,
    frameSelection,
    exportSelection,
  }
}