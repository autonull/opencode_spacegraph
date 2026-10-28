import { describe, expect, test } from "bun:test"
import type { SessionRef, SessionSurface } from "@opencode/plugin/gui"
import {
  defaultSessionSurface,
  orderedSessionSurfaces,
  resolveSessionSurface,
  selectSessionSurface,
  sessionSurfaceID,
} from "./surfaces"

// SAFETY: the surface helpers read only the session key.
const session = (key: string) => ({ key }) as SessionRef
const surface = (id: string, order?: number): SessionSurface => ({
  id,
  title: id,
  order,
  render: (input) => input.transcript,
})

describe("session surfaces", () => {
  test("lists the host transcript first, then contributions by order", () => {
    const surfaces = orderedSessionSurfaces([surface("map", 2), surface("hybrid", 1)])

    expect(surfaces.map((item) => item.id)).toEqual(["transcript", "hybrid", "map"])
  })

  test("ignores a contributed surface that claims the host id", () => {
    expect(orderedSessionSurfaces([surface("transcript"), surface("map")]).map((item) => item.id)).toEqual([
      "transcript",
      "map",
    ])
  })

  test("falls back to the transcript when the selected surface is gone", () => {
    expect(resolveSessionSurface([defaultSessionSurface], "missing")).toBe(defaultSessionSurface)
  })

  test("keeps the selection per session", () => {
    const first = session("first")
    const second = session("second")

    expect(sessionSurfaceID(first)).toBe("transcript")

    selectSessionSurface("map", first)

    expect(sessionSurfaceID(first)).toBe("map")
    expect(sessionSurfaceID(second)).toBe("transcript")
  })
})
