import { describe, expect, test } from "bun:test"
import type { RenderModel } from "@spacegraphjs/renderer"
import { canPatchRenderModel, modelUpdatePath } from "./model-apply"

const node = (id: string, position: [number, number, number] = [0, 0, 0]) => ({
  id,
  kind: "tool",
  shape: "card" as const,
  position,
})

const model = (nodes: ReturnType<typeof node>[], edges: { id: string }[] = []): RenderModel =>
  ({ nodes, edges }) as unknown as RenderModel

// M4 — streaming additions ride the renderer's incremental path. Anything that moves an existing
// node takes the full path instead, because the camera must not follow a patch.
describe("the model update path", () => {
  test("an append patches without a previous camera fit", () => {
    const prev = model([node("a"), node("b")])
    const next = model([node("a"), node("b"), node("c", [10, 10, 0])])

    expect(canPatchRenderModel(prev, next)).toBe(true)
    expect(modelUpdatePath(prev, next, true)).toBe("patch")
  })

  test("a moved node takes the full path", () => {
    const prev = model([node("a", [0, 0, 0])])
    const next = model([node("a", [5, 0, 0])])

    expect(canPatchRenderModel(prev, next)).toBe(false)
    expect(modelUpdatePath(prev, next, true)).toBe("set")
  })

  test("a removal takes the full path", () => {
    const prev = model([node("a"), node("b")])
    const next = model([node("a")])

    expect(canPatchRenderModel(prev, next)).toBe(false)
  })

  test("a changed kind or shape takes the full path", () => {
    const prev = model([node("a")])
    const next = model([{ ...node("a"), shape: "dot" as const }])

    expect(canPatchRenderModel(prev, next)).toBe(false)
  })

  test("a renderer without applyPatch and a cold mount take the full path", () => {
    const prev = model([node("a")])
    const next = model([node("a"), node("b")])

    expect(modelUpdatePath(null, next, true)).toBe("set")
    expect(modelUpdatePath(prev, next, false)).toBe("set")
  })
})
