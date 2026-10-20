import { useI18n } from "@opencode/ui/context/i18n"
import { diffTone, type CodeDiff, type CodeDiffSource } from "spacegraphjs/overlays"
import { For, Show, createEffect, createMemo } from "solid-js"

/** One changed file of a finished turn, as reported by the host's turn-diff source. */
export type GraphDiff = CodeDiff

/**
 * Host-provided loader for a finished turn's changed-file diffs (RF.8). `from` is the turn's opening
 * message id; the source is already scoped to the current session, so the graph never holds a session id.
 */
export type GraphDiffSource = CodeDiffSource

// The tone of a unified-diff line comes from the library; the classes are the host's.
const TONE_CLASS = {
  header: "text-text-weaker",
  added: "text-text-on-success-base",
  removed: "text-text-on-critical-base",
  context: "text-text-base",
} as const

/**
 * The on-demand diff for one turn (RF.8). Loads through the host source when a diff node is inspected
 * and renders each file's unified patch as selectable DOM text, so the change is readable in the panel
 * without pulling the transcript's diff renderer into the graph chunk.
 */
export const GraphDiffView = (props: { from: string; source?: GraphDiffSource }) => {
  const i18n = useI18n()
  createEffect(() => {
    if (props.from) props.source?.load(props.from)
  })
  const diffs = createMemo(() => props.source?.get(props.from))

  return (
    <div class="mt-3" data-slot="graph-inspector-diff">
      <div class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.inspector.diff")}</div>
      <Show
        when={diffs()}
        fallback={<div class="mt-1 text-12-regular text-text-weaker">{i18n.t("ui.sessionGraph.inspector.diffLoading")}</div>}
      >
        {(list) => (
          <For each={list()}>
            {(diff) => (
              <div class="mt-2" data-slot="graph-inspector-diff-file">
                <div class="flex items-center gap-2">
                  <span class="min-w-0 flex-1 truncate text-12-mono text-text-base" title={diff.file}>
                    {diff.file}
                  </span>
                  <span class="text-12-regular text-text-on-success-base tabular-nums">+{diff.additions}</span>
                  <span class="text-12-regular text-text-on-critical-base tabular-nums">-{diff.deletions}</span>
                </div>
                <pre class="mt-1 max-h-64 overflow-auto rounded-sm bg-background-weak p-2 text-12-mono">
                  <For each={diff.patch.split("\n")}>
                    {(line) => <div class={TONE_CLASS[diffTone(line)]}>{line || " "}</div>}
                  </For>
                </pre>
              </div>
            )}
          </For>
        )}
      </Show>
    </div>
  )
}
