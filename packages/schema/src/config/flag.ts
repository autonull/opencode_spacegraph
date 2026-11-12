export * as ConfigFlag from "./flag.js"

/** The `OPENCODE_FLAGS` entry that turns every flag on, as in `all,-media_blob`. It is not a flag key. */
export const wildcard = "all"

/**
 * Every feature flag, by key, with what it turns on. A flag is on in local and dev builds and off in released ones;
 * `experimental.<key>` in config and `OPENCODE_FLAGS` override that, and `OPENCODE_FLAGS=all` or
 * `experimental.all_flags: true` turn every flag on. Read one with Core's `Flag.enabled("<key>")`.
 *
 * Graduated (always on): graph_surface_transcript, graph_node_widgets, graph_inline_preview, graph_multi_surface
 */
export const registry = {
  todo: "Enable the experimental todowrite tool.",
  background_compaction:
    "Enable experimental background compaction: summarize the conversation in the background as it nears the compaction threshold, so automatic compaction does not wait for the summary. Background summaries that are never used still cost tokens.",
  media_blob: "Store new session media once in a deduplicated blob table instead of inline in every message row.",
  schedules: "Enable experimental scheduled tasks that wake a session with a prompt.",
  artifacts: "Enable experimental artifacts backed by pluggable providers.",
  codemode_vm: "Run the Code Mode execute tool on the experimental bytecode VM instead of the legacy interpreter.",
  graph_cost_lens: "Enable cost/budget lens.",
  graph_trust_lens: "Enable trust lens (highlight unverified writes).",
  graph_palette: "Enable the graph palette over nodes, actions, lenses, and surfaces.",
  graph_attention: "Enable failure attention badges, toasts, and the titlebar item.",
  graph_layout_breadth: "Enable optional grid and circular graph layouts.",
  graph_library_renderers: "Enable alternative renderer strategies (Cytoscape, etc.).",
  graph_time_travel: "Enable time travel scrubber through incremental builder snapshots.",
  graph_compaction_advisor: "Enable compaction preview advisor.",
} as const satisfies Record<string, string>
export type Key = keyof typeof registry
