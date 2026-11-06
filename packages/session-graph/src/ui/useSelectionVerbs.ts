import { useI18n } from "@opencode/ui/context/i18n"
import { createSignal } from "solid-js"
import { breadcrumbs, type GraphViewData } from "@opencode/session-ui/graph"

export type UseSelectionVerbsOptions = {
  model: () => GraphViewData
  selection: () => readonly string[]
  onAnnounce: (message: string) => void
}

export type UseSelectionVerbsReturn = {
  keptIds: () => ReadonlySet<string> | null
  setKeptIds: (ids: ReadonlySet<string> | null) => void
  keepOnlySelection: () => void
  clearSelection: () => void
  copySelectedPaths: () => void
}

export function useSelectionVerbs(options: UseSelectionVerbsOptions): UseSelectionVerbsReturn {
  const i18n = useI18n()
  const [keptIds, setKeptIds] = createSignal<ReadonlySet<string> | null>(null)

  const keepOnlySelection = () => {
    const ids = options.selection()
    if (ids.length === 0) return
    setKeptIds(new Set(ids))
    options.onAnnounce(i18n.plural("ui.sessionGraph.status.kept", ids.length))
  }

  const copySelectedPaths = () => {
    const ids = options.selection()
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
    // Selection clearing is handled by the caller
  }

  return {
    keptIds,
    setKeptIds,
    keepOnlySelection,
    clearSelection,
    copySelectedPaths,
  }
}