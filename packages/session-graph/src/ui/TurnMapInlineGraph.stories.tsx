import { buildFixtureGraph, turnNodeID } from "@opencode/session-ui/graph"
import { TurnMapInlineGraph } from "./TurnMapInlineGraph"

const graph = buildFixtureGraph()
const TURN = turnNodeID("msg_user_1")

const InlineHarness = (props: { limit?: number }) => (
  <div style={{ width: "520px", padding: "16px", "font-family": "system-ui, sans-serif" }}>
    <TurnMapInlineGraph model={graph} turnID={TURN} limit={props.limit} />
  </div>
)

export default {
  title: "OpenCode/Session graph/Turn inline",
  id: "session-graph-turn-inline",
  component: InlineHarness,
}

export const Default = {
  render: () => <InlineHarness />,
}

export const SmallLimit = {
  render: () => <InlineHarness limit={3} />,
}
