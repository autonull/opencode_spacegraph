import type { UiI18n } from "@opencode/ui/context/i18n"
import type { CardCopy } from "./cardTemplate"

/**
 * The card's words, in the reader's language. The card is canvas markup, so the host owns its
 * language: the template asks for a phrase and this module names the key it lives under.
 */
export function createCardCopy(i18n: UiI18n): CardCopy {
  return {
    steered: (role) => i18n.t("ui.sessionGraph.card.steered", { role }),
    exit: (code) => i18n.t("ui.sessionGraph.card.exit", { code }),
    timedOut: () => i18n.t("ui.sessionGraph.card.timedOut"),
    replayed: () => i18n.t("ui.sessionGraph.card.replayed"),
    reads: (count) => i18n.plural("ui.sessionGraph.card.reads", count),
    writes: (count) => i18n.plural("ui.sessionGraph.card.writes", count),
    diff: (additions, deletions) => {
      const parts: string[] = []
      if (additions > 0) parts.push(`+${additions}`)
      if (deletions > 0) parts.push(`−${deletions}`)
      return parts.join(" ")
    },
    collapseGroup: () => i18n.t("ui.sessionGraph.status.collapseGroup"),
    expandGroup: () => i18n.t("ui.sessionGraph.status.expandGroup"),
    copyButton: () => i18n.t("ui.sessionGraph.card.copyButton"),
    pinned: () => i18n.t("ui.sessionGraph.status.pinned"),
    cost: (usage) => {
      const compact = new Intl.NumberFormat(i18n.locale(), { notation: "compact", maximumFractionDigits: 1 })
      const tokens = `${usage.streaming ? "~" : ""}${compact.format(usage.tokens)} ${i18n.t("ui.sessionGraph.card.tokenUnit")}`
      const tools = usage.tools > 0 ? i18n.plural("ui.sessionGraph.card.tools", usage.tools) : undefined
      const seconds = usage.wallTime / 1000
      const duration =
        usage.wallTime <= 0
          ? undefined
          : seconds < 1
            ? i18n.t("ui.sessionGraph.card.durationUnderSecond")
            : seconds < 60
              ? i18n.t("ui.sessionGraph.card.durationSeconds", { seconds: seconds.toFixed(1) })
              : i18n.t("ui.sessionGraph.card.durationMinutes", { minutes: (seconds / 60).toFixed(1) })
      return [tokens, tools, duration].filter(Boolean).join(" · ")
    },
  }
}
