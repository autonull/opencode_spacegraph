import { expect, test } from "bun:test"
import { buildFixtureGraph } from "../../model/fixture"
import { nodeByID } from "../../model"
import {
  detailActions,
  detailConnections,
  detailFields,
  detailFileBadges,
  detailFileList,
  detailFiles,
  detailFlags,
  detailSessionLink,
  detailSubagentContribution,
  detailTurnFrom,
  transcriptTarget,
} from "./detail-helpers"

const model = buildFixtureGraph()
const labels = {
  time: "Time", path: "Path", files: "Changed files", agent: "Agent", childSession: "Child session",
  forkedFrom: "Forked from", forkBoundary: "Forked at", forkedBefore: "Forked before",
  forkedThrough: "Forked through", parentSession: "Parent session", attempt: "Attempt",
  exit: "Exit code", source: "Source", replayed: "Context", replayedHint: "Replayed",
  timeout: "Timed out", yes: "Yes", openChildSession: "Open child session",
  openForkedSession: "Open fork source", openParentSession: "Open parent session",
}

test("detailConnections names the far end of incoming and outgoing edges", () => {
  const node = nodeByID(model, "tool:prt_tool_read_1")!
  const connections = detailConnections(model, node)
  expect(connections.length).toBeGreaterThan(0)
  expect(connections.every((connection) => connection.other.id !== node.id)).toBe(true)
  expect(connections.every((connection) => !!connection.edge.kind)).toBe(true)
})

test("detailFields keeps only populated values and uses the host's labels", () => {
  const file = nodeByID(model, "file:src/auth/session.ts")!
  const fields = detailFields(model, file, 1_700_000_000_000, labels)
  expect(fields.some((field) => field.label === labels.path && field.value === "src/auth/session.ts")).toBe(true)
  expect(fields.every((field) => field.value.length > 0)).toBe(true)
})

test("detailActions filters by capability and stays empty for an unknown capability", () => {
  const node = nodeByID(model, "session")!
  expect(Array.isArray(detailActions(model, node))).toBe(true)
  expect(detailActions(model, node, ["unknown.capability"])).toEqual([])
})

test("directory, file and subagent details derive from the model", () => {
  const file = nodeByID(model, "file:src/auth/session.ts")!
  expect(detailFileBadges(model, file).config).toBe(false)
  expect(detailFileList(file)).toEqual([])

  const subagent = nodeByID(model, "sub:ses_child_auth")!
  const contribution = detailSubagentContribution(model, subagent)
  expect(contribution && contribution.files >= 0).toBe(true)

  const directory = model.nodes.find((node) => node.kind === "directory")
  if (directory) expect(Array.isArray(detailFiles(model, directory))).toBe(true)
})

test("session links, turn source and transcript refs are derived, not stored", () => {
  const subagent = nodeByID(model, "sub:ses_child_auth")!
  expect(detailSessionLink(subagent, labels)?.id).toBe("ses_child_auth")

  const diffish = model.nodes.find((node) => node.turnID)
  if (diffish) expect(typeof detailTurnFrom(model, diffish)).toBe("string" || "undefined")

  expect(detailFlags(model.nodes[0], labels)).toEqual([])
  expect(transcriptTarget(model, nodeByID(model, "session")!)).toBeUndefined()
})
