import { Schema } from "effect"
import { Plugin, Store } from "@opencode/plugin/gui"
import { GRAPH_ARRANGEMENTS, GRAPH_SIDES, LAYOUT_STRATEGIES, ZOOM_LEVELS } from "@opencode/session-ui/graph"
import en from "./i18n/en"

const State = Schema.Struct({
  focused: Schema.optional(Schema.String),
  level: Schema.optional(Schema.Literals(ZOOM_LEVELS)),
  layout: Schema.optional(Schema.Literals(LAYOUT_STRATEGIES)),
  arrangement: Schema.optional(Schema.Literals(GRAPH_ARRANGEMENTS)),
  side: Schema.optional(Schema.Literals(GRAPH_SIDES)),
  turnMap: Schema.optional(Schema.Boolean),
  surface: Schema.optional(Schema.String),
})

export default Plugin.define({
  stores: {
    session: Store.session(State, {}),
  },
  i18n: { en },
})
