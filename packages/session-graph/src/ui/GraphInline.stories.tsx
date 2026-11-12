import { buildFixtureGraph } from "@opencode/session-ui/graph"
import { GraphPreview } from "./GraphInline"

const graph = buildFixtureGraph()
const turnID = graph.turns[0]!

export default {
  title: "OpenCode/Session graph/Inline preview",
  id: "session-graph-inline-preview",
  component: GraphPreview,
}

/** M6.1 — the static preview carries a name and a summary, without mounting the a11y mirror. */
export const Default = {
  render: () => (
    <div style={{ display: "flex", padding: "16px" }}>
      <GraphPreview model={graph} turnID={turnID} />
    </div>
  ),
}
