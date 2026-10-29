import { Schema } from "effect"
import { Plugin, Store } from "@opencode/plugin/gui"
import { GRAPH_ARRANGEMENTS, GRAPH_SIDES, LAYOUTS, ZOOM_LEVELS } from "@opencode/session-ui/graph"
import en from "./i18n/en"

const DEPTH_MODES = ["flat", "layered", "depth-stack", "orbit"] as const

const Prefs = Schema.Struct({
  level: Schema.optional(Schema.Literals(ZOOM_LEVELS)),
  layout: Schema.optional(Schema.Literals(LAYOUTS)),
  depth: Schema.optional(Schema.Literals(DEPTH_MODES)),
  arrangement: Schema.optional(Schema.Literals(GRAPH_ARRANGEMENTS)),
  side: Schema.optional(Schema.Literals(GRAPH_SIDES)),
})

const State = Schema.Struct({
  focused: Schema.optional(Schema.String),
  level: Schema.optional(Schema.Literals(ZOOM_LEVELS)),
  layout: Schema.optional(Schema.Literals(LAYOUTS)),
  depth: Schema.optional(Schema.Literals(["flat", "layered", "depth-stack", "orbit"])),
  arrangement: Schema.optional(Schema.Literals(GRAPH_ARRANGEMENTS)),
  side: Schema.optional(Schema.Literals(GRAPH_SIDES)),
  turnMap: Schema.optional(Schema.Boolean),
  surface: Schema.optional(Schema.String),
})

export default Plugin.define({
  stores: {
    prefs: Store.global(Prefs, {}),
    session: Store.session(State, {}),
  },
  i18n: { en },
})
