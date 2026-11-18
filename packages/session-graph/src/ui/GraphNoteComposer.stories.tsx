import { createSignal } from "solid-js"
import { GraphNoteComposer } from "./GraphNoteComposer"

const Harness = () => {
  const [saved, setSaved] = createSignal<string | undefined>()

  return (
    <div class="relative h-64 w-full">
      <div data-slot="note-result">{saved() ?? "none"}</div>
      <GraphNoteComposer
        targetLabel="src/auth/token.ts"
        anchor={{ x: 12, y: 12 }}
        onSave={(body) => setSaved(body)}
        onClose={() => setSaved("closed")}
      />
    </div>
  )
}

export default {
  title: "OpenCode/Session graph/Note composer",
  id: "session-graph-note-composer",
  component: GraphNoteComposer,
}

export const Compose = {
  render: () => <Harness />,
}
