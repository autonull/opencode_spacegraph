import { createSignal, Show } from "solid-js"
import { TextInput } from "@opencode/ui/text-input"
import { Button } from "@opencode/ui/button"
import { useI18n } from "@opencode/ui/context/i18n"
import type { Composer } from "@opencode/plugin/gui"
import type { GraphNode } from "@opencode/session-ui/graph"
import "./composer-node-widget.css"

/**
 * ComposerNodeWidget - an interactive widget inside a graph node that allows
 * composing and sending prompts via the session's Composer.
 * 
 * Uses ctx.ui.TextInput + send action using Composer's insert action.
 * If send cannot be reached cleanly, falls back to read-only (attach context).
 */
export type ComposerNodeWidgetProps = {
  /** The graph node this widget is attached to */
  node: GraphNode
  /** The session's composer - provides text, insert, setText, attach, etc. */
  composer: Composer | undefined
  /** Whether the widget is in read-only mode (no send capability) */
  readOnly?: boolean
  /** Maximum height of the widget */
  maxHeight?: number
}

export const ComposerNodeWidget = (props: ComposerNodeWidgetProps) => {
  const i18n = useI18n()
  const [text, setText] = createSignal("")

  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    setText(target.value)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    const currentText = text().trim()
    if (!currentText) return

    if (props.composer && !props.readOnly) {
      // Insert the text into the composer
      props.composer.insert(currentText)
      // Focus the composer so the user can continue editing or send
      props.composer.focus()
      // Clear the widget's text
      setText("")
    }
  }

  const canSend = text().trim().length > 0 && !!props.composer && !props.readOnly

  return (
    <div class="composer-node-widget" data-max-height={props.maxHeight ?? 120}>
      <div class="composer-node-widget-input-wrapper">
        <TextInput
          type="text"
          value={text()}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={props.readOnly
            ? i18n.t("ui.sessionGraph.composerWidget.readOnlyPlaceholder")
            : i18n.t("ui.sessionGraph.composerWidget.placeholder")}
          appearance="small"
          surface="layer-1"
          leadingIcon={<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 2L3 7l5 5" /></svg>}
          data-slot="composer-node-widget-input"
        />
      </div>
      <Show when={!props.readOnly && canSend}>
        <div class="composer-node-widget-actions">
          <Button
            variant="submit"
            size="small"
            onClick={handleSend}
            disabled={!canSend}
            data-slot="composer-node-widget-send"
          >
            {i18n.t("ui.sessionGraph.composerWidget.send")}
          </Button>
        </div>
      </Show>
      <Show when={props.readOnly && props.composer}>
        <div class="composer-node-widget-readonly">
          <span class="text-12-regular text-text-weak" data-slot="composer-node-widget-readonly-label">
            {i18n.t("ui.sessionGraph.composerWidget.readOnlyLabel")}
          </span>
        </div>
      </Show>
      <Show when={!props.composer}>
        <div class="composer-node-widget-unavailable">
          <span class="text-12-regular text-text-weak" data-slot="composer-node-widget-unavailable-label">
            {i18n.t("ui.sessionGraph.composerWidget.unavailable")}
          </span>
        </div>
      </Show>
    </div>
  )
}