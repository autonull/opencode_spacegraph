import { Schema } from "effect"
import { Plugin, Store } from "@opencode/plugin/gui"
import en from "./i18n/en"

const State = Schema.Struct({
  focused: Schema.optional(Schema.String),
})

export default Plugin.define({
  stores: {
    session: Store.session(State, {}),
  },
  i18n: { en },
})
