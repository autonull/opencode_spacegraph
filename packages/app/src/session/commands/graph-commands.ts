import { type CommandOption } from "@/shell/commands/command"
import { Metrics } from "@opencode/session-ui/graph"
import { TURN_MAP_ACTIVE } from "@/session/graph/turn-map-overlay"
import { useLanguage } from "@/runtime/i18n/language"
import { useLayout } from "@/shell/state/layout"
import type { SessionCommandContext } from "./use-session-commands"

const withCategory = (category: string) => {
  return (option: Omit<CommandOption, "category">): CommandOption => ({
    ...option,
    category,
  })
}

type GraphCommandsProps = {
  actions: SessionCommandContext
  graphEnabled: () => boolean
  shown: () => boolean
}

export function graphCommands(props: GraphCommandsProps): CommandOption[] {
  const language = useLanguage()
  const layout = useLayout()

  const { actions, graphEnabled, shown } = props
  const hasSession = !!actions.session.identity.params.id
  const enabled = graphEnabled() && hasSession

  const viewCommand = withCategory(language.t("command.category.view"))

  return [
    viewCommand({
      id: "review.toggle",
      title: language.t("command.review.toggle"),
      keybind: "mod+shift+r",
      onSelect: () => actions.session.layout.view().side.toggle(),
    }),
    viewCommand({
      id: "graph.toggle",
      title: language.t("command.graph.toggle"),
      keybind: "mod+shift+g",
      disabled: !enabled,
      onSelect: () => {
        const graph = actions.session.layout.graph()
        Metrics.count("mode-switch")
        graph.setMap(!graph.map())
      },
    }),
    viewCommand({
      id: "graph.hybrid",
      title: language.t("command.graph.hybrid"),
      keybind: "mod+shift+h",
      disabled: !enabled,
      onSelect: () => {
        const graph = actions.session.layout.graph()
        Metrics.count("mode-switch")
        const next = !graph.sideBySide()
        if (next) graph.setMap(true)
        graph.setSideBySide(next)
      },
    }),
    viewCommand({
      id: "graph.projection",
      title: language.t("command.graph.projection"),
      keybind: "mod+alt+g",
      disabled: !enabled,
      onSelect: () => {
        const graph = actions.session.layout.graph()
        graph.setProjection(graph.projection() === "3d" ? "2d" : "3d")
      },
    }),
    viewCommand({
      id: "graph.turnmap",
      title: language.t("command.graph.turnmap"),
      keybind: "mod+alt+t",
      disabled: !enabled,
      onSelect: () => {
        const graph = actions.session.layout.graph()

        if (graph.turnMap()) {
          graph.setTurnMap(undefined)

          return
        }

        const selected = graph.selected()
        const turnID = selected?.startsWith("turn:") ? selected : TURN_MAP_ACTIVE
        graph.setTurnMap(turnID)
      },
    }),
    ...(shown()
      ? [
          viewCommand({
            id: "fileTree.toggle",
            title: language.t("command.fileTree.toggle"),
            keybind: "mod+\\",
            onSelect: () => layout.fileTree.toggle(),
          }),
        ]
      : []),
    viewCommand({
      id: "input.focus",
      title: language.t("command.input.focus"),
      keybind: "ctrl+l",
      onSelect: actions.focusInput,
    }),
  ]
}