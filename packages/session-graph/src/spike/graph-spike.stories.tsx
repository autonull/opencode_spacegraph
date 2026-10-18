import { GraphSpike } from "./graph-spike"

const Story = () => (
  <div style={{ width: "960px", height: "600px", border: "1px solid var(--v2-border, #333)", overflow: "hidden" }}>
    <GraphSpike />
  </div>
)

export default {
  title: "OpenCode/Session graph/Spike",
  id: "session-graph-spike",
  component: Story,
}

export const Default = {
  render: () => <Story />,
}
