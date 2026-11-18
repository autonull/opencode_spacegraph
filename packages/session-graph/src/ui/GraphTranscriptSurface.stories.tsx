import type { MountedSession } from "@opencode/plugin/gui"
import type { SessionMessageInfo } from "@opencode/client/promise"
import { buildFixtureGraph, buildFixtureMessages } from "@opencode/session-ui/graph"
import { CurrentSessionProviders } from "@opencode/session-ui/storybook"
import { GraphTranscriptSurface } from "./GraphTranscriptSurface"

const graph = buildFixtureGraph()

/** The surface reads only the session's messages and status; the story supplies those. */
function session(messages: () => SessionMessageInfo[]): MountedSession {
  return {
    id: "ses_graph_transcript_story",
    server: {
      data: {
        session: {
          message: { list: () => messages() },
          status: () => "idle",
        },
      },
    },
  } as unknown as MountedSession
}

function longMessages(turns: number): SessionMessageInfo[] {
  const messages: SessionMessageInfo[] = []
  let clock = 1_700_000_000_000

  for (let index = 0; index < turns; index += 1) {
    messages.push({
      id: `msg_user_long_${index}`,
      type: "user",
      text: `Turn ${index}`,
      time: { created: clock++ },
    })
    messages.push({
      id: `msg_assistant_long_${index}`,
      type: "assistant",
      agent: "build",
      model: { id: "claude", providerID: "anthropic" },
      content: [{ type: "text", text: `Answer ${index}` }],
      time: { created: clock++, completed: clock++ },
    })
  }

  return messages
}

const Harness = (props: { messages: SessionMessageInfo[]; height?: string }) => (
  <CurrentSessionProviders
    document={{
      sessionID: "ses_graph_transcript_story",
      messages: props.messages,
      status: { type: "idle" },
      diffs: [],
    }}
  >
    <div style={{ width: "900px", height: props.height ?? "640px", display: "flex" }}>
      <GraphTranscriptSurface model={graph} session={session(() => props.messages)} />
    </div>
  </CurrentSessionProviders>
)

export default {
  title: "OpenCode/Session graph/Transcript surface",
  id: "session-graph-graph-transcript",
  component: Harness,
}

/** The canonical fixture: its first turn carries a failure, so the row offers Why and Expand. */
export const Default = {
  render: () => <Harness messages={buildFixtureMessages()} />,
}

/** Many turns, so a component test can prove only the visible rows mount. */
export const Long = {
  render: () => <Harness messages={longMessages(60)} />,
}
