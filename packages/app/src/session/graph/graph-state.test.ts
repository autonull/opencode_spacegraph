import { expect, test } from "bun:test"
import { Schema } from "effect"
import { sessionGraphSchema, type SessionGraphState } from "./graph-state"

const decode = Schema.decodeUnknownSync(sessionGraphSchema)

test("every field round-trips when explicitly provided", () => {
  const input: SessionGraphState = {
    map: true,
    sideBySide: true,
    arrangement: "side",
    arrangementSide: "end",
    split: 0.7,
    logTextScale: 1.5,
    pane: { x: 100, y: 200, width: 400, height: 300 },
    projection: "3d",
    renderer: "cytoscape",
    selected: "tool:prt_tool_read_1",
    layout: "ribbon",
    minimap: true,
    files: true,
    depth: "layered",
    detailMode: "popover",
    detailFraming: "card",
    peek: true,
    turnMap: "turn:msg_user_1",
    rules: [
      { id: "rule-1", kind: "error", status: "active", scale: 1.2, hue: 0, muted: false, fadeAfter: 5000 },
      { id: "rule-2", kind: "warning", status: "inactive", scale: 0.8, hue: 30, muted: true, fadeAfter: 10000 },
    ],
    windows: [
      { id: "win-1", kind: "node", nodeID: "file:src/auth/token.ts", left: 10, top: 20, width: 300, height: 400, z: 1, pinned: true },
      { id: "win-2", kind: "diff", left: 50, top: 60, width: 500, height: 600, z: 2, pinned: false },
    ],
    followLog: true,
  }

  const result = decode(input)
  expect(result).toEqual(input)
})

test("absent optional fields get migration defaults for map/sideBySide", () => {
  // The migration fold provides defaults for map/sideBySide when no legacy fields present
  const input = { selected: "file:src/auth/token.ts" }
  const result = decode(input)

  expect(result.selected).toBe("file:src/auth/token.ts")
  expect(result.map).toBe(false) // migration default
  expect(result.sideBySide).toBe(false) // migration default
  expect(Object.hasOwn(result, "arrangement")).toBe(false)
  expect(result.layout).toBeUndefined() // present but undefined
  expect(Object.hasOwn(result, "detailMode")).toBe(false)
  expect(Object.hasOwn(result, "rules")).toBe(false) // Persistence.optional array
  expect(Object.hasOwn(result, "windows")).toBe(false) // Persistence.optional array
})

test("legacy migration: hybrid mode maps to map+sideBySide", () => {
  const legacyInput = { mode: "hybrid" }
  const result = decode(legacyInput)
  expect(result.map).toBe(true)
  expect(result.sideBySide).toBe(true)
})

test("legacy migration: graph mode maps to map only", () => {
  const legacyInput = { mode: "graph" }
  const result = decode(legacyInput)
  expect(result.map).toBe(true)
  expect(result.sideBySide).toBe(false)
})

test("legacy migration: representation overrides layout when layout not provided", () => {
  const legacyInput = { representation: "matrix" }
  const result = decode(legacyInput)
  expect(result.layout).toBe("matrix")
})

test("legacy migration: explicit layout wins over representation", () => {
  const legacyInput = { representation: "matrix", layout: "lanes" }
  const result = decode(legacyInput)
  expect(result.layout).toBe("lanes") // explicit layout wins
})

test("legacy migration: arrangement not defaulted by migration", () => {
  const legacyInput = { mode: "hybrid" }
  const result = decode(legacyInput)
  expect(Object.hasOwn(result, "arrangement")).toBe(false)
})

test("two session keys decoded independently", () => {
  const sessionA = decode({ selected: "file:a.ts", layout: "lanes" })
  const sessionB = decode({ selected: "file:b.ts", layout: "ribbon" })

  expect(sessionA.selected).toBe("file:a.ts")
  expect(sessionA.layout).toBe("lanes")
  expect(sessionB.selected).toBe("file:b.ts")
  expect(sessionB.layout).toBe("ribbon")
})

test("empty object gets migration defaults for map/sideBySide", () => {
  const result = decode({})

  // Migration provides defaults for these
  expect(result.map).toBe(false)
  expect(result.sideBySide).toBe(false)
  expect(result.layout).toBeUndefined()
  // Other Schema.optional fields are absent
  expect(Object.hasOwn(result, "arrangement")).toBe(false)
  expect(Object.hasOwn(result, "arrangementSide")).toBe(false)
  expect(Object.hasOwn(result, "split")).toBe(false)
  expect(Object.hasOwn(result, "logTextScale")).toBe(false)
  expect(Object.hasOwn(result, "pane")).toBe(false)
  expect(Object.hasOwn(result, "projection")).toBe(false)
  expect(Object.hasOwn(result, "renderer")).toBe(false)
  expect(Object.hasOwn(result, "selected")).toBe(false)
  expect(Object.hasOwn(result, "minimap")).toBe(false)
  expect(Object.hasOwn(result, "files")).toBe(false)
  expect(Object.hasOwn(result, "depth")).toBe(false)
  expect(Object.hasOwn(result, "detailMode")).toBe(false)
  expect(Object.hasOwn(result, "detailFraming")).toBe(false)
  expect(Object.hasOwn(result, "peek")).toBe(false)
  expect(Object.hasOwn(result, "turnMap")).toBe(false)
  // Persistence.optional arrays are absent
  expect(Object.hasOwn(result, "rules")).toBe(false)
  expect(Object.hasOwn(result, "windows")).toBe(false)
  expect(Object.hasOwn(result, "followLog")).toBe(false)
})

test("partial input merges only provided fields (plus migration defaults)", () => {
  const input = { map: true, layout: "matrix" as const }
  const result = decode(input)

  expect(result.map).toBe(true)
  expect(result.layout).toBe("matrix")
  expect(result.sideBySide).toBe(false) // migration default
  expect(Object.hasOwn(result, "arrangement")).toBe(false)
  expect(Object.hasOwn(result, "detailMode")).toBe(false)
})

test("null values for optional object fields are silently ignored", () => {
  // The schema's optional object field just ignores null
  const input = { selected: "tool:prt_tool_read_1", pane: null }
  const result = decode(input)
  expect(result.selected).toBe("tool:prt_tool_read_1")
  expect(Object.hasOwn(result, "pane")).toBe(false)
})

test("windows array validates each window", () => {
  const input = {
    windows: [
      { id: "win-1", kind: "node", nodeID: "file:src/auth/token.ts", left: 10, top: 20, width: 300, height: 400, z: 1, pinned: true },
      { id: "win-2", kind: "node", left: 50, top: 60, width: 500, height: 600, z: 2 },
    ],
  }
  const result = decode(input)

  expect(result.windows).toBeDefined()
  if (!result.windows) return
  expect(result.windows).toHaveLength(2)
  expect(result.windows[0].pinned).toBe(true)
  expect(result.windows[1].pinned).toBeUndefined()
})

test("rules array validates each rule", () => {
  const input = {
    rules: [
      { id: "rule-1", kind: "error", status: "active", scale: 1.2, hue: 0, muted: false, fadeAfter: 5000 },
      { id: "rule-2", kind: "warning" },
    ],
  }
  const result = decode(input)

  expect(result.rules).toBeDefined()
  if (!result.rules) return
  expect(result.rules).toHaveLength(2)
  expect(result.rules[0].kind).toBe("error")
  expect(result.rules[1].kind).toBe("warning")
  expect(result.rules[1].status).toBeUndefined()
})

test("invalid arrangement value is rejected", () => {
  const input = { arrangement: "invalid" as any }
  expect(() => decode(input)).toThrow()
})

test("invalid layout value is rejected", () => {
  const input = { layout: "invalid" as any }
  expect(() => decode(input)).toThrow()
})

test("invalid projection value is rejected", () => {
  const input = { projection: "invalid" as any }
  expect(() => decode(input)).toThrow()
})