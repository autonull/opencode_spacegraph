import { CytoscapeContract } from "./cytoscape-contract"

const Story = () => (
  <div style={{ width: "960px", height: "600px", border: "1px solid var(--v2-border, #333)", overflow: "hidden" }}>
    <CytoscapeContract />
  </div>
)

export default {
  title: "OpenCode/Session graph/Cytoscape contract",
  id: "session-graph-cytoscape",
  component: Story,
}

export const Default = {
  render: () => <Story />,
}
