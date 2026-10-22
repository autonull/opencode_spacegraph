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
