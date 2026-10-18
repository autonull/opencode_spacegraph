import type { GraphEdge, GraphModel, GraphNode, NodeKind } from "@opencode/session-ui/graph"
import { nodeByID, openInTranscript, why } from "@opencode/session-ui/graph"
import { IconButton } from "@opencode/ui/icon-button"
import { Icon } from "@opencode/ui/icon"
import { useI18n } from "@opencode/ui/context/i18n"
import { For, Show, createSignal } from "solid-js"

const KIND_KEY = {
  session: "ui.sessionGraph.kind.session",
  turn: "ui.sessionGraph.kind.turn",
  phase: "ui.sessionGraph.kind.phase",
  message: "ui.sessionGraph.kind.message",
  reasoning: "ui.sessionGraph.kind.reasoning",
  tool: "ui.sessionGraph.kind.tool",
  file: "ui.sessionGraph.kind.file",
  subagent: "ui.sessionGraph.kind.subagent",
  result: "ui.sessionGraph.kind.result",
  error: "ui.sessionGraph.kind.error",
  retry: "ui.sessionGraph.kind.retry",
  compaction: "ui.sessionGraph.kind.compaction",
  notice: "ui.sessionGraph.kind.notice",
  diff: "ui.sessionGraph.kind.diff",
  approval: "ui.sessionGraph.kind.approval",
} as const satisfies Record<NodeKind, string>

const STATUS_KEY = {
  pending: "ui.sessionGraph.status.pending",
  running: "ui.sessionGraph.status.running",
  success: "ui.sessionGraph.status.success",
  failed: "ui.sessionGraph.status.failed",
  interrupted: "ui.sessionGraph.status.interrupted",
  neutral: "ui.sessionGraph.status.neutral",
} as const satisfies Record<GraphNode["status"], string>

const CONFIDENCE_KEY = {
  explicit: "ui.sessionGraph.confidence.explicit",
  structural: "ui.sessionGraph.confidence.structural",
  inferred: "ui.sessionGraph.confidence.inferred",
} as const satisfies Record<GraphEdge["confidence"], string>

const STATUS_TONE: Record<GraphNode["status"], string> = {
  pending: "text-text-weak",
  running: "text-text-base",
  success: "text-text-on-success-base",
  failed: "text-text-on-critical-base",
  interrupted: "text-text-on-warning-base",
  neutral: "text-text-weak",
}

const text = (value: unknown) => (typeof value === "string" && value.length > 0 ? value : undefined)
const count = (value: unknown) => (typeof value === "number" ? value : undefined)
const flag = (value: unknown) => value === true
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [])

type Connection = { edge: GraphEdge; other: GraphNode; direction: "in" | "out" }

export type GraphInspectorProps = {
  model: GraphModel
  node?: GraphNode
  onSelect: (id: string) => void
  onOpenTranscript?: (id: string) => void
}

/**
 * Conventional detail panel (U3.10). All content is selectable DOM text, never drawn on the canvas,
 * so long tool output and errors stay readable. Detail is read back from the model, not the render
 * model; the renderer supplies structure only.
 */
export const GraphInspector = (props: GraphInspectorProps) => {
  const i18n = useI18n()
  const data = () => props.node?.data
  const [copied, setCopied] = createSignal(false)

  const copyOutput = async () => {
    const output = text(data()?.output)

    if (!output) return
    await navigator.clipboard?.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const connections = (): Connection[] => {
    const node = props.node
    if (!node) return []

    const relations = why(props.model, node.id)
    return [...relations.incoming, ...relations.outgoing].flatMap((edge): Connection[] => {
      const other = nodeByID(props.model, edge.source === node.id ? edge.target : edge.source)
      if (!other || other.id === node.id) return []
      return [{ edge, other, direction: edge.source === node.id ? "out" : "in" }]
    })
  }

  const time = (value: number | undefined) => (value === undefined ? undefined : new Date(value).toLocaleTimeString())

  const field = (label: string, value: string | number | undefined) => (
    <Show when={value !== undefined && value !== ""}>
      <div class="grid grid-cols-[7rem_1fr] gap-2" data-slot="graph-inspector-field">
        <dt class="text-12-regular text-text-weak">{label}</dt>
        <dd class="text-12-regular text-text-base break-words">{value}</dd>
      </div>
    </Show>
  )

  return (
    <aside
      data-component="session-graph-inspector"
      data-slot="graph-inspector"
      class="flex h-full w-full flex-col overflow-hidden border-l border-border-weaker-base"
      aria-label={i18n.t("ui.sessionGraph.inspector.title")}
    >
      <Show
        when={props.node}
        fallback={
          <div class="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
            <span class="text-14-regular text-text-weak">{i18n.t("ui.sessionGraph.inspector.empty")}</span>
            <span class="text-12-regular text-text-weaker">{i18n.t("ui.sessionGraph.inspector.emptyHint")}</span>
          </div>
        }
      >
        {(node) => (
          <div class="flex min-h-0 flex-1 flex-col">
            <header class="flex items-start gap-2 border-b border-border-weaker-base px-3 py-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-12-regular text-text-weaker">{i18n.t(KIND_KEY[node().kind])}</span>
                  <span class={`text-12-regular ${STATUS_TONE[node().status]}`}>
                    {i18n.t(STATUS_KEY[node().status])}
                  </span>
                </div>
                <h2 class="truncate text-14-medium text-text-strong" title={node().label}>
                  {node().label}
                </h2>
              </div>
              <Show when={props.onOpenTranscript && openInTranscript(props.model, node().id)}>
                <IconButton
                  size="small"
                  variant="ghost"
                  aria-label={i18n.t("ui.sessionGraph.inspector.openTranscript")}
                  title={i18n.t("ui.sessionGraph.inspector.openTranscript")}
                  onClick={() => props.onOpenTranscript?.(node().id)}
                  icon={<Icon name="outline-square-arrow" size="small" />}
                />
              </Show>
            </header>

            <div class="min-h-0 flex-1 overflow-y-auto px-3 py-2">
              <Show when={node().summary}>
                <p class="mb-3 whitespace-pre-wrap break-words text-12-regular text-text-base">{node().summary}</p>
              </Show>

              <dl class="flex flex-col gap-2">
                {field(i18n.t("ui.sessionGraph.inspector.time"), time(node().time))}
                {field(i18n.t("ui.sessionGraph.inspector.path"), text(data()?.path))}
                {field(i18n.t("ui.sessionGraph.inspector.agent"), text(data()?.agent))}
                {field(i18n.t("ui.sessionGraph.inspector.childSession"), text(data()?.childSessionID))}
                {field(i18n.t("ui.sessionGraph.inspector.attempt"), count(data()?.attempt))}
                {field(i18n.t("ui.sessionGraph.inspector.exit"), count(data()?.exit))}
              </dl>

              <Show when={flag(data()?.timeout)}>
                <div class="mt-2 grid grid-cols-[7rem_1fr] gap-2" data-slot="graph-inspector-field">
                  <dt class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.inspector.timeout")}</dt>
                  <dd class="text-12-regular text-text-base">{i18n.t("ui.sessionGraph.inspector.yes")}</dd>
                </div>
              </Show>

              <Show when={strings(data()?.files).length > 0}>
                <div class="mt-3">
                  <div class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.inspector.files")}</div>
                  <ul class="mt-1 flex flex-col gap-0.5">
                    <For each={strings(data()?.files)}>
                      {(file) => <li class="text-12-mono text-text-base break-all">{file}</li>}
                    </For>
                  </ul>
                </div>
              </Show>

              <Show when={data()?.input !== undefined}>
                <div class="mt-3">
                  <div class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.inspector.input")}</div>
                  <pre class="mt-1 max-h-64 overflow-auto rounded-sm bg-background-weak p-2 text-12-mono text-text-base">
                    {JSON.stringify(data()?.input, null, 2)}
                  </pre>
                </div>
              </Show>

              <Show when={text(data()?.output)}>
                {(output) => (
                  <div class="mt-3" data-slot="graph-inspector-output">
                    <div class="flex items-center justify-between">
                      <div class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.inspector.output")}</div>
                      <IconButton
                        size="small"
                        variant="ghost"
                        aria-label={i18n.t(copied() ? "ui.message.copied" : "ui.message.copy")}
                        title={i18n.t(copied() ? "ui.message.copied" : "ui.message.copy")}
                        onClick={copyOutput}
                        icon={<Icon name={copied() ? "check" : "outline-copy"} size="small" />}
                      />
                    </div>
                    <pre class="mt-1 max-h-64 overflow-auto rounded-sm bg-background-weak p-2 text-12-mono text-text-base whitespace-pre-wrap break-words">
                      {output()}
                    </pre>
                  </div>
                )}
              </Show>

              <div class="mt-4">
                <div class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.inspector.connections")}</div>
                <Show
                  when={connections().length > 0}
                  fallback={<div class="mt-1 text-12-regular text-text-weaker">{i18n.t("ui.sessionGraph.inspector.noConnections")}</div>}
                >
                  <ul class="mt-1 flex flex-col gap-1">
                    <For each={connections()}>
                      {(connection) => (
                        <li>
                          <button
                            type="button"
                            class="flex w-full items-center gap-2 rounded-sm px-1 py-0.5 text-left hover:bg-surface-base-hover"
                            aria-label={i18n.t("ui.sessionGraph.inspector.follow", { label: connection.other.label })}
                            onClick={() => props.onSelect(connection.other.id)}
                          >
                            <span class="text-12-regular text-text-weaker">{connection.edge.kind}</span>
                            <span class="min-w-0 flex-1 truncate text-12-regular text-text-base">{connection.other.label}</span>
                            <span class="text-12-regular text-text-weaker">{i18n.t(CONFIDENCE_KEY[connection.edge.confidence])}</span>
                          </button>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </div>
            </div>
          </div>
        )}
      </Show>
    </aside>
  )
}
