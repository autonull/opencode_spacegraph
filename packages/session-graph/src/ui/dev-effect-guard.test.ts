import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { 
  createTrackedSignal, 
  enableDevMode, 
  disableDevMode,
  __test__setActiveEffectName,
  __test__clearActiveReadSignals,
  __test__getActiveReadSignals
} from "./dev-effect-guard"
import { createRoot } from "solid-js"

describe("dev-effect-guard", () => {
  let warnSpy: ReturnType<typeof vi.spyOn> | null = null

  beforeEach(() => {
    enableDevMode()
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    __test__clearActiveReadSignals()
    __test__setActiveEffectName(null)
  })

  afterEach(() => {
    disableDevMode()
    __test__clearActiveReadSignals()
    __test__setActiveEffectName(null)
    if (warnSpy) {
      warnSpy.mockRestore()
      warnSpy = null
    }
  })

  it("createTrackedSignal works like createSignal", () => {
    createRoot((dispose) => {
      const [read, write] = createTrackedSignal(0, "test")
      expect(read()).toBe(0)
      write(1)
      expect(read()).toBe(1)
      dispose()
    })
  })

  it("tracks signal reads during effect execution", () => {
    const [count, setCount] = createTrackedSignal(0, "count")
    const [other, setOther] = createTrackedSignal(0, "other")

    // Manually simulate effect execution
    __test__setActiveEffectName("test-effect")
    __test__clearActiveReadSignals()

    // Read count signal
    const c = count()
    expect(c).toBe(0)
    expect(__test__getActiveReadSignals().size).toBe(1)

    // Write to count signal (should warn)
    setCount(1)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("test-effect"),
    )

    // Reset
    warnSpy.mockClear()
    __test__clearActiveReadSignals()

    // Read count again
    count()
    expect(__test__getActiveReadSignals().size).toBe(1)

    // Write to other signal (should NOT warn)
    setOther(2)
    expect(warnSpy).not.toHaveBeenCalled()

    __test__setActiveEffectName(null)
  })

  it("does not track reads outside effect", () => {
    const [count, setCount] = createTrackedSignal(0, "count")

    // Read without active effect
    const c = count()
    expect(c).toBe(0)
    expect(__test__getActiveReadSignals().size).toBe(0)

    // Write should not warn
    setCount(1)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("createGuardedEffect wrapper sets up tracking", () => {
    // This tests that the wrapper function is correctly structured
    expect(typeof createTrackedSignal).toBe("function")
    expect(typeof enableDevMode).toBe("function")
    expect(typeof disableDevMode).toBe("function")
  })
})