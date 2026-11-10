/**
 * Known graph command names for the scoped event bus.
 * These correspond to the `graph:command` events dispatched on window.
 */
export type GraphCommandName =
  | "why"
  | "led-here"
  | "related"
  | "compare"
  | "note"
  | "find"
  | "facets"
  | "map"
  | "failureProgress"

/**
 * Checks if a string is a valid graph command name.
 */
export function isGraphCommandName(name: string): name is GraphCommandName {
  return [
    "why",
    "led-here",
    "related",
    "compare",
    "note",
    "find",
    "facets",
    "map",
    "failureProgress",
  ].includes(name)
}