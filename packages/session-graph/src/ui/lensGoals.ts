/** P0.2: Goal-based lens picker — maps developer goals to lens IDs and surface configs.
 *  Shared, no OpenCode imports. Toolbar renders chips; settings shows advanced lens table. */
export type BuiltinLensId =
  | "reader"
  | "navigator"
  | "cartographer"
  | "investigator"
  | "orchestrator"
  | "reviewer"
  | "archivist"
  | "composer"
  | "auditor"

export interface LensGoal {
  /** Display label for the goal chip. */
  label: string
  /** i18n key for the label (for translation). */
  i18nKey: string
  /** Short description shown in settings advanced table. */
  description: string
  /** i18n key for the description. */
  descriptionI18nKey: string
  /** The built-in lens ID to apply. */
  lensId: BuiltinLensId
  /** Optional surface override (e.g., "hybrid" for reviewer). */
  surface?: "transcript" | "map" | "hybrid"
  /** Optional additional config hints for the settings table. */
  hints?: string[]
  /** Whether this goal is gated behind a feature flag. */
  flag?: string
}

/** Ordered list of goals for the toolbar chip row. */
export const LENS_GOALS: readonly LensGoal[] = [
  {
    label: "Find failure cause",
    i18nKey: "lensGoal.findFailure",
    description: "Why traces, failure chains, breadcrumbs to root cause",
    descriptionI18nKey: "lensGoal.findFailureDesc",
    lensId: "investigator",
    hints: ["why trace", "failure chain", "breadcrumbs"],
  },
  {
    label: "Audit whole session",
    i18nKey: "lensGoal.auditSession",
    description: "Whole-session shape with matrix layout, cost and provenance",
    descriptionI18nKey: "lensGoal.auditSessionDesc",
    lensId: "auditor",
    surface: "map",
    hints: ["matrix layout", "cost", "provenance", "export"],
    flag: "graph_cost_lens",
  },
  {
    label: "Read a turn inline",
    i18nKey: "lensGoal.readInline",
    description: "Transcript-first with hover/focus affordances only",
    descriptionI18nKey: "lensGoal.readInlineDesc",
    lensId: "reader",
    surface: "transcript",
    hints: ["transcript", "hover focus", "no graph"],
  },
  {
    label: "Verify a fix",
    i18nKey: "lensGoal.verifyFix",
    description: "Hybrid view with files rail, related trace, verification",
    descriptionI18nKey: "lensGoal.verifyFixDesc",
    lensId: "reviewer",
    surface: "hybrid",
    hints: ["files rail", "related trace", "compare"],
  },
  {
    label: "Know the cost",
    i18nKey: "lensGoal.knowCost",
    description: "Cost lens with token budgets and provenance (flag-gated)",
    descriptionI18nKey: "lensGoal.knowCostDesc",
    lensId: "auditor",
    surface: "map",
    hints: ["token budget", "provenance", "cost breakdown"],
    flag: "graph_cost_lens",
  },
  {
    label: "Conduct live",
    i18nKey: "lensGoal.conductLive",
    description: "Node widgets, prompt injection, follow mode for live sessions",
    descriptionI18nKey: "lensGoal.conductLiveDesc",
    lensId: "composer",
    surface: "hybrid",
    hints: ["node widgets", "prompt injection", "follow mode"],
  },
  {
    label: "Explore structure",
    i18nKey: "lensGoal.exploreStructure",
    description: "Whole-session shape, layouts, legend, spatial overview",
    descriptionI18nKey: "lensGoal.exploreStructureDesc",
    lensId: "cartographer",
    surface: "map",
    hints: ["layouts", "legend", "spatial overview"],
  },
  {
    label: "Hand off to teammate",
    i18nKey: "lensGoal.handoff",
    description: "Copy permalink to current selection for sharing",
    descriptionI18nKey: "lensGoal.handoffDesc",
    lensId: "navigator",
    hints: ["permalink", "share selection"],
  },
]

/** Get goal by label. */
export function getGoalByLabel(label: string): LensGoal | undefined {
  return LENS_GOALS.find((g) => g.label === label)
}

/** Get goal by lens ID. */
export function getGoalByLensId(lensId: BuiltinLensId): LensGoal | undefined {
  return LENS_GOALS.find((g) => g.lensId === lensId)
}

/** Get all goals that are not flag-gated (for toolbar). */
export function getVisibleGoals(flags: { enabled: (key: string) => boolean }): readonly LensGoal[] {
  return LENS_GOALS.filter((goal) => !goal.flag || flags.enabled(goal.flag))
}

/** Get all goals (for settings advanced table). */
export function getAllGoals(): readonly LensGoal[] {
  return LENS_GOALS
}