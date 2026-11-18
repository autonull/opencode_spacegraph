import { describe, expect, it } from "bun:test"
import type { GraphNode } from "../../model"
import { diffPreview, terminalSnapshot, todoItems } from "./node-widget-data"

const node = (data: Record<string, unknown>): GraphNode => ({
  id: "node",
  kind: "tool",
  label: "node",
  status: "success",
  data: data as GraphNode["data"],
})

describe("node widget data", () => {
  it("reads todos and falls back to pending for unknown statuses", () => {
    expect(
      todoItems(
        node({
          input: {
            todos: [
              { content: "write plan", status: "completed" },
              { content: "run tests", status: "strange" },
              { status: "pending" },
            ],
          },
        }),
      ),
    ).toEqual([
      { content: "write plan", status: "completed" },
      { content: "run tests", status: "pending" },
    ])
  })

  it("reads a terminal snapshot only when output is present", () => {
    expect(terminalSnapshot(node({}))).toBeUndefined()
    expect(
      terminalSnapshot(node({ output: "ok\n", exit: 2, timeout: true, truncated: true })),
    ).toEqual({ output: "ok\n", exit: 2, timeout: true, truncated: true })
  })

  it("parses a patch into diff lines with counts", () => {
    const preview = diffPreview(
      node({
        input: {
          filePath: "src/auth.ts",
          patch: "--- a/src/auth.ts\n+++ b/src/auth.ts\n@@ -1,2 +1,2 @@\n-old\n+new\n same",
        },
      }),
    )
    expect(preview?.file).toBe("src/auth.ts")
    expect(preview?.additions).toBe(1)
    expect(preview?.deletions).toBe(1)
    expect(preview?.lines.map((line) => line.kind)).toEqual(["context", "remove", "add", "context"])
  })

  it("falls back to old/new strings when there is no patch", () => {
    const preview = diffPreview(node({ input: { path: "a.txt", oldString: "old", newString: "new" } }))
    expect(preview?.file).toBe("a.txt")
    expect(preview?.lines).toEqual([
      { kind: "remove", text: "old" },
      { kind: "add", text: "new" },
    ])
  })
})
