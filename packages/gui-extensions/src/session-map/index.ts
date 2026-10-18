import { Schema } from "effect"
import { Extension, Store } from "../sdk"
import en from "./i18n/en"

/** The session map panel's own state, per session. */
const State = Schema.Struct({
  /** The map node the user last focused, kept across reopens; undefined until they act. */
  focused: Schema.optional(Schema.String),
})

export default Extension.define({
  id: "session-map",
  stores: {
    // Each session's map keeps the node the user last focused, so a reopened panel highlights it.
    session: Store.session(State, {}),
  },
  i18n: { en },
})
