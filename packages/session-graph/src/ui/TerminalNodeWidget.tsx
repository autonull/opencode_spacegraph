import { createMemo, createSignal, onCleanup, Show } from "solid-js"
import { useI18n } from "@opencode/ui/context/i18n"
import type { GraphNode } from "@opencode/session-ui/graph"
import { terminalSnapshot } from "./node-widget-data"
import "./node-widgets.css"

/** A read-only terminal snapshot for a shell result node. */
export type TerminalNodeWidgetProps = {
  node: GraphNode
}

const PREVIEW_LINES = 6

export const TerminalNodeWidget = (props: TerminalNodeWidgetProps) => {
  const i18n = useI18n()
  const [open, setOpen] = createSignal(false)
  const [copied, setCopied] = createSignal(false)
  let copyTimer: ReturnType<typeof setTimeout> | undefined

  onCleanup(() => {
    if (copyTimer) clearTimeout(copyTimer)
  })

  const snapshot = createMemo(() => terminalSnapshot(props.node))
  const lines = createMemo(() => snapshot()?.output.split("\n") ?? [])
  const output = createMemo(() => {
    const value = snapshot()
    if (!value) return ""
    return open() ? value.output : lines().slice(0, PREVIEW_LINES).join("\n")
  })
  const status = createMemo(() => {
    const value = snapshot()
    if (!value) return undefined
    if (value.timeout) return i18n.t("ui.sessionGraph.widgets.terminal.timeout")
    if (value.exit !== undefined && value.exit !== 0)
      return i18n.t("ui.sessionGraph.widgets.terminal.exit", { code: value.exit })
    return i18n.t("ui.sessionGraph.widgets.terminal.ok")
  })

  const copy = () => {
    const value = snapshot()
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) return
    void navigator.clipboard.writeText(value.output).then(() => {
      setCopied(true)
      copyTimer = setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div
      class="node-widget"
      data-slot="terminal-node-widget"
      role="group"
      aria-label={i18n.t("ui.sessionGraph.widgets.terminal.label")}
    >
      <div class="node-widget-header">
        <span class="node-widget-title">{i18n.t("ui.sessionGraph.widgets.terminal.title")}</span>
        <Show when={status()}>
          <span class="node-widget-meta">{status()}</span>
        </Show>
        <Show when={snapshot()}>
          <button
            type="button"
            class="node-widget-action"
            data-slot="terminal-node-widget-copy"
            aria-label={i18n.t("ui.sessionGraph.widgets.terminal.copy")}
            onClick={copy}
          >
            {copied()
              ? i18n.t("ui.sessionGraph.widgets.copied")
              : i18n.t("ui.sessionGraph.widgets.copy")}
          </button>
        </Show>
        <button
          type="button"
          class="node-widget-toggle"
          data-slot="terminal-node-widget-toggle"
          aria-expanded={open()}
          aria-label={i18n.t(
            open() ? "ui.sessionGraph.widgets.collapse" : "ui.sessionGraph.widgets.expand",
          )}
          onClick={() => setOpen((value) => !value)}
        >
          {open() ? "−" : "+"}
        </button>
      </div>
      <Show
        when={snapshot()}
        fallback={<span class="node-widget-empty">{i18n.t("ui.sessionGraph.widgets.terminal.empty")}</span>}
      >
        <pre class="node-widget-output" data-slot="terminal-node-widget-output">
          {output()}
          <Show when={!open() && lines().length > PREVIEW_LINES}>{"\n…"}</Show>
        </pre>
        <Show when={snapshot()?.truncated}>
          <span class="node-widget-meta">{i18n.t("ui.sessionGraph.widgets.terminal.truncated")}</span>
        </Show>
      </Show>
    </div>
  )
}
