import type { MountedSession, SetupContext } from "../sdk"
import type definition from "./index"

/**
 * The session map panel's state. It lives in the extension's session store, so each session keeps the
 * node the user last focused and a reopened panel restores it.
 */
export function createSessionMap(ctx: SetupContext<typeof definition>) {
  const store = (session: MountedSession) => ctx.stores.session(session)

  return {
    /** The node the user last focused in this session's map, or undefined until they act. Reactive. */
    focused: (session: MountedSession) => store(session).value?.focused,
    /** Records the node the user focused, so the panel keeps it while the transcript catches up. */
    focus: (session: MountedSession, id: string | undefined) => {
      store(session).update((draft) => {
        draft.focused = id
      })
    },
  }
}

export type SessionMapModel = ReturnType<typeof createSessionMap>
