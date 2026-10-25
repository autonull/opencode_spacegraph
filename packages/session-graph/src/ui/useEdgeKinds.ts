import { createSignal, createMemo } from "solid-js"
import { type GraphViewData } from "@opencode/session-ui/graph"

export type EdgeKindEntry = { kind: string; count: number; hidden: boolean }

export type UseEdgeKindsOptions = {
  model: () => GraphViewData
}

export type UseEdgeKindsReturn = {
  hiddenEdgeKinds: () => ReadonlySet<string>
  edgeKinds: () => EdgeKindEntry[]
  toggleEdgeKind: (kind: string) => void
  filterEdges: (edges: readonly { kind: string }[]) => { kind: string }[]
}

export function useEdgeKinds(options: UseEdgeKindsOptions): UseEdgeKindsReturn {
  const [hiddenEdgeKinds, setHiddenEdgeKinds] = createSignal<ReadonlySet<string>>(new Set())

  const edgeKinds = createMemo(() => {
    const counts = new Map<string, number>()
    for (const edge of options.model().edges) counts.set(edge.kind, (counts.get(edge.kind) ?? 0) + 1)
    return [...counts].map(([kind, count]) => ({ kind, count, hidden: hiddenEdgeKinds().has(kind) }))
  })

  const toggleEdgeKind = (kind: string) =>
    setHiddenEdgeKinds((current) => {
      const next = new Set(current)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })

  const filterEdges = (edges: readonly { kind: string }[]) => {
    const hidden = hiddenEdgeKinds()
    return hidden.size === 0 ? [...edges] : edges.filter((edge) => !hidden.has(edge.kind))
  }

  return {
    hiddenEdgeKinds,
    edgeKinds,
    toggleEdgeKind,
    filterEdges,
  }
}