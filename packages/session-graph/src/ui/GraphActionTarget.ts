/** T31 — an action target from the graph. Used by onActionNavigate and onActionReveal. */
export type GraphActionTarget = {
  node?: string
  file?: string
  range?: { startLine: number; endLine: number }
  url?: string
  text?: string
}