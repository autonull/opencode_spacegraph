import type { GraphViewData } from "./model"
import { scopeModel } from "./view"
import { DOMAINS, type Domain, type NodeStatus } from "./vocabulary"

export type ProfileID = "all" | "session" | "code" | "review" | "runtime"

export type ProfilePreset = {
  id: ProfileID
  labelKey: string
  domains: readonly Domain[]
  /** A preset may narrow by status as well as domain; absent means every status. */
  statuses?: readonly NodeStatus[]
}

export const PROFILE_PRESETS = [
  { id: "all", labelKey: "ui.sessionGraph.profile.all", domains: DOMAINS },
  { id: "session", labelKey: "ui.sessionGraph.profile.session", domains: ["session"] },
  { id: "code", labelKey: "ui.sessionGraph.profile.code", domains: ["session", "code"] },
  {
    id: "review",
    labelKey: "ui.sessionGraph.profile.review",
    domains: ["session", "directories", "history", "code"],
  },
  {
    id: "runtime",
    labelKey: "ui.sessionGraph.profile.runtime",
    domains: ["session", "runtime", "verification"],
    statuses: ["running", "pending"],
  },
] as const satisfies readonly ProfilePreset[]

export const applyProfile = (model: GraphViewData, profile: ProfilePreset): GraphViewData => {
  const scoped = scopeModel(model, new Set(profile.domains))
  if (!profile.statuses || profile.statuses.length === 0) return scoped
  const statuses = new Set(profile.statuses)
  const kept = new Set(scoped.nodes.filter((node) => statuses.has(node.status)).map((node) => node.id))
  return {
    ...scoped,
    nodes: scoped.nodes.filter((node) => kept.has(node.id)),
    edges: scoped.edges.filter((edge) => kept.has(edge.source) && kept.has(edge.target)),
    turns: scoped.turns.filter((turn) => kept.has(turn)),
    activeTurn: scoped.activeTurn !== undefined && kept.has(scoped.activeTurn) ? scoped.activeTurn : undefined,
  }
}
