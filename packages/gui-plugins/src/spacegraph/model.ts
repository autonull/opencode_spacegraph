import type { MountedSession, SetupContext } from "@opencode/plugin/gui"
import type definition from "./index"

export function createSpacegraph(ctx: SetupContext<typeof definition>) {
  const store = (session: MountedSession) => ctx.stores.session(session)

  return {
    focused: (session: MountedSession) => store(session).value?.focused,
    focus: (session: MountedSession, id: string | undefined) => {
      store(session).update((draft) => {
        draft.focused = id
      })
    },
  }
}

export type SpacegraphModel = ReturnType<typeof createSpacegraph>
