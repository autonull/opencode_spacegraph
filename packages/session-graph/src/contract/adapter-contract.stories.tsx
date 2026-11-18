import { AdapterContract } from "./adapter-contract"

const Story = () => (
  <div style={{ width: "960px", height: "600px", border: "1px solid var(--v2-border, #333)", overflow: "hidden" }}>
    <AdapterContract />
  </div>
)

export default {
  title: "OpenCode/Session graph/Adapter contract",
  id: "session-graph-adapter",
  component: Story,
}

export const Default = {
  render: () => <Story />,
}
