import { createEffect, onCleanup } from "solid-js"
import {
  graphContentHash,
  readSpatialMemory,
  writeSpatialMemory,
  type Position,
  type SpatialMemoryCamera,
  type SpatialMemoryRecord,
  type SpatialMemoryStore,
} from "@opencode/session-ui/graph"
import { sessionID } from "./node-data"

/**
 * Persists and restores graph positions, selection, camera, and collapsed groups per session.
 * The key carries a structural content hash, so a changed session never restores a stale frame.
 */
export interface SpatialMemoryConfig {
  /** Get the current session's graph model to extract session ID and content hash. */
  model: () => {
    root: string
    nodes: { id: string; kind: string; turnID?: string; clusterOf?: string[]; data?: Record<string, unknown> }[]
    turns?: readonly string[]
  }
  /** Get current layout. */
  layout: () => string
  /** Get current zoom level. */
  level: () => string
  /** Get current positions from geometry. */
  positions: () => ReadonlyMap<string, Position> | undefined
  /** Get current selection. */
  selection: () => string | undefined
  /** Get the renderer's current viewport, when it has reported one. */
  camera?: () => SpatialMemoryCamera | undefined
  /** Get the groups the reader collapsed. */
  collapsedGroups?: () => ReadonlySet<string>
  /** Called when a stored frame matches the current session structure. */
  onRestore?: (record: SpatialMemoryRecord) => void
  /** Called when a frame is saved. */
  onSave?: (record: SpatialMemoryRecord) => void
  /** Whether this instance owns the spatial memory (writes). Default true.
   *  Secondary instances (inline previews, popovers) read but do not write. */
  owner?: boolean
}

const SAVE_DEBOUNCE_MS = 1000

export function useSpatialMemory(config: SpatialMemoryConfig) {
  let restored = false
  let saveTimeout: ReturnType<typeof setTimeout> | undefined
  const isOwner = config.owner ?? true

  createEffect(() => {
    if (restored) return

    const model = config.model()
    const positions = config.positions()
    if (model.nodes.length === 0 || !positions) return

    // The first complete model is the one a stored frame belongs to. Do not let a later streaming
    // model match an older key and restore over the map that is already on screen.
    restored = true

    const store = memoryStore()
    if (!store) return

    const record = readSpatialMemory(store, memoryParts(model, config))
    if (record) config.onRestore?.(record)
  })

  createEffect(() => {
    if (!isOwner) return

    const positions = config.positions()
    if (!positions || positions.size === 0) return

    // Track the cheap values every frame; serialize the map and hash only after the reader rests.
    config.selection()
    config.camera?.()
    config.collapsedGroups?.()

    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      saveTimeout = undefined
      const current = config.positions()
      if (!current || current.size === 0) return

      const record: SpatialMemoryRecord = {
        positions: Object.fromEntries(
          [...current].map(([id, point]) => [id, [point.x, point.y, point.z] as [number, number, number]]),
        ),
        selection: config.selection(),
        camera: config.camera?.(),
        collapsedGroups: [...(config.collapsedGroups?.() ?? [])],
      }
      const store = memoryStore()
      if (!store) return
      writeSpatialMemory(store, memoryParts(config.model(), config), record)
      config.onSave?.(record)
    }, SAVE_DEBOUNCE_MS)
  })

  onCleanup(() => {
    if (saveTimeout) clearTimeout(saveTimeout)
  })
}

function memoryParts(
  model: ReturnType<SpatialMemoryConfig["model"]>,
  config: SpatialMemoryConfig,
) {
  return {
    sessionKey: getSessionKey(model),
    layout: config.layout(),
    level: config.level(),
    hash: graphContentHash(model),
  }
}

function getSessionKey(model: { root: string; nodes: { id: string; data?: Record<string, unknown> }[] }): string {
  const rootNode = model.nodes.find((node) => node.id === model.root)
  return rootNode ? sessionID(rootNode) ?? "unknown" : "unknown"
}

function memoryStore(): SpatialMemoryStore | undefined {
  if (typeof window === "undefined") return undefined

  try {
    const storage = window.localStorage
    return {
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => storage.setItem(key, value),
      removeItem: (key) => storage.removeItem(key),
      keys: () => Object.keys(storage),
    }
  } catch {
    return undefined
  }
}
