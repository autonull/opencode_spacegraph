import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { Keybind } from "@opencode/ui/keybind"
import { Tooltip } from "@opencode/ui/tooltip"
import { useCommand } from "@/shell/commands/command"
import { useLanguage } from "@/runtime/i18n/language"
import { useSessionLayout } from "@/session/session-layout"
import { useSettings } from "@/settings/model"
import { Metrics } from "@opencode/session-ui/graph"

/** The map surface switch and the split control for the session header (T18.2). */
export function SessionGraphToggle() {
  const command = useCommand()
  const language = useLanguage()
  const { graph } = useSessionLayout()
  const settings = useSettings()

  const enabled = settings.experimental.sessionGraph()

  if (!enabled) return null

  const state = graph()

  const toggleMap = () => {
    // T2.3: a surface switch is an interaction the protocol measures.
    Metrics.count("mode-switch")
    state.setMap(!state.map())
  }

  const toggleSplit = () => {
    Metrics.count("mode-switch")
    if (state.sideBySide()) {
      state.setSideBySide(false)

      return
    }

    state.setMap(true)
    state.setSideBySide(true)
  }

  return (
    <div class="flex shrink-0 items-center gap-0.5">
      <Tooltip
        placement="bottom"
        value={
          <>
            {language.t("command.graph.toggle")}
            {command.keybindParts("graph.toggle").length > 0 ? (
              <Keybind keys={command.keybindParts("graph.toggle")} variant="neutral" />
            ) : null}
          </>
        }
      >
        <IconButton
          type="button"
          variant="ghost-muted"
          size="large"
          aria-label={language.t("command.graph.toggle")}
          data-state={state.map() ? "pressed" : undefined}
          icon={<Icon name={state.map() ? "window-analytics" : "filetree"} />}
          onClick={toggleMap}
        />
      </Tooltip>
      <Tooltip placement="bottom" value={language.t("command.graph.hybrid")}>
        <IconButton
          type="button"
          variant="ghost-muted"
          size="large"
          aria-label={language.t("command.graph.hybrid")}
          aria-pressed={state.sideBySide()}
          data-state={state.sideBySide() ? "pressed" : undefined}
          icon={<Icon name="split" />}
          onClick={toggleSplit}
        />
      </Tooltip>
    </div>
  )
}
