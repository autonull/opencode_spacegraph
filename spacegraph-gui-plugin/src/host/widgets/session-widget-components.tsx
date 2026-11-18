import { createSessionWidgetRegistry, type SessionWidgetComponents, type SessionWidgetHost } from "../widget-registry"
import { ComposerNodeWidget } from "./ComposerNodeWidget"
import { DiffNodeWidget } from "./DiffNodeWidget"
import { SubagentNodeWidget } from "./SubagentNodeWidget"
import { TerminalNodeWidget } from "./TerminalNodeWidget"
import { TodoNodeWidget } from "./TodoNodeWidget"

/** The OpenCode host's widgets, bound to the library's descriptor ids. */
export const sessionWidgetComponents: SessionWidgetComponents = {
  composer: ComposerNodeWidget,
  subagent: SubagentNodeWidget,
  todo: TodoNodeWidget,
  diff: DiffNodeWidget,
  terminal: TerminalNodeWidget,
}

/** Build the OpenCode widget registry with the host's real Solid components. */
export const createOpenCodeWidgetRegistry = (host: SessionWidgetHost) =>
  createSessionWidgetRegistry(host, sessionWidgetComponents)
