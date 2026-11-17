import type { GraphNode } from "@opencode/session-ui/graph"
import { ComposerNodeWidget } from "./ComposerNodeWidget"

const node: GraphNode = {
  id: "session",
  kind: "session",
  label: "Session",
  status: "neutral",
  minLevel: "overview",
}

export default {
  title: "OpenCode/Session graph/Composer widget",
  id: "session-graph-composer-widget",
  component: ComposerNodeWidget,
}

/** M6.8 — the composer widget's chrome under the active writing direction. */
export const Default = {
  render: () => (
    <div style={{ padding: "16px", width: "320px" }}>
      <ComposerNodeWidget node={node} composer={undefined} />
    </div>
  ),
}
