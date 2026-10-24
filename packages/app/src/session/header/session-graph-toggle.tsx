import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { Keybind } from "@opencode/ui/keybind"
import { Tooltip } from "@opencode/ui/tooltip"
import { useCommand } from "@/shell/commands/command"
import { useLanguage } from "@/runtime/i18n/language"
import { useSessionLayout } from "@/session/session-layout"
import { useSettings } from "@/settings/model"
import { Metrics } from "@opencode/session-ui/graph"

type GraphMode = "transcript" | "graph" | "hybrid"

/** Log | Map switch plus one split-view control for the session header (T18.2). */
export function SessionGraphToggle() {
  const command = useCommand()
  const language = useLanguage()
  const { graph } = useSessionLayout()
  const settings = useSettings()

  const enabled = settings.experimental.sessionGraph()

  if (!enabled) return null

  const mode = graph().mode

  const setMode = (nextMode: GraphMode) => {
    // T2.3: a surface switch is an interaction the protocol measures.
    Metrics.count("mode-switch")
    graph().setMode(nextMode)
  }

  const icon = () => (mode() === "transcript" ? "filetree" : mode() === "graph" ? "window-analytics" : "split")
  const label = () =>
    mode() === "transcript"
      ? language.t("command.graph.mode.log")
      : mode() === "graph"
        ? language.t("command.graph.mode.map")
        : language.t("command.graph.mode.both")

  return (
    <div class="flex shrink-0 items-center gap-0.5">
      <Tooltip
        placement="bottom"
        value={
          <>
            {label()}
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
          data-state={mode() !== "transcript" ? "pressed" : undefined}
          icon={<Icon name={icon()} />}
          onClick={() => setMode(mode() === "transcript" ? "graph" : "transcript")}
        />
      </Tooltip>
      <Tooltip placement="bottom" value={language.t("command.graph.hybrid")}>
        <IconButton
          type="button"
          variant="ghost-muted"
          size="large"
          aria-label={language.t("command.graph.hybrid")}
          aria-pressed={mode() === "hybrid"}
          data-state={mode() === "hybrid" ? "pressed" : undefined}
          icon={<Icon name="split" />}
          onClick={() => setMode(mode() === "hybrid" ? "graph" : "hybrid")}
        />
      </Tooltip>
    </div>
  )
}
