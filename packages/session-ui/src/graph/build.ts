import type { Kernel } from "@spacegraphjs/kernel"
import type { GraphViewData } from "./model"
import { GraphBuilder, type BuildSessionInput } from "./session-builder"
import { toGraphView, type GraphViewMeta } from "./view"

export type BuildGraphInput = BuildSessionInput | { kernel: Kernel; meta: GraphViewMeta }

export function buildGraph(input: BuildGraphInput): GraphViewData {
  if ("kernel" in input) return toGraphView(input.kernel, input.meta)
  const builder = new GraphBuilder(
    input.messages,
    input.status,
    input.sessionID,
    input.lineage,
  )
  const session = builder.buildKernel()
  return toGraphView(session, builder.meta())
}

export { buildSessionKernel, type BuildSessionInput } from "./session-builder"
