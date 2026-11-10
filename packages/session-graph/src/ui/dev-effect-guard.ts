import { createEffect, createSignal, createMemo, onCleanup, untrack, getOwner } from "solid-js"

// Use a simple global flag that can be set in tests
function isDevMode() {
  return typeof globalThis !== "undefined" && (globalThis as any).__SPACE_GRAPH_DEV__ === true
}

// Global set of signals currently being read by the active effect
const activeReadSignals = new Set<symbol>()
let activeEffectName: string | null = null

// Test helpers to manipulate internal state
export function __test__setActiveEffectName(name: string | null) {
  activeEffectName = name
}
export function __test__clearActiveReadSignals() {
  activeReadSignals.clear()
}
export function __test__getActiveReadSignals() {
  return activeReadSignals
}

/**
 * Development-only signal wrapper that tracks reads during effect execution.
 * In production, returns the standard createSignal result.
 */
export function createTrackedSignal<T>(value: T, name?: string): [() => T, (v: T) => T] {
  const [read, write] = createSignal(value)

  if (!isDevMode()) return [read, write]

  const signalId = Symbol(name || "signal")

  const trackedRead = () => {
    // If we're inside a guarded effect, register this signal as read
    if (activeEffectName !== null) {
      activeReadSignals.add(signalId)
    }
    return read()
  }

  const trackedWrite = (v: T | ((prev: T) => T)) => {
    // If we're inside a guarded effect and this signal was read, warn
    if (activeEffectName !== null && activeReadSignals.has(signalId)) {
      console.warn(
        `[dev-effect-guard] Effect "${activeEffectName}" wrote to signal "${name || "anonymous"}" ` +
          `that it read during this execution. This causes an infinite loop (F10/F3 pattern).`
      )
    }
    // Solid's write expects ((prev: T) => T) | Exclude<T, Function>
    // We need to cast to satisfy the type checker while preserving runtime behavior
    return write(v as ((prev: T) => T) | Exclude<T, Function>)
  }

  return [trackedRead, trackedWrite]
}

/**
 * Development-only effect wrapper that tracks signal reads and detects self-writes.
 * In production, this is the standard createEffect.
 */
export function createGuardedEffect(
  fn: () => void,
  value?: unknown,
  options?: { name?: string }
): void {
  if (!isDevMode()) {
    createEffect(fn, value, options)
    return
  }

  const name = options?.name || "anonymous effect"

  const guardedFn = () => {
    const prevEffectName = activeEffectName
    const prevReadSignals = new Set(activeReadSignals)

    activeEffectName = name
    activeReadSignals.clear()

    try {
      fn()
    } finally {
      activeEffectName = prevEffectName
      // Restore previous read signals (for nested effects)
      activeReadSignals.clear()
      for (const s of prevReadSignals) activeReadSignals.add(s)
    }
  }

  createEffect(guardedFn, value, options)
}

/**
 * Enable dev mode for testing.
 */
export function enableDevMode() {
  ;(globalThis as any).__SPACE_GRAPH_DEV__ = true
}

/**
 * Disable dev mode.
 */
export function disableDevMode() {
  ;(globalThis as any).__SPACE_GRAPH_DEV__ = false
}

/**
 * Re-exports for convenience - use these instead of solid-js imports in this package.
 */
export { createSignal, createMemo, onCleanup, untrack, getOwner }
export { createEffect } from "solid-js"