import { Show } from "solid-js"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { Keybind } from "@opencode/ui/keybind"
import { Tooltip } from "@opencode/ui/tooltip"
import { useCommand } from "@/shell/commands/command"
import { useLanguage } from "@/runtime/i18n/language"
import { useSessionLayout } from "@/session/session-layout"
import { useSettings } from "@/settings/model"

/** Transcript | graph mode switch for the session header (I4.5). */
export function SessionGraphToggle() {
  const command = useCommand()
  const language = useLanguage()
  const { graph } = useSessionLayout()
  const settings = useSettings()


  const enabled = settings.experimental.sessionGraph()

  if (!enabled) return null

  const active = () => graph().mode() === "graph"

  return (
    <Tooltip
      class="shrink-0"
      placement="bottom"
      value={
        <>
          {language.t("command.graph.toggle")}
          <Show when={command.keybindParts("graph.toggle").length > 0}>
            <Keybind keys={command.keybindParts("graph.toggle")} variant="neutral" />
          </Show>
        </>
      }
    >
      <IconButton
        type="button"
        variant="ghost-muted"
        size="large"
        class="shrink-0"
        style={{
          // This fixed control sits above moving panel contents.
          "--v2-overlay-simple-overlay-hover": "var(--v2-background-bg-layer-01)",
          "--v2-overlay-simple-overlay-pressed": "var(--v2-background-bg-layer-02)",
        }}
        state={active() ? "pressed" : undefined}
        onClick={() => graph().setMode(active() ? "transcript" : "graph")}
        aria-label={language.t("command.graph.toggle")}
        aria-pressed={active()}
        icon={<Icon name="window-analytics" />}
      />
    </Tooltip>
  )
}
