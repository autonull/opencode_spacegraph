import type { Kernel } from "@spacegraphjs/kernel"
import { runPipeline } from "@spacegraphjs/kernel"
import type { GraphModel } from "./model"
import { GraphBuilder, type BuildSessionInput } from "./session-builder"
import { toGraphView, type GraphViewMeta } from "./view"
import { workspaceDerivers } from "./workspace-derivers"

export type BuildGraphInput = BuildSessionInput | { kernel: Kernel; meta: GraphViewMeta }

export function buildGraph(input: BuildGraphInput): GraphModel {
  if ("kernel" in input) return toGraphView(input.kernel, input.meta)
  const builder = new GraphBuilder(
    input.messages,
    input.status,
    input.snapshot,
    input.sessionID,
    input.lineage,
  )
  const session = builder.buildKernel()
  const kernel = input.snapshot
    ? runPipeline(workspaceDerivers(input.snapshot, input.diffByTurn), session, {
        workspace: input.snapshot,
      })
    : session
  return toGraphView(kernel, builder.meta())
}

export { buildSessionKernel, type BuildSessionInput } from "./session-builder"
export { WORKSPACE_STAGES, type WorkspaceStage } from "./session-builder"
export { buildWorkspaceKernel, workspaceDeriver, workspaceDerivers } from "./workspace-derivers"
