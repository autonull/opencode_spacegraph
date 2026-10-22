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
  }
}
