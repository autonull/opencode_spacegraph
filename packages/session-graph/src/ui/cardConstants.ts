import type { NodeKind, PhaseCategory } from "@opencode/session-ui/graph"

/** The SVG path for each node kind's glyph. */
export const GLYPH: Record<NodeKind, string> = {
  session: "M8 1.5 9.9 6l4.6.3-3.6 2.9 1.2 4.4L8 11.2 3.9 13.6l1.2-4.4L1.5 6.3 6.1 6z",
  turn: "M4 3l8 5-8 5z",
  phase: "M2 4h12M2 8h12M2 12h12",
  message: "M2 3h12v8H6l-4 3z",
  reasoning: "M8 1.5a4 4 0 0 0-2.5 7.1V11h5V8.6A4 4 0 0 0 8 1.5zM6 12.5h4v2H6z",
  tool: "M9.5 2.5a3 3 0 0 0-4 4L2 10v2l2 2 3.5-3.5a3 3 0 0 0 4-4l-1.8 1.8-1.7-1.7z",
  file: "M4 1.5h5l3 3v10H4zM9 1.5V5h3",
  directory: "M2 3h4l1.5 2H14v8H2z",
  subagent: "M5.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM2 13.5c0-2 1.6-3.5 3.5-3.5S9 11.5 9 13.5M11 7.5a1.6 1.6 0 1 0 0-3.2",
  result: "M3 8.5 6.5 12 13 4",
  error: "M8 2 1.5 13.5h13zM8 6v4M8 11.5v.5",
  retry: "M13 8a5 5 0 1 1-1.5-3.5M13 2v3h-3",
  compaction: "M2 4h12M4 8h8M6 12h4",
  notice: "M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM8 7.5v4M8 4.5v.5",
  diff: "M4 2v12M12 2v12M4 5h4M4 10h4M9 13.5 12 13.5M10.5 12v3M9 2.5l3 0M10.5 1v3",
  // T19-T26 derived kinds
  package: "M2 3h12v5H2zM6 3v5M10 3v5",
  commit: "M6 3v10M6 6h8M14 10v3M14 3v3",
  branch: "M4 1.5 8 6 4 10.5M8 6h8",
  symbol: "M8 2a4 4 0 0 1 4 4v4M12 14v3M2 10v3M8 6v8",
  test: "M8 2a6 6 0 0 1 6 6v3M2 8v3M8 14v3M14 8a6 6 0 0 1-6 6",
  "test-run": "M3 8.5 6.5 12 13 4",
  process: "M4 1.5h8v10H4zM8 1.5V5h4",
  port: "M4 4v8M12 4v8M4 8h8M8 12v3M8 1v3",
  issue: "M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM8 7.5v4M8 4.5v.5M8 12.5v.5",
  note: "M3 2h10v12l-3-2-3 2-3-2zM6 5h4M6 8h4",
}

/** A small stack glyph for phase/group nodes to indicate they contain members. */
export const GLYPH_GROUP = "M3 13.5V4.5M6 12.5V3.5M9 11.5V2.5M12 10.5V1.5"

/** The accent a phase category carries. Every category has one, so the legend cannot drift. */
export const CATEGORY_HUE: Record<PhaseCategory, number> = {
  explore: 210,
  edit: 145,
  verify: 38,
  delegate: 275,
  result: 196,
}

/** The accent a kind carries when it does not belong to a phase. Every kind has one. */
export const KIND_HUE: Record<NodeKind, number> = {
  session: 265,
  turn: 220,
  message: 220,
  reasoning: 300,
  subagent: 275,
  file: 190,
  directory: 45,
  result: 196,
  diff: 160,
  error: 0,
  retry: 28,
  notice: 220,
  compaction: 220,
  phase: 210,
  tool: 210,
  // T19-T26 derived kinds
  package: 45,
  commit: 28,
  branch: 28,
  symbol: 190,
  test: 38,
  "test-run": 38,
  process: 210,
  port: 210,
  issue: 0,
  note: 265,
}

/** The kinds that use monospace font for their labels. */
export const MONO_KINDS = new Set<NodeKind>(["tool", "file", "diff"])