export * as ConfigExperimental from "./experimental.js"

import { Schema } from "effect"
import { NonNegativeInt, optional } from "../schema.js"
import { ConfigPolicy } from "./policy.js"

export class Info extends Schema.Class<Info>("ConfigExperimental.Info")({
  portable_shell_scanner: Schema.Boolean.pipe(optional).annotate({
    description: "Enable the experimental portable shell permission scanner. Defaults to false.",
  }),
  todo: Schema.Boolean.pipe(optional).annotate({
    description: "Enable the experimental todowrite tool. Defaults to false.",
  }),
  background_compaction: Schema.Boolean.pipe(optional).annotate({
    description: "Enable experimental background compaction. Defaults to false.",
  }),
  media_blob: Schema.Boolean.pipe(optional).annotate({
    description: "Store session media in deduplicated blob table. Defaults to false.",
  }),
  schedules: Schema.Boolean.pipe(optional).annotate({
    description: "Enable experimental scheduled tasks. Defaults to false.",
  }),
  artifacts: Schema.Boolean.pipe(optional).annotate({
    description: "Enable experimental artifacts backed by pluggable providers. Defaults to false.",
  }),
  console_watches: Schema.Boolean.pipe(optional).annotate({
    description: "Watch external events through OpenCode Console. Defaults to false.",
  }),
  mcp_events: Schema.Boolean.pipe(optional).annotate({
    description: "Enable experimental MCP Events extension. Defaults to false.",
  }),
  codemode_vm: Schema.Boolean.pipe(optional).annotate({
    description: "Run Code Mode on experimental bytecode VM. Defaults to false.",
  }),
  graph_cost_lens: Schema.Boolean.pipe(optional).annotate({
    description: "Enable cost/budget lens in graph. Defaults to false.",
  }),
  graph_palette: Schema.Boolean.pipe(optional).annotate({
    description: "Enable graph palette over nodes, actions, lenses, and surfaces. Defaults to false.",
  }),
  graph_attention: Schema.Boolean.pipe(optional).annotate({
    description: "Enable failure attention badges, toasts, and titlebar item. Defaults to false.",
  }),
  graph_layout_breadth: Schema.Boolean.pipe(optional).annotate({
    description: "Enable optional grid and circular graph layouts. Defaults to false.",
  }),
  graph_library_renderers: Schema.Boolean.pipe(optional).annotate({
    description: "Enable alternative renderer strategies. Defaults to false.",
  }),
  graph_time_travel: Schema.Boolean.pipe(optional).annotate({
    description: "Enable time travel scrubber through incremental builder snapshots. Defaults to false.",
  }),
  graph_compaction_advisor: Schema.Boolean.pipe(optional).annotate({
    description: "Enable compaction preview advisor. Defaults to false.",
  }),
  subagent_depth: NonNegativeInt.pipe(optional).annotate({
    description: "Maximum subagent nesting depth. Defaults to 1.",
  }),
  all_flags: Schema.Boolean.pipe(optional).annotate({
    description: "Enable all experimental feature flags. Defaults to false.",
  }),
  policies: ConfigPolicy.Info.pipe(Schema.Array, optional).annotate({
    description: "Deprecated: use top-level policies. Ordered policies controlling access to configured resources",
  }),
}) {}
