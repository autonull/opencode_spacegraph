/**
 * A node's `data` is untyped JSON: the model records what it knows and the host reads it back.
 * These readers are the one place that knows how to read it, so the card and the inspector cannot
 * disagree about what a field holds.
 */

/** A non-empty string, or nothing. */
export const text = (value: unknown) => (typeof value === "string" && value.length > 0 ? value : undefined)

/** A number, or nothing. */
export const count = (value: unknown) => (typeof value === "number" ? value : undefined)

/** A flag that is on. */
export const flag = (value: unknown) => value === true

/** The strings in a list, dropping everything that is not one. */
export const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []

/** A note node's data: the annotation id and its target node id. */
export const noteData = (node: { data?: Record<string, unknown> }): { noteID: string; target: string } | undefined => {
  const noteID = typeof node.data?.noteID === "string" ? node.data.noteID : undefined
  const target = typeof node.data?.target === "string" ? node.data.target : undefined
  return noteID && target ? { noteID, target } : undefined
}

/** A directory node's file count from its data. */
export const fileCount = (node: { data?: Record<string, unknown> }): number =>
  typeof node.data?.fileCount === "number" ? node.data.fileCount : 0

/** A directory node's touched file count from its data. */
export const touchedCount = (node: { data?: Record<string, unknown> }): number =>
  typeof node.data?.touchedCount === "number" ? node.data.touchedCount : 0

/** A file node's touched status from its data. */
export const isTouched = (node: { data?: Record<string, unknown> }): boolean => node.data?.touched === true

/** A session node's child session ID from its data. */
export const childSessionID = (node: { data?: Record<string, unknown> }): string | undefined =>
  typeof node.data?.childSessionID === "string" ? node.data.childSessionID : undefined

/** A session node's forked-from session ID from its data. */
export const forkedFrom = (node: { data?: Record<string, unknown> }): string | undefined =>
  typeof node.data?.forkedFrom === "string" ? node.data.forkedFrom : undefined

/** A session node's parent session ID from its data. */
export const parentSessionID = (node: { data?: Record<string, unknown> }): string | undefined =>
  typeof node.data?.parentSessionID === "string" ? node.data.parentSessionID : undefined
