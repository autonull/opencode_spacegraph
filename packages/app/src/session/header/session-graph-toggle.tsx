import { Show, createSignal } from "solid-js"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { Keybind } from "@opencode/ui/keybind"
import { Menu } from "@opencode/ui/menu"
import { Tooltip } from "@opencode/ui/tooltip"
import { useCommand } from "@/shell/commands/command"
import { useLanguage } from "@/runtime/i18n/language"
import { useSessionLayout } from "@/session/session-layout"
import { useSettings } from "@/settings/model"
import { Metrics } from "@opencode/session-ui/graph"

type GraphMode = "transcript" | "graph" | "hybrid"

/** Log | Map | Both mode switch for the session header (T18.2). */
export function SessionGraphToggle() {
  const command = useCommand()
  const language = useLanguage()
  const { graph } = useSessionLayout()
  const settings = useSettings()

  const enabled = settings.experimental.sessionGraph()

  if (!enabled) return null

  const mode = graph().mode()
  const [menuOpen, setMenuOpen] = createSignal(false)

  const modes: { value: GraphMode; label: string; icon: string }[] = [
    { value: "transcript", label: language.t("command.graph.mode.log"), icon: "filetree" },
    { value: "graph", label: language.t("command.graph.mode.map"), icon: "window-analytics" },
    { value: "hybrid", label: language.t("command.graph.mode.both"), icon: "split" },
  ]

  const currentMode = modes.find((m) => m.value === mode) ?? modes[0]

  const setMode = (nextMode: GraphMode) => {
    // T2.3: a surface switch is an interaction the protocol measures.
    Metrics.count("mode-switch")
    graph().setMode(nextMode)
    setMenuOpen(false)
  }

  return (
    <Tooltip
      class="shrink-0"
      placement="bottom"
      value={
        <>
          {currentMode.label}
          <Show when={command.keybindParts("graph.toggle").length > 0}>
            <Keybind keys={command.keybindParts("graph.toggle")} variant="neutral" />
          </Show>
        </>
      }
    >
      <Menu gutter={6} placement="bottom-start" open={menuOpen()} onOpenChange={setMenuOpen}>
        <Menu.Trigger as="button" type="button" aria-label={language.t("command.graph.toggle")} class="shrink-0">
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
            icon={<Icon name={currentMode.icon} />}
          />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content class="w-40" aria-label={language.t("command.graph.toggle")}>
            <Menu.RadioGroup value={mode} onChange={setMode}>
              {modes.map((m) => (
                <Menu.RadioItem key={m.value} value={m.value} class="flex items-center gap-2">
                  <Icon name={m.icon} class="shrink-0" />
                  <span>{m.label}</span>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Content>
        </Menu.Portal>
      </Menu>
    </Tooltip>
  )
}