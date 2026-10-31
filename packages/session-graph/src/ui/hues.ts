import type { NodeKind, PhaseCategory } from "@opencode/session-ui/graph"

/** Semantic hue values for graph accents. Used with HSL saturation/lightness to create colors. */

export const HUES = {
  /** Session root — deep violet */
  session: 265,
  /** Turn boundary — soft blue */
  turn: 220,
  /** User/assistant message — soft blue */
  message: 220,
  /** Assistant reasoning — purple */
  reasoning: 300,
  /** Subagent delegation — magenta */
  subagent: 275,
  /** File provenance — teal */
  file: 190,
  /** Directory — muted orange */
  directory: 45,
  /** Tool result — cyan */
  result: 196,
  /** File diff — orange */
  diff: 160,
  /** Error — red */
  error: 0,
  /** Retry/backtrack — orange-red */
  retry: 28,
  /** Completion notice — soft blue */
  notice: 220,
  /** Context compaction — soft blue */
  compaction: 220,
  /** Phase cluster (default) — cyan */
  phase: 210,
  /** Tool call (default) — cyan */
  tool: 210,
  /** Package — muted orange */
  package: 45,
  /** Commit — orange-red */
  commit: 28,
  /** Branch — orange-red */
  branch: 28,
  /** Symbol — teal */
  symbol: 190,
  /** Test — green */
  test: 38,
  /** Test run — green */
  "test-run": 38,
  /** Process — cyan */
  process: 210,
  /** Port — cyan */
  port: 210,
  /** Issue — red */
  issue: 0,
  /** Note — deep violet */
  note: 265,
} as const satisfies Record<NodeKind, number>

export const CATEGORY_HUES = {
  /** Exploration (read, search) — cyan */
  explore: 210,
  /** Editing (write, edit) — green */
  edit: 145,
  /** Verification (test, lint, shell) — green */
  verify: 38,
  /** Delegation (subagent, task) — magenta */
  delegate: 275,
  /** Result output — cyan */
  result: 196,
} as const satisfies Record<PhaseCategory, number>

export type HueName = keyof typeof HUES
export type CategoryHueName = keyof typeof CATEGORY_HUES