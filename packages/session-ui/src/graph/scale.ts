import type { GraphViewData } from "./model"

/**
 * How many turns the map draws at once. A long session is drawn as its recent tail: the map is a
 * view of the activity, not a transcript, and a renderer cannot carry the nodes of a thousand turns
 * (T6.6). The window is declared, not silent — the view says how much of the session it shows.
 */
export const TURN_WINDOW = 60

export type ScaleWindow = {
  /** The turn ids the map draws. */
  turns: Set<string>
  /** How many turns the session has. */
  total: number
  /** How many turns the window leaves out. */
  hidden: number
}

/**
 * The turns the map draws: the recent tail of the session, plus any turn the reader is looking at
 * (the selection, or a linked node). A session that fits the window is drawn whole.
 */
export function scaleWindow(model: GraphViewData, keep: readonly string[] = []): ScaleWindow {
  const total = model.turns.length

  if (total <= TURN_WINDOW) return { turns: new Set(model.turns), total, hidden: 0 }

  const turns = new Set(model.turns.slice(-TURN_WINDOW))

  for (const id of keep) if (model.turns.includes(id)) turns.add(id)

  return { turns, total, hidden: total - turns.size }
}

/**
 * The model restricted to the window's turns. The layout still measures the whole session, so the
 * position of a node that stays in the window does not move when the window slides; only the nodes
 * the map draws change.
 */
export function scopeToTurns(model: GraphViewData, turns: ReadonlySet<string>): GraphViewData {
  if (turns.size >= model.turns.length) return model

  const nodes = model.nodes.filter((node) => !node.turnID || turns.has(node.turnID))
  const ids = new Set(nodes.map((node) => node.id))
  const edges = model.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target))

  return {
    ...model,
    nodes,
    edges,
    turns: model.turns.filter((turn) => turns.has(turn)),
  }
}
