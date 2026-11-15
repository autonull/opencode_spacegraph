import { createMemo } from "solid-js"
import { incoming, outgoing, type GraphViewData } from "@opencode/session-ui/graph"
import type { FocusOverlay } from "./cardTemplate"

/**
 * Computes a graded focus overlay mapping each node to its BFS distance
 * from the nearest selected node. Used for D1 neighborhood highlighting.
 *
 * Distance mapping:
 * - 0 (selected): not dimmed (handled by selected check in emphasis)
 * - 1: 0.85 opacity
 * - 2: 0.6 opacity
 * - 3: 0.35 opacity
 * - >3: 0.15 opacity
 */
export type FocusOverlayOptions = {
  model: () => GraphViewData
  selection: () => readonly string[]
  /** Optional node ID being streamed (D2: temporarily highlight around new node) */
  streamingNode?: () => string | undefined
  maxDistance?: number
}

export function createFocusOverlay(options: FocusOverlayOptions): () => FocusOverlay {
  const { model, selection, streamingNode, maxDistance = 3 } = options
  return createMemo<FocusOverlay>(() => {
    const selectedIds = selection()
    const streamingId = streamingNode?.()
    const sourceIds = [...selectedIds]
    if (streamingId) sourceIds.push(streamingId)

    if (sourceIds.length === 0) return new Map()

    const graph = model()
    const distance = new Map<string, number>()
    const queue: Array<{ id: string; dist: number }> = []

    // Initialize queue with selected/streaming nodes at distance 0
    for (const id of sourceIds) {
      distance.set(id, 0)
      queue.push({ id, dist: 0 })
    }

    // BFS from all source nodes simultaneously
    // This gives minimum distance to any source node
    const visited = new Set<string>(sourceIds)

    while (queue.length > 0) {
      const { id, dist } = queue.shift()!
      if (dist >= maxDistance) continue

      const nextDist = dist + 1

      // Traverse incoming edges
      for (const edge of incoming(graph, id)) {
        if (!visited.has(edge.source)) {
          visited.add(edge.source)
          distance.set(edge.source, nextDist)
          queue.push({ id: edge.source, dist: nextDist })
        }
      }

      // Traverse outgoing edges
      for (const edge of outgoing(graph, id)) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target)
          distance.set(edge.target, nextDist)
          queue.push({ id: edge.target, dist: nextDist })
        }
      }
    }

    return distance
  })
}