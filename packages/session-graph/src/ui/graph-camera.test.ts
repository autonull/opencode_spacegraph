import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import type { GraphRenderer } from "@spacegraphjs/renderer"
import { createGraphCamera } from "./graph-camera"

const renderer = () => {
  const calls: string[] = []
  const instance = {
    focus: () => calls.push("focus"),
    setViewport: () => calls.push("setViewport"),
    fit: () => calls.push("fit"),
  } as unknown as GraphRenderer
  return { calls, instance }
}

const camera = (instance: GraphRenderer, reduced: boolean) =>
  createRoot((dispose) => {
    const value = createGraphCamera({
      renderer: () => instance,
      viewport: () => ({ zoom: 1, center: [0, 0, 0], extent: { width: 100, height: 100 }, band: "execution" }),
      capabilities: () => undefined,
      content: () => [],
      fit: () => ({ minScale: 1, insets: undefined }),
      positionOf: () => ({ x: 12, y: 34, z: 0 }),
      cardWidth: () => 100,
      cardWorldWidth: 100,
      readableWidth: 80,
      reducedMotion: () => reduced,
    })
    return { value, dispose }
  })

describe("graph camera reduced motion", () => {
  test("focus jumps with setViewport when the host asks for less motion", () => {
    const { calls, instance } = renderer()
    const { value, dispose } = camera(instance, true)

    value.focus("node")

    expect(calls).toEqual(["setViewport"])
    dispose()
  })

  test("focus glides through the renderer when motion is allowed", () => {
    const { calls, instance } = renderer()
    const { value, dispose } = camera(instance, false)

    value.focus("node")

    expect(calls).toEqual(["focus"])
    dispose()
  })
})
