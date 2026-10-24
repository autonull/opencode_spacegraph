import type {
  JsonValue,
  PromptFileAttachment,
  SessionMessageAssistant,
  SessionMessageAssistantTool,
  SessionMessageInfo,
  SessionMessageToolStateCompleted,
  WorkspaceSnapshot,
} from "@opencode/client/promise"
import { buildGraph } from "./build"
import type { GraphViewData } from "./model"

/**
 * Canonical representative session (SPACEGRAPH.TODO.1 §7). Deterministic: fixed base timestamp,
 * one second per event, stable readable IDs, no network, no clock, no randomness. Single source
 * for model tests, stories, e2e seeds, and screenshots.
 */
export const FIXTURE_BASE_TIME = 1_730_000_000_000

const CHANGED_FILES: Array<{ path: string; status: "added" | "modified" }> = [
  { path: "src/auth/guards.ts", status: "modified" },
  { path: "src/auth/session.test.ts", status: "added" },
  { path: "src/auth/session.ts", status: "modified" },
  { path: "src/auth/token.ts", status: "modified" },
]

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

/** T32.1 — comprehensive snapshot fixture with all derived kinds. */
export function buildFixtureSnapshot(): WorkspaceSnapshot {
  return {
    version: 1,
    revision: "fixture-r1",
    root: "/workspace/project",
    scope: "session",
    asOf: {
      tree: FIXTURE_BASE_TIME,
      vcs: FIXTURE_BASE_TIME,
      packages: FIXTURE_BASE_TIME,
      symbols: FIXTURE_BASE_TIME,
      processes: FIXTURE_BASE_TIME,
      issues: FIXTURE_BASE_TIME,
    },
    truncated: false,
    workspace: { name: "project", path: "/workspace/project" },
    directories: [
      { path: "src", parent: "" },
      { path: "src/auth", parent: "src" },
      { path: "packages", parent: "" },
      { path: "packages/ui", parent: "packages" },
      { path: "packages/core", parent: "packages" },
    ],
    packages: [
      { path: "packages/ui/package.json", name: "@project/ui", version: "1.0.0", private: true, scripts: ["build", "test"] },
      { path: "packages/core/package.json", name: "@project/core", version: "2.0.0", private: true, scripts: ["build", "test", "lint"] },
    ],
    files: [
      ...CHANGED_FILES,
      { path: "packages/ui/package.json", config: true },
      { path: "packages/ui/src/button.ts" },
      { path: "packages/core/package.json", config: true },
      { path: "packages/core/src/index.ts" },
      { path: "README.md", doc: true },
      { path: "docs/adr/001-auth.md", doc: true },
    ],
    head: { branch: "dev", sha: "abc123def456" },
    base: { sha: "base789" },
    branches: [
      { name: "main", sha: "abc123def456", upstream: "origin/main", remote: true },
      { name: "dev", sha: "abc123def456", upstream: "origin/dev", remote: true },
      { name: "feature/auth-fix", sha: "abc123def456", remote: false },
    ],
    commits: [
      { sha: "abc123def456", short: "abc123d", message: "Fix auth tests", author: "user", time: FIXTURE_BASE_TIME - 10000, files: ["src/auth/session.ts"] },
      { sha: "base789", short: "base789", message: "Initial commit", author: "user", time: FIXTURE_BASE_TIME - 100000, files: ["src/auth/session.ts", "src/auth/guards.ts"] },
    ],
    symbols: [
      { path: "src/auth/session.ts", name: "session", qualified: "session", kind: "function", range: { start: { line: 10, character: 0 }, end: { line: 20, character: 1 } }, signature: "function session(): Session", origin: "parser" },
      { path: "src/auth/session.ts", name: "refreshToken", qualified: "session.refreshToken", kind: "function", range: { start: { line: 25, character: 0 }, end: { line: 30, character: 1 } }, signature: "function refreshToken(token: string): Promise<string>", origin: "hunk" },
      { path: "packages/ui/src/button.ts", name: "Button", qualified: "Button", kind: "class", range: { start: { line: 5, character: 0 }, end: { line: 30, character: 1 } }, signature: "class Button", origin: "parser" },
    ],
    processes: [
      { id: "proc_shell_1", pid: 1234, command: "bun run dev", cwd: "/workspace/project", ports: [3000], startedAt: FIXTURE_BASE_TIME - 5000 },
    ],
    issues: [
      { provider: "github", repo: "project/repo", number: "42", title: "Auth test failures", state: "open", url: "https://github.com/project/repo/issues/42" },
    ],
    missing: [],
    capabilities: ["fs.tree", "vcs.status", "vcs.diff", "vcs.checkout", "vcs.blame", "vcs.branch.list", "agent", "proxy"],
  }
}

export function buildFixtureGraph(): GraphViewData {
  return buildGraph({ messages: fixtureMessages, status: { type: "idle" } })
}

/** T32.1 — fixture graph with comprehensive snapshot (all derived kinds). */
export function buildFixtureGraphWithSnapshot(): GraphViewData {
  return buildGraph({ messages: fixtureMessages, status: { type: "idle" }, snapshot: buildFixtureSnapshot() })
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
