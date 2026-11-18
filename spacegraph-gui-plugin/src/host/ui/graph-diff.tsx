import { diffTone, type CodeDiffSource } from "spacegraphjs/overlays"
import { For, Show, createEffect, createMemo } from "solid-js"

const TONE_CLASS = {
  header: "sg-diff__header",
  added: "sg-diff__added",
  removed: "sg-diff__removed",
  context: "sg-diff__context",
} as const

/** On-demand, selectable DOM patch text for one turn; the host supplies the loader when it has one. */
export function GraphDiffView(props: {
  from: string
  source?: CodeDiffSource
  label: string
  loadingLabel: string
}) {
  createEffect(() => {
    if (props.from) props.source?.load(props.from)
  })
  const diffs = createMemo(() => props.source?.get(props.from))

  return (
    <div class="sg-diff" data-slot="graph-inspector-diff">
      <div class="sg-diff__label">{props.label}</div>
      <Show when={diffs()} fallback={<div class="sg-diff__label">{props.loadingLabel}</div>}>
        {(list) => (
          <For each={list()}>
            {(diff) => (
              <div class="sg-diff__file" data-slot="graph-inspector-diff-file">
                <div class="sg-diff__file-head">
                  <span class="sg-diff__path" title={diff.file}>{diff.file}</span>
                  <span class="sg-diff__added">+{diff.additions}</span>
                  <span class="sg-diff__removed">-{diff.deletions}</span>
                </div>
                <pre class="sg-diff__patch">
                  <For each={diff.patch.split("\n")}>
                    {(line) => <div class={TONE_CLASS[diffTone(line) as keyof typeof TONE_CLASS]}>{line || " "}</div>}
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
