import type { GraphNode, GraphViewData, SessionLineage } from "@opencode/session-ui/graph"
import { For, Show, createMemo } from "solid-js"
import { useI18n } from "@opencode/ui/context/i18n"
import { childSessionID, forkedFrom, parentSessionID } from "./node-data"

type LineageEntry = {
  kind: "fork" | "parent" | "child"
  id: string
  label: string
}

const LABEL_KEYS = {
  fork: "ui.sessionGraph.inspector.forkedFrom",
  parent: "ui.sessionGraph.inspector.parentSession",
  child: "ui.sessionGraph.inspector.childSession",
} as const

/**
 * T6.5 — the sessions a node points at, drawn as a short chain beside the node. The chain names
 * attribution, never causality: the entries are host navigation, not edges in the session model.
 */
export const GraphLineage = (props: {
  model: GraphViewData
  node: GraphNode
  onOpenSession?: (sessionID: string) => void
}) => {
  const i18n = useI18n()

  const lineage = createMemo<SessionLineage | undefined>(() => {
    const forked = forkedFrom(props.node)
    const parent = parentSessionID(props.node)
    if (!forked && !parent) return undefined
    return {
      ...(forked ? { forkedFrom: { sessionID: forked } } : {}),
      ...(parent ? { parentSessionID: parent } : {}),
    }
  })

  const entries = createMemo<LineageEntry[]>(() => {
    const entries: LineageEntry[] = []
    const value = lineage()
    if (value?.forkedFrom) {
      entries.push({ kind: "fork", id: value.forkedFrom.sessionID, label: i18n.t(LABEL_KEYS.fork) })
    }
    if (value?.parentSessionID) {
      entries.push({ kind: "parent", id: value.parentSessionID, label: i18n.t(LABEL_KEYS.parent) })
    }

    const children =
      props.node.kind === "session"
        ? props.model.nodes.filter((node) => childSessionID(node) !== undefined)
        : childSessionID(props.node)
          ? [props.node]
          : []
    for (const child of children) {
      const id = childSessionID(child)
      if (!id || entries.some((entry) => entry.id === id)) continue
      entries.push({ kind: "child", id, label: child.label || i18n.t(LABEL_KEYS.child) })
    }

    return entries
  })

  return (
    <Show when={entries().length > 0}>
      <section data-slot="graph-lineage" aria-label={i18n.t("ui.sessionGraph.inspector.lineage")} class="mb-3">
        <div class="mb-1 text-11-medium text-text-weak">{i18n.t("ui.sessionGraph.inspector.lineage")}</div>
        <ul class="flex flex-col gap-1">
          <For each={entries()}>
            {(entry) => (
              <li
                data-lineage-kind={entry.kind}
                class="rounded-sm border-s-2 border-border-weaker-base ps-2"
              >
                <button
                  type="button"
                  data-slot="graph-lineage-node"
                  data-session-id={entry.id}
                  disabled={!props.onOpenSession}
                  class="flex w-full flex-col gap-0.5 rounded-sm px-1 py-1 text-start hover:bg-surface-base-hover disabled:cursor-default disabled:hover:bg-transparent"
                  onClick={() => props.onOpenSession?.(entry.id)}
                >
                  <span class="text-11-regular text-text-weaker">{entry.label}</span>
                  <span class="truncate text-12-regular text-text-base">{entry.id}</span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </section>
    </Show>
  )
}
