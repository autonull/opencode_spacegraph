import { createSignal, createMemo } from "solid-js"
import { type GraphViewData, type GraphNode } from "@opencode/session-ui/graph"

export type UseGroupCollapseOptions = {
  model: () => GraphViewData
  selection: () => readonly string[]
  nodeLookup: (id: string) => GraphNode | undefined
  explicitlyCollapsedGroups?: () => ReadonlySet<string>
  onExplicitlyCollapsedGroupsChange?: (groups: ReadonlySet<string>) => void
  instanceId?: string
  descendantSelected?: () => boolean
  draggingDescendant?: () => boolean
}

export type UseGroupCollapseReturn = {
  collapsedGroups: () => ReadonlySet<string>
  explicitlyCollapsedGroups: () => ReadonlySet<string>
  selectedGroup: () => { id: string; clusterOf?: string[] } | undefined
  toggleGroupByID: (id: string) => void
  toggleGroup: () => void
  collapseOtherGroups: () => void
  expandAllInCluster: () => void
}

export function useGroupCollapse(options: UseGroupCollapseOptions): UseGroupCollapseReturn {
  const [localCollapsedGroups, setLocalCollapsedGroups] = createSignal<ReadonlySet<string>>(new Set())

  const explicitlyCollapsedGroups = createMemo(() => 
    options.explicitlyCollapsedGroups?.() ?? localCollapsedGroups()
  )

  const selectedGroup = createMemo(() => {
    const id = options.selection()[0]
    if (!id) return undefined
    const node = options.nodeLookup(id)
    return node && (node.clusterOf?.length ?? 0) > 0 ? node : undefined
  })

  // Keep a controlled host in step with every mutation. Without this, a host that reads the
  // controlled set (the status-bar group toggle) never sees a collapse made through this hook.
  const commit = (next: ReadonlySet<string>) => {
    setLocalCollapsedGroups(next)
    options.onExplicitlyCollapsedGroupsChange?.(next)
  }

  const toggleGroupByID = (id: string) => {
    const previous = explicitlyCollapsedGroups()
    const next = new Set(previous)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    commit(next)
  }

  const toggleGroup = () => {
    const group = selectedGroup()
    if (!group) return
    toggleGroupByID(group.id)
  }

  const collapseOtherGroups = () => {
    const group = selectedGroup()
    if (!group) return
    commit(
      new Set(
        options
          .model()
          .nodes.filter((node) => node.id !== group.id && (node.clusterOf?.length ?? 0) > 0)
          .map((node) => node.id),
      ),
    )
  }

  const expandAllInCluster = () => {
    const group = selectedGroup()
    if (!group) return
    const next = new Set(explicitlyCollapsedGroups())
    next.delete(group.id)
    commit(next)
  }

  return {
    collapsedGroups: explicitlyCollapsedGroups,
    explicitlyCollapsedGroups,
    selectedGroup,
    toggleGroupByID,
    toggleGroup,
    collapseOtherGroups,
    expandAllInCluster,
  }
}