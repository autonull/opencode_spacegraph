import { createEffect, onCleanup } from "solid-js"
import type { Position } from "@opencode/session-ui/graph"
import { sessionID } from "./node-data"

/**
 * Persists and restores graph positions and selection per session.
 * Uses localStorage keyed by session ID and layout/level combination.
 */
export interface SpatialMemoryConfig {
  /** Get the current session's graph model to extract session ID. */
  model: () => { root: string; nodes: { id: string; data?: Record<string, unknown> }[] }
  /** Get current layout. */
  layout: () => string
  /** Get current zoom level. */
  level: () => string
  /** Get current positions from geometry. */
  positions: () => ReadonlyMap<string, Position> | undefined
  /** Get current selection. */
  selection: () => string | undefined
  /** Called when positions should be restored (after model/layout ready). */
  onRestore?: (positions: Record<string, [number, number, number]>, selection: string | undefined) => void
  /** Called when positions are saved. */
  onSave?: (positions: Record<string, [number, number, number]>, selection: string | undefined) => void
  /** Whether this instance owns the spatial memory (writes). Default true.
   *  Secondary instances (inline previews, popovers) should set to false to read but not write. */
  owner?: boolean
}

const STORAGE_PREFIX = "sessionGraph.spatialMemory."
const MAX_STORAGE_ENTRIES = 50

function getSessionKey(model: { root: string; nodes: { id: string; data?: Record<string, unknown> }[] }): string {
  const rootNode = model.nodes.find((n) => n.id === model.root)
  return rootNode ? sessionID(rootNode) ?? "unknown" : "unknown"
}

function getStorageKey(config: SpatialMemoryConfig): string {
  const sessionKey = getSessionKey(config.model())
  return `${STORAGE_PREFIX}${sessionKey}:${config.layout()}:${config.level()}`
}

function loadSpatialMemory(key: string): { positions: Record<string, [number, number, number]>; selection: string | undefined } | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    if (!parsed.positions || typeof parsed.positions !== "object") return null
    return {
      positions: parsed.positions,
      selection: parsed.selection,
    }
  } catch {
    return null
  }
}

function saveSpatialMemory(key: string, positions: Record<string, [number, number, number]>, selection: string | undefined): void {
  if (typeof window === "undefined") return
  try {
    // Prune old entries if we're at capacity
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX))
    if (keys.length >= MAX_STORAGE_ENTRIES) {
      // Remove oldest entries (by timestamp in value)
      const entries = keys
        .map((k) => {
          try {
            const v = JSON.parse(localStorage.getItem(k) ?? "{}")
            return { key: k, timestamp: v.timestamp ?? 0 }
          } catch {
            return { key: k, timestamp: 0 }
          }
        })
        .sort((a, b) => a.timestamp - b.timestamp)
      // Remove oldest 10%
      const toRemove = Math.ceil(keys.length * 0.1)
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        localStorage.removeItem(entries[i].key)
      }
    }

    localStorage.setItem(
      key,
      JSON.stringify({
        positions,
        selection,
        timestamp: Date.now(),
      })
    )
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

export function useSpatialMemory(config: SpatialMemoryConfig) {
  let restored = false
  const isOwner = config.owner ?? true

  // Restore positions when model/layout/level are ready
  createEffect(() => {
    if (restored) return

    const positions = config.positions()
    const model = config.model()
    const hasModel = model.nodes.length > 0

    if (hasModel && positions) {
      const key = getStorageKey(config)
      const memory = loadSpatialMemory(key)

      if (memory && Object.keys(memory.positions).length > 0) {
        config.onRestore?.(memory.positions, memory.selection)
        restored = true
      }
    }
  })

  // Save positions when they change (debounced) - only if owner
  let saveTimeout: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => {
    if (saveTimeout) clearTimeout(saveTimeout)
  })

  createEffect(() => {
    if (!isOwner) return

    const positions = config.positions()
    const selection = config.selection()

    if (!positions || positions.size === 0) return

    // Convert Map to Record
    const positionsRecord: Record<string, [number, number, number]> = {}
    for (const [id, pos] of positions) {
      positionsRecord[id] = [pos.x, pos.y, pos.z]
    }

    // Debounce saves
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      const key = getStorageKey(config)
      saveSpatialMemory(key, positionsRecord, selection)
      config.onSave?.(positionsRecord, selection)
    }, 1000)
  })
}

/**
 * Clears spatial memory for a specific session/layout/level.
 */
export function clearSpatialMemory(sessionKey: string, layout: string, level: string): void {
  if (typeof window === "undefined") return
  const key = `${STORAGE_PREFIX}${sessionKey}:${layout}:${level}`
  localStorage.removeItem(key)
}

/**
 * Clears all spatial memory for a session.
 */
export function clearAllSpatialMemory(sessionKey: string): void {
  if (typeof window === "undefined") return
  const prefix = `${STORAGE_PREFIX}${sessionKey}:`
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix))
  for (const key of keys) {
    localStorage.removeItem(key)
  }
}