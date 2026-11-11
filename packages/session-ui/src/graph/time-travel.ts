import type { GraphViewData } from "./model"
import { scopeToTurns } from "./scale"

/** The most recent turn checkpoints retained per session. */
export const TIME_TRAVEL_LIMIT = 32

export type TimeTravelSnapshot = {
  /** The zero-based index of the last turn included in `graph`. */
  checkpoint: number
  /** The turn node ID at `checkpoint`, kept for labels and debugging. */
  turnID: string
  graph: GraphViewData
}

/**
 * Append snapshots for turns the buffer has not seen yet, then keep the newest `limit` entries.
 * The first build of a completed session only captures the newest window; older turns fall back to
 * scoping the live model.
 */
export function captureTimeTravel(
  model: GraphViewData,
  previous: readonly TimeTravelSnapshot[] = [],
  limit = TIME_TRAVEL_LIMIT,
): TimeTravelSnapshot[] {
  if (limit <= 0) return []

  if (model.turns.length === 0) return previous.slice(-limit)

  const lastCheckpoint = previous.at(-1)?.checkpoint ?? -1
  const firstNew = Math.max(lastCheckpoint + 1, model.turns.length - limit, 0)
  const snapshots = [...previous]

  for (let checkpoint = firstNew; checkpoint < model.turns.length; checkpoint++) {
    snapshots.push({
      checkpoint,
      turnID: model.turns[checkpoint]!,
      graph: scopedGraph(model, checkpoint),
    })
  }

  return snapshots.slice(-limit)
}

/** The graph parked at `checkpoint`, or a live-scoped fallback when the buffer does not hold it. */
export function graphAtCheckpoint(
  model: GraphViewData,
  snapshots: readonly TimeTravelSnapshot[],
  checkpoint: number,
): GraphViewData {
  if (model.turns.length === 0) return model

  const index = Math.max(0, Math.min(Math.trunc(checkpoint), model.turns.length - 1))
  const snapshot = snapshots.find((entry) => entry.checkpoint === index)

  if (snapshot) return snapshot.graph

  return scopedGraph(model, index)
}

/** Scope to the prefix ending at `checkpoint` and drop an active turn the parked view does not contain. */
function scopedGraph(model: GraphViewData, checkpoint: number): GraphViewData {
  const graph = cloneGraph(scopeToTurns(model, new Set(model.turns.slice(0, checkpoint + 1))))

  if (graph.activeTurn && !graph.turns.includes(graph.activeTurn)) graph.activeTurn = undefined

  return graph
}

/** Detach a view from the mutable builder state so a later update cannot rewrite history. */
function cloneGraph(model: GraphViewData): GraphViewData {
  return {
    ...model,
    nodes: model.nodes.map((node) => ({ ...node, data: node.data ? { ...node.data } : undefined })),
    edges: model.edges.map((edge) => ({ ...edge })),
    turns: [...model.turns],
    turnByMessageID: new Map(model.turnByMessageID),
  }
}
