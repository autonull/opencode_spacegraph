import type { FileDiffInfo, WorkspaceSnapshot } from "@opencode/client/promise"
import { defineDeriver, inputToken, Kernel, pipe, runPipeline } from "@spacegraphjs/kernel"
import { GraphBuilder, WORKSPACE_STAGES, type WorkspaceStage } from "./session-builder"

const workspaceStageDeriver = (
  stage: WorkspaceStage,
  snapshot: WorkspaceSnapshot,
  diffByTurn?: Map<string, FileDiffInfo[]>,
) =>
  defineDeriver({
    name: `workspace:${stage}`,
    inputs: [inputToken<WorkspaceSnapshot>("workspace")],
    derive: (kernel) => GraphBuilder.buildWorkspaceStage(kernel, stage, snapshot, diffByTurn),
  })

export const workspaceDerivers = (
  snapshot: WorkspaceSnapshot,
  diffByTurn?: Map<string, FileDiffInfo[]>,
) => WORKSPACE_STAGES.map((stage) => workspaceStageDeriver(stage, snapshot, diffByTurn))

export function buildWorkspaceKernel(
  kernel: Kernel,
  snapshot: WorkspaceSnapshot,
  diffByTurn?: Map<string, FileDiffInfo[]>,
): Kernel {
  return runPipeline(workspaceDerivers(snapshot, diffByTurn), kernel, { workspace: snapshot })
}

export const workspaceDeriver = (
  snapshot: WorkspaceSnapshot,
  diffByTurn?: Map<string, FileDiffInfo[]>,
) => pipe(...workspaceDerivers(snapshot, diffByTurn))
