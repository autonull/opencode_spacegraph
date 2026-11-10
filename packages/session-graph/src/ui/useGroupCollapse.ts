import { createSignal, createMemo, createEffect, onCleanup } from "solid-js"
import { type GraphViewData } from "@opencode/session-ui/graph"
import { useNodeLookup, type NodeLookup } from "./useNodeLookup"

/** Band identifier from the renderer's ZoomBandsPlugin. */
export type GraphBand = "overview" | "execution" | "detail"

export type UseGroupCollapseOptions = {
  model: () => GraphViewData
  selection: () => readonly string[]
  nodeLookup?: NodeLookup
  /** Current zoom band from the renderer (overview | execution | detail). */
  band?: () => GraphBand | undefined
  /** Whether a descendant of a group is currently selected. */
  descendantSelected?: () => boolean
  /** Whether a drag operation is in progress on a group descendant. */
  draggingDescendant?: () => boolean
  /** Unique instance ID for isolating pointer state across multiple graphs. */
  instanceId?: string
  // Controlled group collapse state (Phase 17.2 shared state)
  explicitlyCollapsedGroups?: () => ReadonlySet<string>
  onExplicitlyCollapsedGroupsChange?: (groups: ReadonlySet<string>) => void
}

export type UseGroupCollapseReturn = {
  /** Groups that are collapsed (explicit user action OR ambient band-driven fold). */
  collapsedGroups: () => ReadonlySet<string>
  /** Groups that are explicitly collapsed by the user (excludes ambient folds). */
  explicitlyCollapsedGroups: () => ReadonlySet<string>
  /** Groups that are folded due to the current band (ambient, not explicit). */
  ambientFoldedGroups: () => ReadonlySet<string>
  selectedGroup: () => { id: string; clusterOf?: string[] } | undefined
  /** Toggle explicit collapse state for a group. */
  toggleGroupByID: (id: string) => void
  /** Toggle explicit collapse state for the selected group. */
  toggleGroup: () => void
  /** Collapse all other groups explicitly. */
  collapseOtherGroups: () => void
  /** Called when pointer goes down on a group or its descendant. */
  onPointerDown: () => void
  /** Called when pointer goes up. */
  onPointerUp: () => void
}

const DWELL_MS = 150

export function useGroupCollapse(options: UseGroupCollapseOptions): UseGroupCollapseReturn {
  const nodeLookup = options.nodeLookup ?? useNodeLookup(options.model)
  const [localExplicitlyCollapsed, setLocalExplicitlyCollapsed] = createSignal<ReadonlySet<string>>(new Set())
  const [ambientFolded, setAmbientFolded] = createSignal<ReadonlySet<string>>(new Set())
  const [pointerDownOnGroup, setPointerDownOnGroup] = createSignal(false)
  let dwellTimer: ReturnType<typeof setTimeout> | null = null

  onCleanup(() => {
    if (dwellTimer) clearTimeout(dwellTimer)
  })

  // Internal setter that resolves functional updates before calling the callback
  const setExplicitlyCollapsedInternal = (updater: ReadonlySet<string> | ((prev: ReadonlySet<string>) => ReadonlySet<string>)) => {
    const newGroups = typeof updater === "function" ? updater(localExplicitlyCollapsed()) : updater
    setLocalExplicitlyCollapsed(newGroups)
    options.onExplicitlyCollapsedGroupsChange?.(newGroups)
  }

  // Use controlled explicitlyCollapsedGroups when provided, otherwise local state
  const explicitlyCollapsed = options.explicitlyCollapsedGroups ?? localExplicitlyCollapsed
  const setExplicitlyCollapsed = setExplicitlyCollapsedInternal

  const selectedGroup = createMemo(() => {
    const id = options.selection()[0]
    if (!id) return undefined
    const node = nodeLookup()(id)
    return node && (node.clusterOf?.length ?? 0) > 0 ? node : undefined
  })

  // Compute ambient folded groups based on band
  const computeAmbientFolded = createMemo(() => {
    const band = options.band?.()
    if (!band) return new Set<string>()

    // At overview band, all groups are ambient-folded
    if (band === "overview") {
      const model = options.model()
      const groups = new Set<string>()
      for (const node of model.nodes) {
        if (node.clusterOf && node.clusterOf.length > 0) {
          groups.add(node.id)
        }
      }
      return groups
    }

    // At execution/detail, no ambient folding (groups are expanded by default)
    return new Set<string>()
  })

  // Update ambient folded state with dwell to prevent flapping
  createEffect(() => {
    const nextAmbient = computeAmbientFolded()
    if (dwellTimer) clearTimeout(dwellTimer)
    dwellTimer = setTimeout(() => {
      setAmbientFolded(nextAmbient)
      dwellTimer = null
    }, DWELL_MS)
  })

  // Combined collapsed groups: explicit OR ambient, but never fold if pointer down / descendant selected / dragging
  const collapsedGroups = createMemo(() => {
    const explicit = explicitlyCollapsed()
    const ambient = ambientFolded()
    const descendantSel = options.descendantSelected?.() ?? false
    const dragging = options.draggingDescendant?.() ?? false

    // Never fold while pointer is down on a group, a descendant is selected, or dragging
    if (pointerDownOnGroup() || descendantSel || dragging) {
      return explicit // Only explicit collapse respected during interaction
    }

    // Union of explicit and ambient
    const combined = new Set<string>(explicit)
    for (const id of ambient) combined.add(id)
    return combined
  })

  const toggleGroupByID = (id: string) =>
    setExplicitlyCollapsed((previous) => {
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
    setExplicitlyCollapsed(
      new Set(
        options
          .model()
          .nodes.filter((node) => node.id !== group.id && (node.clusterOf?.length ?? 0) > 0)
          .map((node) => node.id),
      ),
    )
  }

  const onPointerDown = () => {
    setPointerDownOnGroup(true)
  }

  const onPointerUp = () => {
    setPointerDownOnGroup(false)
  }

  return {
    collapsedGroups,
    explicitlyCollapsedGroups: explicitlyCollapsed,
    ambientFoldedGroups: ambientFolded,
    selectedGroup,
    toggleGroupByID,
    toggleGroup,
    collapseOtherGroups,
    onPointerDown,
    onPointerUp,
  }
}