import type { JsonValue } from "@opencode/client/promise"
import type { GraphNode } from "@opencode/session-ui/graph"

/**
 * What a node widget reads from a node's untyped `data`. One place owns the shape, so the three
 * widgets and their stories agree about what a tool call recorded.
 */

const jsonRecord = (value: JsonValue | undefined): Record<string, JsonValue> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value : undefined

const string = (value: JsonValue | undefined): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined

const number = (value: JsonValue | undefined): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined

export type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled"

export type TodoItem = {
  content: string
  status: TodoStatus
}

const TODO_STATUSES: readonly TodoStatus[] = ["pending", "in_progress", "completed", "cancelled"]

/** The todos a `todowrite` tool call carried. */
export function todoItems(node: GraphNode): TodoItem[] {
  const input = jsonRecord(node.data?.input)
  const todos = input?.todos

  if (!Array.isArray(todos)) return []

  return todos.flatMap((value) => {
    const item = jsonRecord(value)
    const content = string(item?.content)
    const status = string(item?.status)

    if (!content) return []

    return [
      {
        content,
        status: TODO_STATUSES.find((candidate) => candidate === status) ?? "pending",
      },
    ]
  })
}

export type TerminalSnapshot = {
  output: string
  exit?: number
  timeout: boolean
  truncated: boolean
}

/** A shell result's terminal text and how the command ended. */
export function terminalSnapshot(node: GraphNode): TerminalSnapshot | undefined {
  const output = string(node.data?.output)

  if (!output) return undefined

  return {
    output,
    exit: number(node.data?.exit),
    timeout: node.data?.timeout === true,
    truncated: node.data?.truncated === true,
  }
}

export type DiffLine = {
  kind: "add" | "remove" | "context"
  text: string
}

export type DiffPreview = {
  file?: string
  lines: DiffLine[]
  additions: number
  deletions: number
}

const patchLines = (patch: string): DiffLine[] =>
  patch
    .split("\n")
    .filter((line) => !line.startsWith("+++") && !line.startsWith("---"))
    .map((line) => {
      if (line.startsWith("@@")) return { kind: "context" as const, text: line }
      if (line.startsWith("+")) return { kind: "add" as const, text: line.slice(1) }
      if (line.startsWith("-")) return { kind: "remove" as const, text: line.slice(1) }
      return { kind: "context" as const, text: line.startsWith(" ") ? line.slice(1) : line }
    })

/** A small read-only diff for an edit-like tool call. */
export function diffPreview(node: GraphNode): DiffPreview | undefined {
  const input = jsonRecord(node.data?.input)

  if (!input) return undefined

  const file = string(input.filePath) ?? string(input.path) ?? string(input.file)
  const patch = string(input.patch)
  const oldText = string(input.oldString) ?? string(input.old_string)
  const newText = string(input.newString) ?? string(input.new_string)
  const content = string(input.content)

  const lines = patch
    ? patchLines(patch)
    : oldText !== undefined || newText !== undefined
      ? [
          ...(oldText ?? "").split("\n").map((text) => ({ kind: "remove" as const, text })),
          ...(newText ?? "").split("\n").map((text) => ({ kind: "add" as const, text })),
        ]
      : content
        ? content.split("\n").map((text) => ({ kind: "add" as const, text }))
        : []

  if (lines.length === 0) return undefined

  return {
    file,
    lines,
    additions: lines.filter((line) => line.kind === "add").length,
    deletions: lines.filter((line) => line.kind === "remove").length,
  }
}
