import { expect, test } from "bun:test"
import type { Layout } from "@opencode/session-ui/graph"
import { graphPermalinkFromHash, graphPermalinkHash, type GraphPermalink } from "./graph-permalink"

const read: [string, GraphPermalink | undefined][] = [
  ["#graph:turn:msg_user_1", { nodeID: "turn:msg_user_1" }],
  ["#graph:file:src/auth/token.ts", { nodeID: "file:src/auth/token.ts" }],
  ["#graph:ribbon:turn:msg_user_1", { nodeID: "turn:msg_user_1", layout: "ribbon" }],
  ["#graph:matrix:file:src/auth/token.ts", { nodeID: "file:src/auth/token.ts", layout: "matrix" }],
  // A node id never starts with a layout name, so the split is unambiguous in both directions.
  ["#graph:lanes:turn:msg_user_1", { nodeID: "turn:msg_user_1", layout: "lanes" }],
  // The old links named a representation, and "graph" was its default: the lanes layout now.
  ["#graph:graph:turn:msg_user_1", { nodeID: "turn:msg_user_1", layout: "lanes" }],
  ["#graph:session", { nodeID: "session" }],
  // Not a graph permalink.
  ["#message-msg_user_1", undefined],
  ["#graph:", undefined],
  ["#graph", undefined],
  ["", undefined],
]

test.each(read)("reads the permalink from %s", (hash, permalink) => {
  expect(graphPermalinkFromHash(hash)).toEqual(permalink)
})

const written: [GraphPermalink, string][] = [
  [{ nodeID: "turn:msg_user_1" }, "#graph:turn:msg_user_1"],
  [{ nodeID: "turn:msg_user_1", layout: "ribbon" }, "#graph:ribbon:turn:msg_user_1"],
  [{ nodeID: "turn:msg_user_1", layout: "lanes" }, "#graph:turn:msg_user_1"],
]

test.each(written)("writes the permalink for %o", (permalink, hash) => {
  expect(graphPermalinkHash(permalink)).toBe(hash)
})

test("a written permalink reads back as the same node", () => {
  const permalink: GraphPermalink = { nodeID: "file:src/auth/token.ts", layout: "matrix" }

  expect(graphPermalinkFromHash(graphPermalinkHash(permalink))).toEqual(permalink)
})

test("a layout survives the round trip", () => {
  const layout: Layout = "ribbon"
  const hash = graphPermalinkHash({ nodeID: "turn:msg_user_1", layout })

  expect(graphPermalinkFromHash(hash)?.layout).toBe(layout)
})
