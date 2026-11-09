import type { Kernel } from "@spacegraphjs/kernel"
import { runPipeline } from "@spacegraphjs/kernel"
import type { GraphViewData } from "./model"
import { GraphBuilder, type BuildSessionInput } from "./session-builder"
import { IncrementalGraphBuilder, type IncrementalBuilderState } from "./incremental-builder"
import { toGraphView, type GraphViewMeta } from "./view"
import { workspaceDerivers } from "./workspace-derivers"

export type BuildGraphInput = BuildSessionInput | { kernel: Kernel; meta: GraphViewMeta }

export interface IncrementalBuildGraphInput extends BuildSessionInput {
  previousState?: IncrementalBuilderState
}

export function buildGraph(input: BuildGraphInput): GraphViewData {
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

export function buildGraphIncremental(input: IncrementalBuildGraphInput): { graph: GraphViewData; state: IncrementalBuilderState } {
  const builder = new IncrementalGraphBuilder(
    input.messages,
    input.status,
    input.snapshot,
    input.sessionID,
    input.lineage,
    input.diffByTurn,
    input.previousState,
  )
  const kernel = builder.buildKernel()

  const finalKernel = input.snapshot
    ? runPipeline(workspaceDerivers(input.snapshot, input.diffByTurn), kernel, {
        workspace: input.snapshot,
      })
    : kernel
  return {
    graph: toGraphView(finalKernel, builder.meta()),
    state: builder.getState(),
  }
}

export { buildSessionKernel, type BuildSessionInput } from "./session-builder"
export { WORKSPACE_STAGES, type WorkspaceStage } from "./session-builder"
export { buildWorkspaceKernel, workspaceDeriver, workspaceDerivers } from "./workspace-derivers"
export { IncrementalGraphBuilder, type IncrementalBuilderState } from "./incremental-builder"
