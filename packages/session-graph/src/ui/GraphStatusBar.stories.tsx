import { createSignal } from "solid-js"
import { GraphStatusBar } from "./GraphStatusBar"

export const StatusBarHarness = () => {
  const [count, setCount] = createSignal(3)
  const [active, setActive] = createSignal(false)
  const [collapsed, setCollapsed] = createSignal(false)

  return (
    <GraphStatusBar
      count={count()}
      onFrame={() => undefined}
      onKeepOnly={() => undefined}
      onCopyPaths={() => undefined}
      onExportSubset={() => undefined}
      onClear={() => setCount(0)}
      onAddNote={() => undefined}
      compare={{
        active: active(),
        onCompare: () => setActive(true),
        onClear: () => setActive(false),
      }}
      group={{
        collapsed: collapsed(),
        onToggle: () => setCollapsed((value) => !value),
        onCollapseOthers: () => undefined,
      }}
    />
  )
}

export default {
  title: "OpenCode/Session graph/Status bar",
  id: "session-graph-status-bar",
  component: GraphStatusBar,
}

export const Verbs = {
  render: () => <StatusBarHarness />,
}
