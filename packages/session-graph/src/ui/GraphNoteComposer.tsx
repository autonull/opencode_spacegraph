import { useI18n } from "@opencode/ui/context/i18n"
import { createSignal, onMount, Show } from "solid-js"
import { GraphIconButton } from "./GraphIconButton"

export const NOTE_WIDTH = 280

export type GraphNoteComposerProps = {
  /** The node the note is attached to; the composer names it so the reader knows the anchor. */
  targetLabel: string
  initialValue?: string
  anchor?: { x: number; y: number }
  onSave: (body: string) => void
  onClose: () => void
}

/** C1 — the map's first write path. A note is text attached to a node; saving appends a node. */
export const GraphNoteComposer = (props: GraphNoteComposerProps) => {
  const i18n = useI18n()
  const [value, setValue] = createSignal(props.initialValue ?? "")
  let input!: HTMLTextAreaElement

  onMount(() => input.focus())

  const save = () => {
    const body = value().trim()
    if (!body) return
    props.onSave(body)
  }

  return (
    <div
      data-component="session-graph-note-composer"
      data-slot="graph-note-composer"
      role="dialog"
      aria-label={i18n.t("ui.sessionGraph.note.compose")}
      class="absolute z-30 flex flex-col gap-2 rounded-md border border-border-weaker-base bg-surface-base p-2 shadow-lg"
      style={{
        width: `${NOTE_WIDTH}px`,
        left: `${props.anchor?.x ?? 12}px`,
        top: `${props.anchor?.y ?? 12}px`,
      }}
    >
      <div class="flex items-center gap-2 text-12-regular text-text-weak">
        <span class="truncate">{i18n.t("ui.sessionGraph.note.attach", { target: props.targetLabel })}</span>
      </div>
      <textarea
        ref={input}
        data-slot="graph-note-input"
        value={value()}
        rows="4"
        class="w-full resize-none rounded-sm border border-border-weaker-base bg-surface-base px-2 py-1 text-12-regular text-text-base outline-none placeholder:text-text-weaker"
        placeholder={i18n.t("ui.sessionGraph.note.placeholder")}
        onInput={(event) => setValue(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation()
            props.onClose()
            return
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            save()
          }
        }}
      />
      <div class="flex items-center justify-end gap-1">
        <Show when={props.initialValue !== undefined}>
          <GraphIconButton
            label={i18n.t("ui.sessionGraph.note.delete")}
            icon="trash"
            onClick={() => props.onSave("")}
          />
        </Show>
        <button
          type="button"
          data-slot="graph-note-cancel"
          class="rounded-sm px-2 py-1 text-12-regular text-text-weak hover:bg-surface-base-hover"
          onClick={() => props.onClose()}
        >
          {i18n.t("ui.sessionGraph.note.cancel")}
        </button>
        <button
          type="button"
          data-slot="graph-note-save"
          class="rounded-sm bg-surface-base px-2 py-1 text-12-regular text-text-strong hover:bg-surface-base-hover disabled:opacity-50"
          disabled={value().trim().length === 0}
          onClick={save}
        >
          {i18n.t("ui.sessionGraph.note.save")}
        </button>
      </div>
    </div>
  )
}
