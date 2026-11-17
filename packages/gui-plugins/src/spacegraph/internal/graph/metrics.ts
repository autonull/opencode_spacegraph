/**
 * T2.3 — a local interaction counter for the usability protocol.
 *
 * The protocol asks whether a task takes "three interactions or fewer", which is a measurement, not
 * an estimate. The counter is off by default, stays in the browser, and never leaves it: no
 * telemetry, no network, no storage. The app turns it on with a `graphMetrics=1` query parameter
 * and the dry run reads the numbers off the readout.
 */

/** The actions a participant can take. They are the graph's own vocabulary, not the protocol's. */
export type GraphAction = "mode-switch" | "search" | "select" | "expand" | "return" | "turn-map" | "fit" | "zoom"

const ACTIONS: readonly GraphAction[] = [
  "mode-switch",
  "search",
  "select",
  "expand",
  "return",
  "turn-map",
  "fit",
  "zoom",
]

export type GraphActionCounts = Record<GraphAction, number>

export type GraphMetrics = {
  /** Whether the counter is counting. It is off until the host turns it on. */
  enabled: () => boolean
  enable: () => void
  disable: () => void
  /** Counts one action; a no-op while the counter is off. */
  count: (action: GraphAction) => void
  counts: () => GraphActionCounts
  /** Every action counted, summed. */
  total: () => number
  /** Zeroes the counters, so the next task starts from a clean number. */
  reset: () => void
  subscribe: (listener: (counts: GraphActionCounts) => void) => () => void
}

const empty = (): GraphActionCounts => {
  // SAFETY: the entries are one per action name, so the record has exactly the action keys.
  const counts = Object.fromEntries(ACTIONS.map((action) => [action, 0])) as GraphActionCounts

  return counts
}

/**
 * The counter itself. It is a module singleton because the graph surface and the host count into
 * the same numbers; the host is the only one that turns it on.
 */
export const Metrics: GraphMetrics = (() => {
  let enabled = false
  let counts = empty()
  const listeners = new Set<(counts: GraphActionCounts) => void>()

  const publish = () => {
    for (const listener of listeners) listener(counts)
  }

  return {
    enabled: () => enabled,
    enable() {
      enabled = true
      publish()
    },
    disable() {
      enabled = false
      publish()
    },
    count(action) {
      if (!enabled) return
      counts = { ...counts, [action]: counts[action] + 1 }

      publish()
    },
    counts: () => counts,
    total: () => ACTIONS.reduce((sum, action) => sum + counts[action], 0),
    reset() {
      counts = empty()

      publish()
    },
    subscribe(listener) {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
  }
})()
