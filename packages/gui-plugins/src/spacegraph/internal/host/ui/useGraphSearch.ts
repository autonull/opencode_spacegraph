import { type Accessor } from "solid-js"
import { type DetailMode, type GraphNode, type GraphViewData } from "@opencode/session-ui/graph"
import { minLevelOf, LEVEL_RANK } from "@opencode/session-ui/graph"
import { Metrics } from "@opencode/session-ui/graph"
import type { GraphViewportTrackerReturn } from "./useGraphViewport"
import type { UseGraphSelectionReturn } from "./useGraphSelection"

export interface UseGraphSearchInput {
  searchOpen: Accessor<boolean>
  setSearchOpen: (open: boolean) => void
  searchInitial: Accessor<string | undefined>
  setSearchInitial: (initial: string) => void
  model: Accessor<GraphViewData>
  selectedNode: Accessor<GraphNode | undefined>
  selection: UseGraphSelectionReturn["selection"]
  select: UseGraphSelectionReturn["select"]
  effectiveDetailMode: Accessor<DetailMode>
  inspectorSheetOpen: Accessor<boolean>
  setInspectorSheetOpen: (open: boolean) => void
  level: Accessor<"detail" | "execution" | "overview">
  setLevel: (level: "detail" | "execution" | "overview" | ((prev: "detail" | "execution" | "overview") => "detail" | "execution" | "overview")) => void
  viewportTracker: GraphViewportTrackerReturn
  openInTranscript: (id: string) => void
  i18n: ReturnType<typeof import("@opencode/ui/context/i18n").useI18n>
}

export interface UseGraphSearchReturn {
  openSearch: (initial?: string) => void
  toggleSearch: () => void
  jumpTo: (node: GraphNode) => void
}

export function useGraphSearch(input: UseGraphSearchInput): UseGraphSearchReturn {
  const {
    searchOpen,
    setSearchOpen,
    setSearchInitial,
    level,
    setLevel,
    viewportTracker,
    select,
  } = input

  // T2.3: the search is an interaction, so it is counted once per opening.
  const openSearch = (initial = "") => {
    if (searchOpen()) return
    Metrics.count("search")
    setSearchInitial(initial)
    setSearchOpen(true)
  }

  const toggleSearch = () => {
    if (searchOpen()) {
      setSearchOpen(false)
      return
    }
    openSearch()
  }

  const jumpTo = (node: GraphNode) => {
    const minimum = minLevelOf(node)
    if (LEVEL_RANK[minimum] > LEVEL_RANK[level()]) setLevel(minimum)
    select(node.id)
    viewportTracker.camera.focus(node.id)
  }

  return {
    openSearch,
    toggleSearch,
    jumpTo,
  }
}