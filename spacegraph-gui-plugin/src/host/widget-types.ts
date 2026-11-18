import type { Composer } from "@opencode/plugin/gui"
import type { GraphNode, GraphViewData } from "../model"

/** A file the edit tool wrote, with the graph's accumulated stats. */
export type DiffFileStat = {
  path: string
  additions?: number
  deletions?: number
}

/** Props of the composer widget mounted inside the session node. */
export type ComposerNodeWidgetProps = {
  node: GraphNode
  composer: Composer | undefined
  readOnly?: boolean
  maxHeight?: number
}

/** Props of the subagent widget mounted inside a subagent node. */
export type SubagentNodeWidgetProps = {
  node: GraphNode
  model: GraphViewData
  onDrillDown: (subagentID: string) => void
  maxDepth?: number
  inPopover?: boolean
}

/** Props of the todo widget mounted inside a `todowrite` tool node. */
export type TodoNodeWidgetProps = {
  node: GraphNode
}

/** Props of the diff widget mounted inside an edit-like tool node. */
export type DiffNodeWidgetProps = {
  node: GraphNode
  files?: readonly DiffFileStat[]
}

/** Props of the terminal widget mounted inside a shell result node. */
export type TerminalNodeWidgetProps = {
  node: GraphNode
}
