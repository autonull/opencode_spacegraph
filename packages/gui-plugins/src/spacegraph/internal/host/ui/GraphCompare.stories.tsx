import { buildFixtureGraph } from "@opencode/session-ui/graph"
import { GraphCompare } from "./GraphCompare"

const model = buildFixtureGraph()

export default {
  title: "OpenCode/Session graph/Compare",
  id: "session-graph-compare",
  component: GraphCompare,
}

export const Changes = {
  render: () => (
    <GraphCompare
      model={model}
      changes={{
        added: new Set(["file:src/auth/token.ts", "tool:prt_tool_read_1"]),
        removed: new Set(["file:src/auth/session.ts"]),
        changed: new Set(["file:src/auth/guards.ts"]),
      }}
    />
  ),
}

export const Empty = {
  render: () => <GraphCompare model={model} changes={{ added: new Set(), removed: new Set(), changed: new Set() }} />,
}
