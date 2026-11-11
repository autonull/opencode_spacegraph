import { describe, expect, it } from "bun:test"
import { buildFixtureGraph } from "./fixture"
import {
  clearSpatialMemory,
  decodeSpatialMemory,
  graphContentHash,
  readSpatialMemory,
  spatialMemoryKey,
  writeSpatialMemory,
  type SpatialMemoryRecord,
  type SpatialMemoryStore,
} from "./memory"

function memoryStore(): SpatialMemoryStore {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
    keys: () => [...values.keys()],
  }
}

const record: SpatialMemoryRecord = {
  positions: {
    session: [0, 0, 0],
    "turn:msg_user_1": [24, 8, 0],
  },
  selection: "turn:msg_user_1",
  camera: { zoom: 1.4, center: [24, 8, 0] },
  collapsedGroups: ["phase:turn:msg_user_1:verify:4"],
}

describe("spatial memory", () => {
  it("hashes structure, not streaming text", () => {
    const model = buildFixtureGraph()
    const sameStructure = {
      ...model,
      nodes: model.nodes.map((node) => ({ ...node, label: `${node.label} (streaming)` })),
    }

    expect(graphContentHash(sameStructure)).toBe(graphContentHash(model))
  })

  it("changes the hash when a turn gains a node", () => {
    const model = buildFixtureGraph()
    const changed = {
      ...model,
      nodes: [
        ...model.nodes,
        {
          id: "tool:new",
          kind: "tool" as const,
          label: "new tool",
          status: "success" as const,
          turnID: model.turns[0],
        },
      ],
    }

    expect(graphContentHash(changed)).not.toBe(graphContentHash(model))
  })

  it("restores the same frame only when session, layout, level and hash match", () => {
    const store = memoryStore()
    const model = buildFixtureGraph()
    const key = {
      sessionKey: "session",
      layout: "lanes",
      level: "execution",
      hash: graphContentHash(model),
    }

    writeSpatialMemory(store, key, record)

    expect(readSpatialMemory(store, key)).toEqual(record)
    expect(readSpatialMemory(store, { ...key, layout: "tree" })).toBeUndefined()
    expect(readSpatialMemory(store, { ...key, level: "overview" })).toBeUndefined()

    const changed = {
      ...model,
      nodes: model.nodes.filter((node) => node.id !== "tool:prt_tool_shell_1"),
    }
    const changedKey = { ...key, hash: graphContentHash(changed) }

    expect(changedKey.hash).not.toBe(key.hash)
    expect(readSpatialMemory(store, changedKey)).toBeUndefined()
  })

  it("clears every hash for one layout and level", () => {
    const store = memoryStore()
    const one = { sessionKey: "session", layout: "lanes", level: "execution", hash: "a" }
    const two = { ...one, hash: "b" }
    const otherLevel = { ...one, level: "overview" }

    writeSpatialMemory(store, one, record)
    writeSpatialMemory(store, two, record)
    writeSpatialMemory(store, otherLevel, record)

    clearSpatialMemory(store, "session", "lanes", "execution")

    expect(readSpatialMemory(store, one)).toBeUndefined()
    expect(readSpatialMemory(store, two)).toBeUndefined()
    expect(readSpatialMemory(store, otherLevel)).toEqual(record)
  })

  it("rejects a malformed or incomplete record", () => {
    expect(decodeSpatialMemory("not json")).toBeUndefined()
    expect(decodeSpatialMemory(JSON.stringify({ positions: { node: [1, 2] } }))).toBeUndefined()
    expect(decodeSpatialMemory(JSON.stringify({ positions: { node: [1, 2, 3] }, camera: { zoom: "1" } }))).toEqual({
      positions: { node: [1, 2, 3] },
      selection: undefined,
      camera: undefined,
      collapsedGroups: [],
    })
  })

  it("builds a key with the full content hash", () => {
    expect(spatialMemoryKey({ sessionKey: "ses_1", layout: "lanes", level: "detail", hash: "abc" })).toBe(
      "sessionGraph.spatialMemory.ses_1:lanes:detail:abc",
    )
  })
})
