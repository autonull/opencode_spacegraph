import { GraphPeek } from "./GraphPeek"

export default {
  title: "OpenCode/Session graph/Peek",
  id: "session-graph-peek",
  component: GraphPeek,
}

export const Edge = {
  render: () => (
    <GraphPeek
      edge={{
        id: "writes:turn->file",
        kind: "writes",
        source: "turn:1",
        target: "file:src/auth/token.ts",
        confidence: "explicit",
        label: "src/auth/token.ts",
      }}
    />
  ),
}

export const Node = {
  render: () => (
    <GraphPeek node={{ id: "file:src/auth/token.ts", kind: "file", label: "src/auth/token.ts", status: "neutral" }} />
  ),
}
