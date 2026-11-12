/**
 * M6.7 — the builders' user-visible copy. The model is shared by hosts with different locales, so
 * every label the builder writes is overridable and the defaults stay English.
 */
export type GraphLabels = {
  session: string
  root: string
  errorChain: string
  subagent: string
  turn: string
  interrupted: string
  compactedContext: string
  compaction: (status: string) => string
  filesChanged: (count: number) => string
}

export const DEFAULT_GRAPH_LABELS: GraphLabels = {
  session: "Session",
  root: "Root",
  errorChain: "Error Chain",
  subagent: "Subagent",
  turn: "Turn",
  interrupted: "Interrupted",
  compactedContext: "Compacted context",
  compaction: (status) => `Compaction ${status}`,
  filesChanged: (count) => `${count} file${count === 1 ? "" : "s"} changed`,
}

/** Fills the labels the host did not name, so an override is additive. */
export function resolveGraphLabels(labels?: Partial<GraphLabels>): GraphLabels {
  return { ...DEFAULT_GRAPH_LABELS, ...labels }
}
