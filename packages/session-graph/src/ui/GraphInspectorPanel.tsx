import { type JSX } from "solid-js"
import { GraphInspector } from "./GraphInspector"
import type { GraphViewData } from "@opencode/session-ui/graph"
import type { GraphNode } from "@opencode/session-ui/graph"
import type { GraphDiffSource } from "./GraphDiff"
import type { UseGraphAnnotationsReturn } from "./useGraphAnnotations"
import type { GraphSelection } from "./graph-selection"

export type GraphInspectorPanelProps = {
  model: GraphViewData
  node: GraphNode | undefined
  diffSource: GraphDiffSource | undefined
  renderSummary: ((node: GraphNode) => JSX.Element | undefined) | undefined
  link: string | undefined
  onCopyView: () => void
  onSelect: GraphSelection["select"]
  onOpenTranscript: ((id: string) => void) | undefined
  onOpenSession: ((sessionID: string) => void) | undefined
  traceKind: "why" | "led-here" | "related" | null
  onTraceWhy: UseGraphAnnotationsReturn["traceWhy"]
  onTraceLedHere: UseGraphAnnotationsReturn["traceLedHere"]
  onTraceRelated: UseGraphAnnotationsReturn["traceRelated"]
  onClearTrace: UseGraphAnnotationsReturn["clearTrace"]
  onCopyTraceOutline: UseGraphAnnotationsReturn["copyTraceOutline"]
  onEditNote: UseGraphAnnotationsReturn["editNote"]
  onDeleteNote: UseGraphAnnotationsReturn["deleteNote"]
  onCopyNote: UseGraphAnnotationsReturn["copyNote"]
  /** When true, renders as a floating sheet with header and close button. */
  sheet?: boolean
  /** Title for sheet mode. */
  title?: string
  /** Close handler for sheet mode. */
  onClose?: () => void
  /** i18n for sheet mode (used for close button aria-label). */
  i18n?: ReturnType<typeof import("@opencode/ui/context/i18n")["useI18n"]>
}

function SheetContent(props: { title?: string; onClose?: () => void; i18n?: ReturnType<typeof import("@opencode/ui/context/i18n")["useI18n"]>; children: JSX.Element }) {
  return (
    <div class="absolute inset-0 z-30 flex flex-col" data-slot="graph-inspector-sheet">
      <div class="flex h-12 items-center justify-between border-b border-border-weaker-base bg-surface-base px-3">
        <span class="text-13-medium text-text-base">{props.title ?? ""}</span>
        {props.onClose && (
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-sm text-text-base hover:bg-surface-base-hover"
            onClick={props.onClose}
            aria-label={props.i18n?.t("ui.sessionGraph.inspector.closeSheet") ?? ""}
          >
            <svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        )}
      </div>
      <div class="flex-1 overflow-auto">{props.children}</div>
    </div>
  )
}

export function GraphInspectorPanel(props: GraphInspectorPanelProps) {
  const { sheet, title, onClose, i18n, ...inspectorProps } = props

  return sheet ? (
    <SheetContent title={title} onClose={onClose} i18n={i18n}>
      <GraphInspector {...inspectorProps} />
    </SheetContent>
  ) : (
    <GraphInspector {...inspectorProps} />
  )
}

/** @deprecated Use GraphInspectorPanel with sheet={true} instead. */
export type GraphInspectorSheetProps = GraphInspectorPanelProps & {
  title: string
  onClose: () => void
  i18n: ReturnType<typeof import("@opencode/ui/context/i18n")["useI18n"]>
}

/** @deprecated Use GraphInspectorPanel with sheet={true} instead. */
export function GraphInspectorSheet(props: GraphInspectorSheetProps) {
  return <GraphInspectorPanel {...props} sheet={true} />
}