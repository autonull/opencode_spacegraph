import type { GraphNode } from "@opencode/session-ui/graph"
import type { GraphViewData } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import type { JSX } from "solid-js"

export type InspectorProps = {
  model: GraphViewData
  node?: GraphNode
  traceKind?: "why" | "led-here" | "related"
  onTraceWhy?: () => void
  onTraceLedHere?: () => void
  onTraceRelated?: () => void
  onClearTrace?: () => void
  onCopyTraceOutline?: () => void
  onEditNote?: (id: string, text: string) => void
  onDeleteNote?: (id: string) => void
  onCopyNote?: (id: string) => void
  onSelect?: (id: string) => void
  onOpenTranscript?: (messageID: string, partID?: string) => void
  link?: (node: GraphNode) => JSX.Element
}

export const Inspector = (props: InspectorProps) => {
  const i18n = useI18n()

  if (!props.node) {
    return (
      <aside
        data-component="spacegraph-inspector"
        data-slot="spacegraph-inspector"
        class="flex h-full w-full flex-col overflow-hidden border-l border-v2-border-border-base"
        aria-label={i18n.t("panel.inspectorTitle")}
      >
        <div class="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
          <span class="text-14-regular text-text-weak">{i18n.t("panel.inspectorEmpty")}</span>
          <span class="text-12-regular text-text-weaker">{i18n.t("panel.inspectorEmptyHint")}</span>
        </div>
      </aside>
    )
  }

  const node = props.node

  return (
    <aside
      data-component="spacegraph-inspector"
      data-slot="spacegraph-inspector"
      class="flex h-full w-full flex-col overflow-hidden border-l border-v2-border-border-base"
      aria-label={i18n.t("panel.inspectorTitle")}
    >
      <div class="flex min-h-0 flex-1 flex-col p-4">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-14-medium text-text-strong">{node.label}</span>
          {node.kind && (
            <span class="rounded-full bg-v2-overlay-simple-overlay-hover px-2 py-0.5 text-11-regular text-text-weak">
              {node.kind}
            </span>
          )}
        </div>
        
        {node.summary && (
          <div class="mb-4 text-13-regular text-text-base">{node.summary}</div>
        )}

        {node.provenance && (
          <div class="mb-4">
            <div class="mb-2 text-12-medium text-text-weak">Provenance</div>
            <div class="text-12-regular text-text-base">
              <span class="text-text-weak">{node.provenance.source}: </span>
              <code class="font-mono text-11-regular">{node.provenance.confidence}</code>
              {node.provenance.asOf && (
                <>
                  <span class="text-text-weak"> as of </span>
                  <code class="font-mono text-11-regular">{new Date(node.provenance.asOf).toLocaleString()}</code>
                </>
              )}
            </div>
          </div>
        )}

        {props.onSelect && (
          <button
            type="button"
            class="rounded-md border border-v2-border-border-base px-3 py-1.5 text-13-regular text-text-base hover:bg-v2-overlay-simple-overlay-hover"
            onClick={() => props.onSelect?.(node.id)}
          >
            {i18n.t("panel.inspectorFocus")}
          </button>
        )}
      </div>
    </aside>
  )
}