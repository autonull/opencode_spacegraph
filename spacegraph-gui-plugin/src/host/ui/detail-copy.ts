import type { DetailCopy } from "./graph-detail"

type Translate = (key: string, params?: Record<string, string | number | boolean>) => string

export type DetailCopyOptions = {
  traceKind?: string | null
  onTrace?: (kind: "why" | "led-here" | "related" | "downstream", id: string) => void
  onClearTrace?: () => void
  onCopyTraceOutline?: (nodeID: string) => void
}

/** Builds the detail's copy from the plugin catalog, including the model-owned vocabulary keys. */
export function createDetailCopy(t: Translate, options: DetailCopyOptions = {}): DetailCopy {
  const copy: DetailCopy = {
    kind: (value) => t(`ui.sessionGraph.kind.${value}`),
    status: (value) => t(`ui.sessionGraph.status.${value}`),
    confidence: (value) => t(`ui.sessionGraph.confidence.${value}`),
    action: (labelKey) => t(labelKey),
    time: t("ui.sessionGraph.inspector.time"),
    path: t("ui.sessionGraph.inspector.path"),
    files: t("ui.sessionGraph.inspector.files"),
    agent: t("ui.sessionGraph.inspector.agent"),
    childSession: t("ui.sessionGraph.inspector.childSession"),
    forkedFrom: t("ui.sessionGraph.inspector.forkedFrom"),
    forkBoundary: t("ui.sessionGraph.inspector.forkBoundary"),
    forkedBefore: t("ui.sessionGraph.inspector.forkedBefore"),
    forkedThrough: t("ui.sessionGraph.inspector.forkedThrough"),
    parentSession: t("ui.sessionGraph.inspector.parentSession"),
    attempt: t("ui.sessionGraph.inspector.attempt"),
    exit: t("ui.sessionGraph.inspector.exit"),
    source: t("ui.sessionGraph.inspector.source"),
    replayed: t("ui.sessionGraph.inspector.replayed"),
    replayedHint: t("ui.sessionGraph.inspector.replayedHint"),
    timeout: t("ui.sessionGraph.inspector.timeout"),
    yes: t("ui.sessionGraph.inspector.yes"),
    openChildSession: t("ui.sessionGraph.inspector.openChildSession"),
    openForkedSession: t("ui.sessionGraph.inspector.openForkedSession"),
    openParentSession: t("ui.sessionGraph.inspector.openParentSession"),
    summary: t("ui.sessionGraph.inspector.summary"),
    input: t("ui.sessionGraph.inspector.input"),
    output: t("ui.sessionGraph.inspector.output"),
    connections: t("ui.sessionGraph.inspector.connections"),
    noConnections: t("ui.sessionGraph.inspector.noConnections"),
    follow: (label) => t("ui.sessionGraph.inspector.follow", { label }),
    copy: t("ui.message.copy"),
    copied: t("ui.message.copied"),
    expand: t("ui.sessionGraph.inspector.expand"),
    collapse: t("ui.sessionGraph.inspector.collapse"),
    configBadge: t("ui.sessionGraph.inspector.configBadge"),
    docBadge: t("ui.sessionGraph.inspector.docBadge"),
    activityRank: (rank) => t("ui.sessionGraph.inspector.activityRank", { rank }),
    subagentContributions: t("ui.sessionGraph.inspector.subagentContributions"),
    tools: t("ui.sessionGraph.inspector.tools"),
    nodes: t("ui.sessionGraph.inspector.nodes"),
    openTranscript: t("ui.sessionGraph.inspector.openTranscript"),
    openAtRange: t("ui.graph.actions.openAtRange"),
    openWindow: t("ui.sessionGraph.window.open"),
    copyLink: t("ui.sessionGraph.inspector.copyLink"),
    copyView: t("ui.sessionGraph.inspector.copyView"),
    noteEdit: t("ui.sessionGraph.note.edit"),
    noteCopy: t("ui.sessionGraph.note.copy"),
    noteDelete: t("ui.sessionGraph.note.delete"),
    actions: t("ui.graph.actions.label"),
    confirmCheckout: (branch) => t("ui.graph.actions.confirmCheckout", { branch }),
    confirmStop: (process) => t("ui.graph.actions.confirmStop", { process }),
    diff: t("ui.sessionGraph.inspector.diff"),
    diffLoading: t("ui.sessionGraph.inspector.diffLoading"),
    traceActions: [],
  }

  copy.traceActions = options.traceKind
    ? [
        { id: "trace.copyOutline", label: t("ui.sessionGraph.trace.copyOutline"), onClick: (nodeID) => options.onCopyTraceOutline?.(nodeID) },
        { id: "trace.clear", label: t("ui.sessionGraph.trace.clear"), onClick: () => options.onClearTrace?.() },
      ]
    : (["why", "led-here", "related", "downstream"] as const).map((kind) => ({
        id: `trace.${kind}`,
        label: t(`ui.sessionGraph.trace.${kind === "led-here" ? "ledHere" : kind}`),
        onClick: (nodeID) => options.onTrace?.(kind, nodeID),
      }))

  return copy
}
