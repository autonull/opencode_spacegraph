import { Component } from "solid-js"
import { useLanguage } from "@/runtime/i18n/language"
import { useSettings } from "@/settings/model"
import { Switch } from "@opencode/ui/switch"
import "@/settings/settings.css"

export const experimentalSettingsAvailable = true

export const SettingsExperimental: Component = () => {
  const language = useLanguage()
  const settings = useSettings()

  return (
    <>
      <div class="settings-tab-header">
        <div class="settings-tab-header-row">
          <div class="flex flex-col gap-1">
            <h2 class="settings-tab-title">{language.t("settings.tab.experimental")}</h2>
            <span class="text-11-regular text-v2-text-text-muted">
              {language.t("settings.experimental.description")}
            </span>
          </div>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-row">
          <div class="settings-row-content">
            <h3 class="settings-row-title">{language.t("settings.experimental.sessionGraph.title")}</h3>
            <p class="settings-row-description">{language.t("settings.experimental.sessionGraph.description")}</p>
          </div>
          <Switch
            checked={settings.experimental.sessionGraph()}
            onChange={settings.experimental.setSessionGraph}
            aria-label={language.t("settings.experimental.sessionGraph.title")}
          />
        </div>
      </div>
    </>
  )
}
