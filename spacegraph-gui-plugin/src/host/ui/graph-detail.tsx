import { createMemo, createSignal, For, Show, type JSX } from "solid-js"
import type { ActionSpec, GraphNode, GraphViewData } from "../../model"
import type { CodeDiffSource } from "spacegraphjs/overlays"
import { GraphDiffView } from "./graph-diff"
import {
  detailActions,
  detailConnections,
  detailFields,
  detailFileBadges,
  detailFiles,
  detailFileList,
  detailFlags,
  detailSessionLink,
  detailSubagentContribution,
  detailTurnFrom,
  filePath,
  fileRange,
  transcriptTarget,
  type DetailLabels,
} from "./detail-helpers"
import { text } from "./node-data"

export type DetailCopy = DetailLabels & {
  kind: (value: string) => string
  status: (value: string) => string
  confidence: (value: string) => string
  action: (labelKey: string) => string
  summary: string
  input: string
  output: string
  connections: string
  noConnections: string
  follow: (label: string) => string
  copy: string
  copied: string
  expand: string
  collapse: string
  configBadge: string
  docBadge: string
  activityRank: (rank: number) => string
  subagentContributions: string
  tools: string
  nodes: string
  openTranscript: string
  openAtRange: string
  openWindow: string
  diff: string
  diffLoading: string
  copyLink: string
  copyView: string
  noteEdit: string
  noteCopy: string
  noteDelete: string
  actions: string
  confirmCheckout: (branch: string) => string
  confirmStop: (process: string) => string
  traceActions: Array<{ id: string; label: string; onClick: (nodeID: string) => void }>
}

export type GraphDetailProps = {
  model: GraphViewData
  node: GraphNode
  copy: DetailCopy
  onSelect: (id: string) => void
  onOpenTranscript?: (messageID: string, partID?: string) => void
  onOpenWindow?: (node: GraphNode) => void
  onOpenSession?: (sessionID: string) => void
  onOpenFile?: (file: string) => void
  diffSource?: CodeDiffSource
  onActionNavigate?: (target: NonNullable<ActionSpec["target"]>) => void
  onActionReveal?: (target: NonNullable<ActionSpec["target"]>) => void
  onActionCopy?: (value: string) => void
  onActionRun?: (operation: NonNullable<ActionSpec["operation"]>) => void
  onNote?: (node: GraphNode, action: "edit" | "copy" | "delete") => void
}

function JSONDisplay(props: { data: unknown; copy: DetailCopy }) {
  const [expanded, setExpanded] = createSignal(false)
  const json = createMemo(() => JSON.stringify(props.data, null, 2))
  const isLong = createMemo(() => json().length > 500 || json().split("\n").length > 10)

  return (
    <pre class="sg-detail__json">
      {expanded() || !isLong() ? json() : `${json().split("\n").slice(0, 10).join("\n")}\n...`}
      <Show when={isLong()}>
        <button type="button" onClick={() => setExpanded(!expanded())}>
          {expanded() ? props.copy.collapse : props.copy.expand}
        </button>
      </Show>
    </pre>
  )
}

/** One node record as selectable DOM text, shared by the inspector window, the popover and the panel. */
export function GraphDetailSurface(props: GraphDetailProps) {
  const [copied, setCopied] = createSignal(false)
  const data = () => props.node.data
  const fields = createMemo(() => detailFields(props.model, props.node, Date.now(), props.copy))
  const connections = createMemo(() => detailConnections(props.model, props.node))
  const actions = createMemo(() => detailActions(props.model, props.node))
  const sessionLink = createMemo(() => detailSessionLink(props.node, props.copy))
  const turnFrom = createMemo(() => detailTurnFrom(props.model, props.node))

  const copyOutput = async () => {
    const output = text(data()?.output)
    if (!output) return
    await navigator.clipboard?.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAction = (action: ActionSpec) => {
    if (action.kind === "navigate" && action.target) props.onActionNavigate?.(action.target)
    if (action.kind === "reveal" && action.target) props.onActionReveal?.(action.target)
    if (action.kind === "copy" && action.target?.text) {
      void navigator.clipboard?.writeText(action.target.text)
      props.onActionCopy?.(action.target.text)
    }
    if (action.kind === "run" && action.operation) {
      const operation = action.operation
      if (operation.id === "vcs.checkout") {
        if (confirm(props.copy.confirmCheckout(String(operation.params.branch)))) props.onActionRun?.(operation)
      } else if (operation.id === "process.stop") {
        if (confirm(props.copy.confirmStop(String(operation.params.process)))) props.onActionRun?.(operation)
      } else props.onActionRun?.(operation)
    }
  }

  const actionButtons = (): JSX.Element[] => [
    ...actions().map((action) => (
      <button type="button" class="sg-detail__action" onClick={() => handleAction(action)}>
        {props.copy.action(action.labelKey)}
      </button>
    )),
    ...props.copy.traceActions.map((action) => (
      <button type="button" class="sg-detail__action" onClick={() => action.onClick(props.node.id)}>{action.label}</button>
    )),
  ]

  return (
    <div class="sg-detail" data-component="session-graph-detail">
      <header class="sg-detail__header">
        <div class="sg-detail__heading">
          <div class="sg-detail__meta">
            <span>{props.copy.kind(props.node.kind)}</span>
            <span>{props.copy.status(props.node.status)}</span>
          </div>
          <h2 title={props.node.label}>{props.node.label}</h2>
        </div>
        <Show when={props.onOpenWindow}>
          <button type="button" aria-label={props.copy.openWindow} onClick={() => props.onOpenWindow?.(props.node)}>↗</button>
        </Show>
        <Show when={sessionLink()}>
          {(link) => (
            <button type="button" aria-label={link().label} onClick={() => props.onOpenSession?.(link().id)}>↗</button>
          )}
        </Show>
        <Show when={props.onOpenTranscript && transcriptTarget(props.model, props.node)}>
          <button type="button" aria-label={props.copy.openTranscript} onClick={() => {
            const ref = transcriptTarget(props.model, props.node)
            if (ref?.messageID) props.onOpenTranscript?.(ref.messageID, ref.partID)
          }}>↗</button>
        </Show>
        <Show when={props.node.kind === "note"}>
          <button type="button" aria-label={props.copy.noteEdit} onClick={() => props.onNote?.(props.node, "edit")}>✎</button>
          <button type="button" aria-label={props.copy.noteCopy} onClick={() => props.onNote?.(props.node, "copy")}>⧉</button>
          <button type="button" aria-label={props.copy.noteDelete} onClick={() => props.onNote?.(props.node, "delete")}>✕</button>
        </Show>
      </header>

      <div class="sg-detail__body">
        <Show when={props.node.summary}><p class="sg-detail__summary">{props.node.summary}</p></Show>

        <dl class="sg-detail__fields">
          <For each={fields()}>{(field) => (
            <div data-slot="graph-inspector-field">
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          )}</For>
          <For each={detailFlags(props.node, props.copy)}>{(field) => (
            <div data-slot="graph-inspector-field"><dt>{field.label}</dt><dd>{field.value}</dd></div>
          )}</For>
        </dl>

        <Show when={props.node.kind === "file"}>
          {(() => {
            const badges = detailFileBadges(props.model, props.node)
            return (
              <div class="sg-detail__badges">
                <Show when={badges.config}><span>{props.copy.configBadge}</span></Show>
                <Show when={badges.doc}><span>{props.copy.docBadge}</span></Show>
                <Show when={badges.activity !== undefined}>
                  <span>{props.copy.activityRank(badges.activity!)}</span>
                </Show>
              </div>
            )
          })()}
        </Show>

        <Show when={props.node.kind === "directory"}>
          <div class="sg-detail__section">
            <div class="sg-detail__section-label">{props.copy.files}</div>
            <For each={detailFiles(props.model, props.node)}>{(file) => (
              <div class="sg-detail__file-row">
                <button type="button" onClick={() => props.onOpenFile?.(filePath(file) ?? file.label)}>{file.label}</button>
                <small>{fileRange(file) ? props.copy.openAtRange : ""}</small>
              </div>
            )}</For>
          </div>
        </Show>

        <Show when={props.node.kind === "subagent" && detailSubagentContribution(props.model, props.node)}>
          {(contribution) => (
            <div class="sg-detail__section">
              <div class="sg-detail__section-label">{props.copy.subagentContributions}</div>
              <dl class="sg-detail__fields">
                <div><dt>{props.copy.files}</dt><dd>{contribution().files}</dd></div>
                <div><dt>{props.copy.tools}</dt><dd>{contribution().tools}</dd></div>
                <div><dt>{props.copy.nodes}</dt><dd>{contribution().nodes}</dd></div>
              </dl>
            </div>
          )}
        </Show>

        <Show when={props.node.kind === "diff" && turnFrom()}>
          {(from) => <GraphDiffView from={from()} source={props.diffSource} label={props.copy.diff} loadingLabel={props.copy.diffLoading} />}
        </Show>

        <Show when={detailFileList(props.node).length > 0 && !(props.node.kind === "diff" && props.diffSource)}>
          <div class="sg-detail__section">
            <div class="sg-detail__section-label">{props.copy.files}</div>
            <For each={detailFileList(props.node)}>{(file) => <div class="sg-detail__mono">{file}</div>}</For>
          </div>
        </Show>

        <Show when={data()?.input !== undefined}>
          <div class="sg-detail__section">
            <div class="sg-detail__section-label">{props.copy.input}</div>
            <JSONDisplay data={data()?.input} copy={props.copy} />
          </div>
        </Show>

        <Show when={text(data()?.output)}>
          {(output) => (
            <div class="sg-detail__section" data-slot="graph-inspector-output">
              <div class="sg-detail__section-label">
                {props.copy.output}
                <button type="button" aria-label={copied() ? props.copy.copied : props.copy.copy} onClick={copyOutput}>
                  {copied() ? props.copy.copied : props.copy.copy}
                </button>
              </div>
              <pre class="sg-detail__mono">{output()}</pre>
            </div>
          )}
        </Show>

        <div class="sg-detail__section">
          <div class="sg-detail__section-label">{props.copy.connections}</div>
          <Show when={connections().length > 0} fallback={<div class="sg-detail__muted">{props.copy.noConnections}</div>}>
            <For each={connections()}>{(connection) => (
              <button type="button" class="sg-detail__connection" aria-label={props.copy.follow(connection.other.label)} onClick={() => props.onSelect(connection.other.id)}>
                <span>{connection.edge.kind}</span>
                <span class="sg-detail__connection-label">{connection.other.label}</span>
                <span>{props.copy.confidence(connection.edge.confidence)}</span>
              </button>
            )}</For>
          </Show>
        </div>

        <Show when={actionButtons().length > 0}>
          <div class="sg-detail__section" data-component="graph-detail-actions">
            <div class="sg-detail__section-label">{props.copy.actions}</div>
            <For each={actionButtons()}>{(action) => action}</For>
          </div>
        </Show>
      </div>
    </div>
  )
}
