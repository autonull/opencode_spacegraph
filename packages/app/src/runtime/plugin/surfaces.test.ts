import { expect, test } from "bun:test"
import type { SessionRef, SessionSurface } from "@opencode/plugin/gui"
import {
  orderedSessionSurfaces,
  resolveSessionSurface,
  selectSessionSurface,
  sessionSurfaceID,
  transcriptSurfaceID,
} from "./surfaces"

const session = (key: string) => ({ key }) as SessionRef
const surface = (id: string, order?: number): SessionSurface => ({ id, title: id, order, render: () => null })

test("lists the host transcript first, then contributed surfaces in order", () => {
  const all = orderedSessionSurfaces([surface("z", 2), surface("a", 1)], "Transcript")
  expect(all.map((item) => item.id)).toEqual(["transcript", "a", "z"])
  expect(all[0].title).toBe("Transcript")
})

test("ignores a contributed surface that claims the transcript id", () => {
  const all = orderedSessionSurfaces([surface("transcript", -1), surface("map", 0)], "Transcript")
  expect(all.map((item) => item.id)).toEqual(["transcript", "map"])
})

test("keeps each session's surface when another session routes or selects", () => {
  const first = session("server\nfirst")
  const second = session("server\nsecond")
  selectSessionSurface("map", first)
  expect(sessionSurfaceID(first)).toBe("map")
  expect(sessionSurfaceID(second)).toBe(transcriptSurfaceID)
  selectSessionSurface("other", second)
  expect(sessionSurfaceID(first)).toBe("map")
  expect(sessionSurfaceID(second)).toBe("other")
})

test("falls back to the transcript when the selected surface is gone", () => {
  const all = orderedSessionSurfaces([surface("map")], "Transcript")
  expect(resolveSessionSurface(all, "missing").id).toBe(transcriptSurfaceID)
  expect(resolveSessionSurface(all, "map").id).toBe("map")
})
