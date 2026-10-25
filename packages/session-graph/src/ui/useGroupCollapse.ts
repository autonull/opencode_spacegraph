import { createSignal, createMemo } from "solid-js"
import { type GraphViewData } from "@opencode/session-ui/graph"

export type UseGroupCollapseOptions = {
  model: () => GraphViewData
  selection: () => readonly string[]
  nodeByID: (id: string) => { id: string; clusterOf?: string[] } | undefined
}

export type UseGroupCollapseReturn = {
  collapsedGroups: () => ReadonlySet<string>
  selectedGroup: () => { id: string; clusterOf?: string[] } | undefined
  toggleGroupByID: (id: string) => void
  toggleGroup: () => void
  collapseOtherGroups: () => void
}

export function useGroupCollapse(options: UseGroupCollapseOptions): UseGroupCollapseReturn {
  const [collapsedGroups, setCollapsedGroups] = createSignal<ReadonlySet<string>>(new Set())

  const selectedGroup = createMemo(() => {
    const id = options.selection()[0]
    if (!id) return undefined
    const node = options.model().nodes.find((item) => item.id === id)
    return node && (node.clusterOf?.length ?? 0) > 0 ? node : undefined
  })

  const toggleGroupByID = (id: string) =>
    setCollapsedGroups((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleGroup = () => {
    const group = selectedGroup()
    if (!group) return
    toggleGroupByID(group.id)
  }

  const collapseOtherGroups = () => {
    const group = selectedGroup()
    if (!group) return
    setCollapsedGroups(
      new Set(
        options
          .model()
          .nodes.filter((node) => node.id !== group.id && (node.clusterOf?.length ?? 0) > 0)
          .map((node) => node.id),
      ),
    )
  }

  return {
    collapsedGroups,
    selectedGroup,
    toggleGroupByID,
    toggleGroup,
    collapseOtherGroups,
  }
}