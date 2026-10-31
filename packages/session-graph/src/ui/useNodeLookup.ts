import { createMemo } from "solid-js"
import { nodeByID, type GraphViewData, type GraphNode } from "@opencode/session-ui/graph"
import type { Accessor } from "solid-js"

/**
 * A hook that provides a memoized node lookup function for the current model.
 * Eliminates the duplicated `(id) => nodeByID(model(), id)` pattern across hooks and components.
 */
export function useNodeLookup(model: () => GraphViewData): Accessor<(id: string) => GraphNode | undefined> {
  return createMemo(() => {
    const currentModel = model()
    return (id: string) => nodeByID(currentModel, id)
  })
}

/**
 * Type for the node lookup accessor returned by `useNodeLookup`.
 */
export type NodeLookup = Accessor<(id: string) => GraphNode | undefined>