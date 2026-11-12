import type { GraphViewData } from "./model"
import { failures, sessionProgress } from "./selectors"

/**
 * What a surface says at a glance about failures, without opening the failure window. It is derived
 * from the nodes the session already carries, so every surface reports the same numbers.
 */
export type AttentionTone = "none" | "warning" | "danger"

export type Attention = {
  tone: AttentionTone
  /** Errors and retries the reader can open. */
  count: number
  errors: number
  retries: number
  /** The most recent failure, in turn order, when the session has one. */
  latest:
    | {
        nodeID: string
        label: string
        summary: string | undefined
        turnID: string
        turnLabel: string
        turnNumber: number
      }
    | undefined
  /** Stable ids for a watcher that must not toast the same failure twice. */
  ids: readonly string[]
}

export function attention(model: GraphViewData): Attention {
  const found = failures(model)
  const progress = sessionProgress(model)
  const last = found[found.length - 1]

  return {
    tone: progress.errors > 0 ? "danger" : progress.retries > 0 ? "warning" : "none",
    count: found.length,
    errors: progress.errors,
    retries: progress.retries,
    latest: last
      ? {
          nodeID: last.node.id,
          label: last.node.label,
          summary: last.node.summary,
          turnID: last.turnID,
          turnLabel: last.turnLabel,
          turnNumber: last.turnNumber,
        }
      : undefined,
    ids: found.map((entry) => entry.node.id),
  }
}
