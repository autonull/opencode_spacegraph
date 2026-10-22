import type { GraphEdge, GraphModel, GraphNode } from "@opencode/session-ui/graph"
import { nodeByID, openInTranscript, why } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { For, Show, createSignal, type JSX } from "solid-js"
import { GraphDiffView, type GraphDiffSource } from "./GraphDiff"
import { CONFIDENCE_KEY, KIND_KEY, STATUS_KEY } from "./vocabulary"
import { GraphIconButton } from "./GraphIconButton"
import { count, flag, strings, text } from "./node-data"

const STATUS_TONE: Record<GraphNode["status"], string> = {
  pending: "text-text-weak",
  running: "text-text-base",
  success: "text-text-on-success-base",
  failed: "text-text-on-critical-base",
  interrupted: "text-text-on-warning-base",
  neutral: "text-text-weak",
}

type Connection = { edge: GraphEdge; other: GraphNode; direction: "in" | "out" }

export type GraphDetailProps = {
  model: GraphModel
  node: GraphNode
  /** RF.8: host loader for a finished turn's changed-file diffs; when absent, diff nodes list paths only. */
  diffSource?: GraphDiffSource
  /** Optional host renderer for a node's summary (for example Markdown); falls back to plain text. */
  renderSummary?: (node: GraphNode) => JSX.Element | undefined
  /** T3.5: the shareable link to the selected node; the detail offers to copy it. */
  link?: string
  onSelect: (id: string) => void
  onOpenTranscript?: (id: string) => void
  /** T6.5: opens another session — the child of a delegation, the session a fork came from, or the parent of a child session. */
  onOpenSession?: (sessionID: string) => void
  /** T12: opens this node's detail in a durable window over the map. */
  onOpenWindow?: (node: GraphNode) => void
}

/**
 * The detail of a node, shared by the surfaces that show it: the side panel and the popover both
 * render the same body, so a node reads the same wherever the reader meets it. All content is
 * selectable DOM text, never drawn on the canvas, so long tool output and errors stay readable.
 */
export const GraphDetailHeader = (props: GraphDetailProps) => {
  const i18n = useI18n()
  const [copiedLink, setCopiedLink] = createSignal(false)

  const copyLink = async (link: string) => {
    await navigator.clipboard?.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  /**
   * T6.5 — the other session a node points at, if any: the child of a delegation, the session a
   * fork branched from, or the parent of a child session. The graph names the session; the host
   * opens it.
   */
  const sessionLink = () => {
    const node = props.node

    const child = text(node.data?.childSessionID)
    if (child) return { id: child, label: i18n.t("ui.sessionGraph.inspector.openChildSession") }

    const forked = text(node.data?.forkedFrom)
    if (forked) return { id: forked, label: i18n.t("ui.sessionGraph.inspector.openForkedSession") }

    const parent = text(node.data?.parentSessionID)
    if (parent) return { id: parent, label: i18n.t("ui.sessionGraph.inspector.openParentSession") }

    return undefined
  }

  return (
    <header class="flex items-start gap-2 border-b border-border-weaker-base px-3 py-2">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span class="text-12-regular text-text-weaker">{i18n.t(KIND_KEY[props.node.kind])}</span>
          <span class={`text-12-regular ${STATUS_TONE[props.node.status]}`}>
            {i18n.t(STATUS_KEY[props.node.status])}
          </span>
        </div>
        <h2 class="truncate text-14-medium text-text-strong" title={props.node.label}>
          {props.node.label}
        </h2>
      </div>
      <Show when={props.onOpenWindow}>
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.window.open")}
          icon="sidebar-right"
          onClick={() => props.onOpenWindow?.(props.node)}
        />
      </Show>
      <Show when={props.link}>
        {(link) => (
          <GraphIconButton
            label={i18n.t(copiedLink() ? "ui.message.copied" : "ui.sessionGraph.inspector.copyLink")}
            icon={copiedLink() ? "check" : "outline-copy"}
            onClick={() => copyLink(link())}
          />
        )}
      </Show>
      <Show when={props.onOpenTranscript && openInTranscript(props.model, props.node.id)}>
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.inspector.openTranscript")}
          icon="outline-square-arrow"
          onClick={() => props.onOpenTranscript?.(props.node.id)}
        />
      </Show>
      <Show when={props.onOpenSession && sessionLink()}>
        {(link) => (
          <GraphIconButton
            label={link().label}
            icon="outline-arrow-to-corner-top-right"
            onClick={() => props.onOpenSession?.(link().id)}
          />
        )}
      </Show>
    </header>
  )
}

export const GraphDetailBody = (props: GraphDetailProps) => {
  const i18n = useI18n()
  const data = () => props.node.data
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

    const relations = why(props.model, node.id)
    return [...relations.incoming, ...relations.outgoing].flatMap((edge): Connection[] => {
      const other = nodeByID(props.model, edge.source === node.id ? edge.target : edge.source)
      if (!other || other.id === node.id) return []
      return [{ edge, other, direction: edge.source === node.id ? "out" : "in" }]
    })
  }

  const time = (value: number | undefined) => (value === undefined ? undefined : new Date(value).toLocaleTimeString())

  /**
   * T6.5 — where a fork branched. A fork *before* a message leaves it out of this session; a fork
   * *through* it keeps it, so the label says which one it was.
   */
  const forkBoundaryLabel = () => {
    const type = data()?.forkBoundaryType

    if (type === "before") return i18n.t("ui.sessionGraph.inspector.forkedBefore")
    if (type === "through") return i18n.t("ui.sessionGraph.inspector.forkedThrough")

    return i18n.t("ui.sessionGraph.inspector.forkBoundary")
  }

  // A diff node's turn is `turn:${opener}`; the turn node carries the opening message id the host
  // turn-diff source keys on.
  const turnFrom = () => {
    const node = props.node
    if (!node?.turnID) return undefined

    return nodeByID(props.model, node.turnID)?.messageID
  }

  const field = (label: string, value: string | number | undefined) => (
    <Show when={value !== undefined && value !== ""}>
      <div class="grid grid-cols-[7rem_1fr] gap-2" data-slot="graph-inspector-field">
        <dt class="text-12-regular text-text-weak">{label}</dt>
        <dd class="text-12-regular text-text-base break-words">{value}</dd>
      </div>
    </Show>
  )

  return (
    <div class="min-h-0 flex-1 overflow-y-auto px-3 py-2">
      <Show when={props.node.summary}>
        <div class="mb-3">
          <Show
            when={props.renderSummary?.(props.node)}
            fallback={
              <p class="whitespace-pre-wrap break-words text-12-regular text-text-base">{props.node.summary}</p>
            }
          >
            {(rendered) => rendered()}
          </Show>
        </div>
      </Show>

      <dl class="flex flex-col gap-2">
        {field(i18n.t("ui.sessionGraph.inspector.time"), time(props.node.time))}
        {field(i18n.t("ui.sessionGraph.inspector.path"), text(data()?.path))}
        {field(i18n.t("ui.sessionGraph.inspector.agent"), text(data()?.agent))}
        {field(i18n.t("ui.sessionGraph.inspector.childSession"), text(data()?.childSessionID))}
        {field(i18n.t("ui.sessionGraph.inspector.forkedFrom"), text(data()?.forkedFrom))}
        {field(forkBoundaryLabel(), text(data()?.forkBoundary))}
        {field(i18n.t("ui.sessionGraph.inspector.parentSession"), text(data()?.parentSessionID))}
        {field(i18n.t("ui.sessionGraph.inspector.attempt"), count(data()?.attempt))}
        {field(i18n.t("ui.sessionGraph.inspector.exit"), count(data()?.exit))}
      </dl>

      <Show when={flag(data()?.replayed)}>
        <div class="mt-2 grid grid-cols-[7rem_1fr] gap-2" data-slot="graph-inspector-field">
          <dt class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.inspector.replayed")}</dt>
          <dd class="text-12-regular text-text-base">{i18n.t("ui.sessionGraph.inspector.replayedHint")}</dd>
        </div>
      </Show>

      <Show when={flag(data()?.timeout)}>
        <div class="mt-2 grid grid-cols-[7rem_1fr] gap-2" data-slot="graph-inspector-field">
          <dt class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.inspector.timeout")}</dt>
          <dd class="text-12-regular text-text-base">{i18n.t("ui.sessionGraph.inspector.yes")}</dd>
        </div>
      </Show>

      <Show when={props.node.kind === "diff" && props.diffSource ? turnFrom() : undefined}>
        {(from) => <GraphDiffView from={from()} source={props.diffSource} />}
      </Show>

      <Show when={strings(data()?.files).length > 0 && !(props.node.kind === "diff" && props.diffSource)}>
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
              <GraphIconButton
                label={i18n.t(copied() ? "ui.message.copied" : "ui.message.copy")}
                icon={copied() ? "check" : "outline-copy"}
                onClick={copyOutput}
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
  )
}

/**
 * The whole detail of a node: the header and the body together. Every surface that shows a node —
 * the side panel, the popover, a window over the map — reads this one, so a node reads the same
 * wherever the reader meets it and the surfaces cannot drift apart.
 */
export const GraphDetailSurface = (props: GraphDetailProps) => (
  <>
    <GraphDetailHeader {...props} />
    <GraphDetailBody {...props} />
  </>
)
