// Spatial memory adapter: delegates to @spacegraphjs/kernel.

import {
  SPATIAL_MEMORY_PREFIX as KernelSpatialMemoryPrefix,
  type SpatialMemoryKey as KernelSpatialMemoryKey,
  type SpatialMemoryRecord as KernelSpatialMemoryRecord,
  type SpatialMemoryStore as KernelSpatialMemoryStore,
  type SpatialMemoryCamera as KernelSpatialMemoryCamera,
  graphContentHash as kernelGraphContentHash,
  spatialMemoryKey as kernelSpatialMemoryKey,
  readSpatialMemory as kernelReadSpatialMemory,
  writeSpatialMemory as kernelWriteSpatialMemory,
  decodeSpatialMemory as kernelDecodeSpatialMemory,
  clearSpatialMemory as kernelClearSpatialMemory,
  clearAllSpatialMemory as kernelClearAllSpatialMemory,
} from "@spacegraphjs/kernel";

// Re-export types
export type SpatialMemoryKey = KernelSpatialMemoryKey;
export type SpatialMemoryRecord = KernelSpatialMemoryRecord;
export type SpatialMemoryStore = KernelSpatialMemoryStore;
export type SpatialMemoryCamera = KernelSpatialMemoryCamera;

export const SPATIAL_MEMORY_PREFIX = KernelSpatialMemoryPrefix;

type HashableNode = {
  id: string;
  kind: string;
  turnID?: string;
  clusterOf?: string[];
};

type HashableModel = {
  root: string;
  nodes: readonly HashableNode[];
  turns?: readonly string[];
};

/**
 * A structural identity for the drawn map: the nodes, their kind, their turn, and their group.
 * Positions derive from those facts, so the hash changes exactly when a stored frame could be stale.
 * Streaming text does not change the hash: it does not change the geometry.
 * Delegates to @spacegraphjs/kernel.
 */
export function graphContentHash(model: HashableModel): string {
  return kernelGraphContentHash(model);
}

/** Build the storage key from parts. Delegates to @spacegraphjs/kernel. */
export function spatialMemoryKey(parts: SpatialMemoryKey): string {
  return kernelSpatialMemoryKey(parts);
}

/** Read a spatial memory record from storage. Delegates to @spacegraphjs/kernel. */
export function readSpatialMemory(
  store: SpatialMemoryStore,
  parts: SpatialMemoryKey,
): SpatialMemoryRecord | undefined {
  return kernelReadSpatialMemory(store, parts);
}

/** Write a spatial memory record to storage with LRU pruning. Delegates to @spacegraphjs/kernel. */
export function writeSpatialMemory(
  store: SpatialMemoryStore,
  parts: SpatialMemoryKey,
  record: SpatialMemoryRecord,
  maxEntries = 50,
): void {
  kernelWriteSpatialMemory(store, parts, record, maxEntries);
}

/** Clear spatial memory for a specific session/layout/level. Delegates to @spacegraphjs/kernel. */
export function clearSpatialMemory(
  store: SpatialMemoryStore,
  sessionKey: string,
  layout: string,
  level: string,
): void {
  kernelClearSpatialMemory(store, sessionKey, layout, level);
}

/** Clear all spatial memory for a session. Delegates to @spacegraphjs/kernel. */
export function clearAllSpatialMemory(store: SpatialMemoryStore, sessionKey: string): void {
  kernelClearAllSpatialMemory(store, sessionKey);
}

/** Decode a raw spatial memory string into a record. Delegates to @spacegraphjs/kernel. */
export function decodeSpatialMemory(raw: string): SpatialMemoryRecord | undefined {
  return kernelDecodeSpatialMemory(raw);
}