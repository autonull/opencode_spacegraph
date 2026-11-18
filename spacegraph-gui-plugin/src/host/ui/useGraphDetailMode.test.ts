import { expect, test } from "bun:test"
import { createGraphDetailMode } from "./useGraphDetailMode"

function capture() {
  const calls: string[] = []
  return {
    calls,
    changes: createGraphDetailMode({
      setDetailMode: (mode) => calls.push(`setDetailMode:${mode}`),
      setDepth: (depth) => calls.push(`setDepth:${depth}`),
      setLayout: (layout) => calls.push(`setLayout:${layout}`),
      setPopoverDismissed: (dismissed) => calls.push(`dismissed:${dismissed}`),
      onDetailModeChange: (mode) => calls.push(`onDetailMode:${mode}`),
      onDepthChange: (depth) => calls.push(`onDepth:${depth}`),
      onLayoutChange: (layout) => calls.push(`onLayout:${layout}`),
    }),
  }
}

test("changing detail mode dismisses the popover and notifies the listener", () => {
  const { calls, changes } = capture()
  changes.changeDetailMode("panel")
  expect(calls).toEqual(["setDetailMode:panel", "dismissed:false", "onDetailMode:panel"])
})

test("changing depth sets the depth and notifies the listener", () => {
  const { calls, changes } = capture()
  changes.changeDepth("orbit")
  expect(calls).toEqual(["setDepth:orbit", "onDepth:orbit"])
})

test("changing layout sets the layout and notifies the listener", () => {
  const { calls, changes } = capture()
  changes.changeLayout("hierarchy")
  expect(calls).toEqual(["setLayout:hierarchy", "onLayout:hierarchy"])
})

test("change callbacks are optional", () => {
  const calls: string[] = []
  const changes = createGraphDetailMode({
    setDetailMode: () => calls.push("detail"),
    setDepth: () => calls.push("depth"),
    setLayout: () => calls.push("layout"),
    setPopoverDismissed: () => calls.push("dismiss"),
  })
  changes.changeDetailMode("popover")
  changes.changeDepth("flat")
  changes.changeLayout("lanes")
  expect(calls).toEqual(["detail", "dismiss", "depth", "layout"])
})
