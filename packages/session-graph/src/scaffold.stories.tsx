import { PACKAGE } from "./index"

const Scaffold = () => (
  <div class="flex flex-col gap-1 p-4 text-13-regular text-text-base">
    <span class="text-13-medium text-text-strong">{PACKAGE}</span>
    <span>Placeholder story. Real graph stories replace this in Phase 3.</span>
  </div>
)

export default {
  title: "OpenCode/Session graph/Scaffold",
  id: "session-graph-scaffold",
  component: Scaffold,
}

export const Default = {
  render: () => <Scaffold />,
}
