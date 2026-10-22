import type {
  JsonValue,
  PromptFileAttachment,
  SessionMessageAssistant,
  SessionMessageAssistantTool,
  SessionMessageInfo,
  SessionMessageToolStateCompleted,
} from "@opencode/client/promise"
import { buildGraph } from "./build"
import type { GraphModel } from "./model"

/**
 * Canonical representative session (SPACEGRAPH.TODO.1 §7). Deterministic: fixed base timestamp,
 * one second per event, stable readable IDs, no network, no clock, no randomness. Single source
 * for model tests, stories, e2e seeds, and screenshots.
 */
export const FIXTURE_BASE_TIME = 1_730_000_000_000

const CHANGED_FILES = ["src/auth/guards.ts", "src/auth/session.test.ts", "src/auth/session.ts", "src/auth/token.ts"]

function attachment(path: string): PromptFileAttachment {
  return {
    data: "",
    mime: "text/plain",
    source: { type: "uri", uri: path },
    mention: { start: 0, end: 0, text: path },
  }
}

function tool(
  id: string,
  name: string,
  state: SessionMessageAssistantTool["state"],
  time: SessionMessageAssistantTool["time"],
): SessionMessageAssistantTool {
  return { type: "tool", id, name, state, time }
}

function completed(
  input: Record<string, JsonValue>,
  content: string,
  metadata?: Record<string, JsonValue>,
): SessionMessageToolStateCompleted {
  return {
    status: "completed",
    input,
    content: [{ type: "text", text: content }],
    metadata,
  }
}

type AssistantPart = SessionMessageAssistant["content"][number]

function assistant(
  id: string,
  time: SessionMessageAssistant["time"],
  content: AssistantPart[],
  extra: Pick<SessionMessageAssistant, "error" | "retry" | "snapshot"> = {},
): SessionMessageAssistant {
  return {
    id,
    type: "assistant",
    agent: "build",
    model: { id: "claude", providerID: "anthropic" },
    content,
    time,
    ...extra,
  }
}

export function buildFixtureMessages(): SessionMessageInfo[] {
  let clock = FIXTURE_BASE_TIME
  const at = () => (clock += 1000)
  const messages: SessionMessageInfo[] = []

  // 1. Goal prompt with two attachments.
  messages.push({
    id: "msg_user_1",
    type: "user",
    text: "Fix the authentication test failures.",
    files: [attachment("src/auth/session.ts"), attachment("src/auth/session.test.ts")],
    time: { created: at() },
  })

  // 2. Assistant plan.
  messages.push(
    assistant("msg_plan_1", { created: at(), completed: at() }, [
      {
        type: "text",
        text: "I will inspect the failing authentication tests, trace the affected code, and fix the failures.",
      },
    ]),
  )

  // 3. Exploration: glob, grep, three reads (one large and truncated).
  messages.push(
    assistant("msg_explore_1", { created: at(), completed: at() }, [
      tool("prt_tool_glob_1", "glob", completed({ pattern: "**/*.test.ts" }, "src/auth/session.test.ts"), {
        created: at(),
        completed: at(),
      }),
      tool("prt_tool_grep_1", "grep", completed({ pattern: "auth" }, "12 matches across 3 files"), {
        created: at(),
        completed: at(),
      }),
      tool("prt_tool_read_1", "read", completed({ path: "src/auth/session.ts" }, "export function session() {}"), {
        created: at(),
        completed: at(),
      }),
      tool("prt_tool_read_2", "read", completed({ path: "src/auth/session.test.ts" }, "test('auth')"), {
        created: at(),
        completed: at(),
      }),
      tool(
        "prt_tool_read_3",
        "read",
        completed({ path: "src/auth/store.ts" }, "…output truncated…", { truncated: true, loaded: ["src/auth/store.ts"] }),
        { created: at(), completed: at() },
      ),
    ]),
  )

  // 4. Subagent delegation plus the synthetic completion it produces.
  messages.push(
    assistant("msg_delegate_1", { created: at(), completed: at() }, [
      tool(
        "prt_tool_subagent_1",
        "subagent",
        completed(
          { agent: "explore", description: "Authentication design" },
          "Session tokens refresh through the store.",
          { sessionID: "ses_child_auth", status: "completed" },
        ),
        { created: at(), completed: at() },
      ),
    ]),
  )
  messages.push({
    id: "msg_synthetic_1",
    type: "synthetic",
    text: "Subagent finished: Authentication design",
    description: "Authentication design",
    metadata: { source: "subagent", childID: "ses_child_auth", state: "completed" },
    time: { created: at() },
  })

  // 5. Edit phase: edit, write, patch.
  messages.push(
    assistant("msg_edit_1", { created: at(), completed: at() }, [
      tool("prt_tool_edit_1", "edit", completed({ path: "src/auth/session.ts" }, "updated session token handling"), {
        created: at(),
        completed: at(),
      }),
      tool("prt_tool_write_1", "write", completed({ path: "src/auth/token.ts" }, "created token module"), {
        created: at(),
        completed: at(),
      }),
      tool(
        "prt_tool_patch_1",
        "patch",
        completed(
          {},
          "applied patch",
          {
            files: [
              { path: "src/auth/session.ts", status: "modified" },
              { path: "src/auth/guards.ts", status: "modified" },
            ],
          },
        ),
        { created: at(), completed: at() },
      ),
    ], { snapshot: { files: ["src/auth/session.ts"] } }),
  )

  // 6. Verification: a passing narrow run, then the failing suite.
  messages.push(
    assistant("msg_verify_1", { created: at(), completed: at() }, [
      tool(
        "prt_tool_shell_1",
        "shell",
        completed({ command: "bun test src/auth/session.test.ts" }, "ok", {
          exit: 0,
          timeout: false,
        }),
        { created: at(), completed: at() },
      ),
      tool(
        "prt_tool_shell_2",
        "shell",
        completed({ command: "bun test" }, "FAIL auth refresh token", {
          exit: 1,
          timeout: false,
        }),
        { created: at(), completed: at() },
      ),
    ]),
  )

  // 7. Retry with attempt 2 and the failure error, then a corrective edit.
  messages.push(
    assistant(
      "msg_retry_1",
      { created: at(), completed: at() },
      [tool("prt_tool_edit_2", "edit", completed({ path: "src/auth/session.test.ts" }, "fixed refresh path"), {
        created: at(),
        completed: at(),
      })],
      {
        retry: {
          attempt: 2,
          at: clock,
          error: { type: "tool_error", message: "Expected refresh token to be stored" },
        },
        error: { type: "tool_error", message: "Expected refresh token to be stored" },
      },
    ),
  )

  // 8. Recovery: the suite passes.
  messages.push(
    assistant("msg_recovery_1", { created: at(), completed: at() }, [
      tool("prt_tool_shell_3", "shell", completed({ command: "bun test" }, "3 pass 0 fail", { exit: 0, timeout: false }), {
        created: at(),
        completed: at(),
      }),
    ]),
  )

  // 9. Idle: succeeded.
  messages.push({ id: "msg_idle_1", type: "idle", outcome: "succeeded", time: { created: at() } })

  // 10. A second turn proves separation.
  messages.push({ id: "msg_user_2", type: "user", text: "Also cover the refresh path", time: { created: at() } })
  messages.push(
    assistant("msg_edit_3", { created: at(), completed: at() }, [
      tool("prt_tool_edit_3", "edit", completed({ path: "src/auth/session.test.ts" }, "added refresh coverage"), {
        created: at(),
        completed: at(),
      }),
      tool("prt_tool_shell_4", "shell", completed({ command: "bun test" }, "4 pass 0 fail", { exit: 0, timeout: false }), {
        created: at(),
        completed: at(),
      }),
    ]),
  )
  messages.push({ id: "msg_idle_2", type: "idle", outcome: "succeeded", time: { created: at() } })

  return messages
}

export const fixtureMessages: SessionMessageInfo[] = buildFixtureMessages()

export function buildFixtureGraph(): GraphModel {
  return buildGraph(fixtureMessages, { type: "idle" })
}

/** Variant with an interrupted idle for error-path tests. */
export function buildInterruptedFixtureMessages(): SessionMessageInfo[] {
  const messages = buildFixtureMessages()
  const lastIdle = messages.findLastIndex((message) => message.type === "idle")

  return messages.map((message, index) =>
    index === lastIdle
      ? { ...message, type: "idle", outcome: "interrupted", error: { type: "aborted", message: "Interrupted" } }
      : message,
  )
}

export { CHANGED_FILES }
