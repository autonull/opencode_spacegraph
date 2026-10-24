import type { GraphViewData } from "./model"
import { scopeModel } from "./view"
import { DOMAINS, type Domain } from "./vocabulary"

export type ProfileID = "all" | "session" | "code" | "review"

export type ProfilePreset = {
  id: ProfileID
  labelKey: string
  domains: readonly Domain[]
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
] as const satisfies readonly ProfilePreset[]

export const applyProfile = (model: GraphViewData, profile: ProfilePreset): GraphViewData =>
  scopeModel(model, new Set(profile.domains))
