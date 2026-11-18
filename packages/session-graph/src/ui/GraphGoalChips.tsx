import { createMemo } from "solid-js"
import { useI18n } from "@opencode/ui/context/i18n"
import { getVisibleGoals, type LensGoal } from "./lensGoals"

export type GraphGoalChipsProps = {
  /** Current lens ID for highlighting the active goal. */
  currentLens?: string
  /** Callback when a goal chip is clicked. */
  onSelectGoal: (goal: LensGoal) => void
  /** Feature flags to check for flag-gated goals. */
  flags: { enabled: (key: string) => boolean }
  /** Optional: limit number of chips shown (rest go in overflow). */
  maxChips?: number
}

export const GraphGoalChips = (props: GraphGoalChipsProps) => {
  const i18n = useI18n()
  const maxChips = props.maxChips ?? 5

  const visibleGoals = createMemo(() => getVisibleGoals(props.flags))

  const activeGoal = createMemo(() => {
    if (!props.currentLens) return undefined
    return visibleGoals().find((g: LensGoal) => g.lensId === props.currentLens)
  })

  return (
    <div data-slot="graph-toolbar-goal-chips" class="flex items-center gap-1.5">
      <span class="px-2 py-1 text-11-medium uppercase tracking-wide text-text-weak">
        {i18n.t("ui.sessionGraph.toolbar.goal")}
      </span>
      <div class="flex items-center gap-1 overflow-x-auto pb-1" role="group" aria-label={i18n.t("ui.sessionGraph.toolbar.goalAria")}>
        {visibleGoals().slice(0, maxChips).map((goal: LensGoal) => (
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-12-regular transition-colors whitespace-nowrap
              {activeGoal()?.label === goal.label
                ? 'bg-primary-base text-primary-contrast font-medium'
                : 'text-text-base hover:bg-surface-base-hover'}"
            onClick={() => props.onSelectGoal(goal)}
            aria-pressed={activeGoal()?.label === goal.label}
            aria-label={i18n.t(goal.i18nKey)}
            title={i18n.t(goal.descriptionI18nKey)}
          >
            <span>{i18n.t(goal.i18nKey)}</span>
          </button>
        ))}
        {visibleGoals().length > maxChips && (
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-12-regular text-text-weak hover:bg-surface-base-hover whitespace-nowrap"
            aria-label={i18n.t("ui.sessionGraph.toolbar.moreGoals")}
            title={i18n.t("ui.sessionGraph.toolbar.moreGoals")}
          >
            <span>+{visibleGoals().length - maxChips} more</span>
          </button>
        )}
      </div>
    </div>
  )
}