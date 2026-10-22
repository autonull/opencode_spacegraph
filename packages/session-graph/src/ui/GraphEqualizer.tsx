import type { EqualizerRule, EqualizerRuleSet } from "@opencode/session-ui/graph"
import { EQUALIZER_PRESETS } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { Icon } from "@opencode/ui/icon"
import { For, Show } from "solid-js"
import { kindAccent } from "./cardTemplate"
import { KIND_KEY, STATUS_KEY } from "./vocabulary"

/**
 * T15.4 — the equalizer's panel. The engine and the presets have been in the map since T15; this is
 * the way in: the presets are the product (a reader should not have to write rules to get value),
 * and the rules they produce are listed with a preview, a size, and a way to drop them.
 *
 * The panel owns no rules: the host persists them per session, and the panel reports what the
 * reader did. A size change re-lays-out the map, so the size is committed on release, not on every
 * pixel of the drag.
 */

const PRESET_KEY: Record<string, string> = {
  "errors-larger": "ui.sessionGraph.equalizer.preset.errorsLarger",
  "subagents-as-large": "ui.sessionGraph.equalizer.preset.subagentsAsLarge",
  "old-files-dimmer": "ui.sessionGraph.equalizer.preset.oldFilesDimmer",
}

export type GraphEqualizerBodyProps = {
  rules: EqualizerRuleSet
  onChange: (rules: EqualizerRule[]) => void
}

export const GraphEqualizerBody = (props: GraphEqualizerBodyProps) => {
  const i18n = useI18n()

  const describe = (rule: EqualizerRule) =>
    [
      rule.kind ? i18n.t(KIND_KEY[rule.kind]) : i18n.t("ui.sessionGraph.equalizer.everyCard"),
      rule.status ? i18n.t(STATUS_KEY[rule.status]) : undefined,
    ]
      .filter((part): part is string => !!part)
      .join(" · ")

  const setScale = (rule: EqualizerRule, scale: number) =>
    props.onChange(props.rules.map((current) => (current.id === rule.id ? { ...current, scale } : current)))

  const remove = (id: string) => props.onChange(props.rules.filter((rule) => rule.id !== id))

  return (
    <div class="min-h-0 flex-1 overflow-y-auto border-t border-border-weaker-base px-3 py-2">
      <div class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.equalizer.presets")}</div>
      <div class="mt-1 flex flex-col gap-0.5">
        <For each={EQUALIZER_PRESETS}>
          {(preset) => (
            <button
              type="button"
              data-slot="graph-equalizer-preset"
              data-preset={preset.id}
              class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-12-regular text-text-base hover:bg-surface-base-hover"
              onClick={() => props.onChange([...preset.rules])}
            >
              <span
                class="h-3 w-3 shrink-0 rounded-sm"
                style={{ background: kindAccent(preset.rules[0]?.kind ?? "session", preset.rules).solid }}
                aria-hidden="true"
              />
              <span class="truncate">{i18n.t(PRESET_KEY[preset.id] ?? preset.id)}</span>
            </button>
          )}
        </For>
      </div>

      <div class="mt-3 text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.equalizer.rules")}</div>
      <Show
        when={props.rules.length > 0}
        fallback={
          <p class="mt-1 text-12-regular text-text-weaker">{i18n.t("ui.sessionGraph.equalizer.empty")}</p>
        }
      >
        <ul class="mt-1 flex flex-col gap-1.5">
          <For each={props.rules}>
            {(rule) => (
              <li class="flex items-center gap-2" data-slot="graph-equalizer-rule" data-rule-id={rule.id}>
                <span
                  class="h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: kindAccent(rule.kind ?? "session", props.rules).solid }}
                  aria-hidden="true"
                />
                <span class="min-w-0 flex-1 truncate text-12-regular text-text-base">{describe(rule)}</span>
                <input
                  type="range"
                  min="0.6"
                  max="1.8"
                  step="0.1"
                  value={rule.scale ?? 1}
                  aria-label={i18n.t("ui.sessionGraph.equalizer.size")}
                  class="w-16 shrink-0"
                  onChange={(event) => setScale(rule, Number(event.currentTarget.value))}
                />
                <button
                  type="button"
                  data-slot="graph-equalizer-remove"
                  aria-label={i18n.t("ui.sessionGraph.equalizer.remove")}
                  class="shrink-0 rounded-sm p-0.5 text-text-weak hover:bg-surface-base-hover hover:text-text-strong"
                  onClick={() => remove(rule.id)}
                >
                  <Icon name="close" size="small" />
                </button>
              </li>
            )}
          </For>
        </ul>
        <button
          type="button"
          data-slot="graph-equalizer-reset"
          class="mt-3 rounded-sm border border-border-base px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
          onClick={() => props.onChange([])}
        >
          {i18n.t("ui.sessionGraph.equalizer.reset")}
        </button>
      </Show>
    </div>
  )
}
