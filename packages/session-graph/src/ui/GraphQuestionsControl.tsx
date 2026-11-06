import { useI18n } from "@opencode/ui/context/i18n"
import { type JSX } from "solid-js"
import { Icon } from "@opencode/ui/icon"

const ToolbarMenu = (props: {
  slot: string
  label: string
  icon: string
  value?: string
  valueSlot?: string
  align?: "start" | "end"
  children: JSX.Element
}) => (
  <details class="relative" data-slot={props.slot}>
    <summary
      class="flex h-6 cursor-pointer list-none items-center gap-1 rounded-sm px-1 text-12-regular text-text-base hover:bg-surface-base-hover [&::-webkit-details-marker]:hidden"
      aria-label={props.label}
      title={props.label}
    >
      <Icon name={props.icon} size="small" />
      {props.value ? <span data-slot={props.valueSlot ?? `${props.slot}-value`}>{props.value}</span> : null}
      {props.value ? <Icon name="outline-chevron-down" size="small" /> : null}
    </summary>
    <div
      class="absolute z-30 mt-1 flex min-w-[180px] flex-col items-start gap-2 rounded-sm border border-border-weaker-base bg-surface-base p-2 shadow-md"
      classList={{ "start-0": props.align === "start", "end-0": props.align !== "start" }}
    >
      {props.children}
    </div>
  </details>
)

export type GraphQuestionsControlProps = {
  dispatchCommand?: (command: string) => void
}

export const GraphQuestionsControl = (props: GraphQuestionsControlProps) => {
  const i18n = useI18n()

  const ask = (name: "why" | "led-here" | "related" | "compare" | "note" | "facets" | "failureProgress" | "find") => {
    if (props.dispatchCommand) {
      props.dispatchCommand(name)
      return
    }
    window.dispatchEvent(new CustomEvent("graph:command", { detail: { name } }))
  }

  const question = (
    name: "why" | "led-here" | "related" | "compare" | "note" | "facets" | "failureProgress" | "find",
    label: string,
  ) => (
    <button
      type="button"
      data-slot="graph-question-option"
      data-value={name}
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
      onClick={() => ask(name)}
    >
      {label}
    </button>
  )

  return (
    <ToolbarMenu
      slot="graph-toolbar-questions"
      label={i18n.t("ui.sessionGraph.questions.title")}
      icon="magnifying-glass"
      align="end"
    >
      {question("why", i18n.t("ui.sessionGraph.questions.why"))}
      {question("led-here", i18n.t("ui.sessionGraph.questions.ledHere"))}
      {question("related", i18n.t("ui.sessionGraph.questions.related"))}
      {question("compare", i18n.t("ui.sessionGraph.questions.compare"))}
      {question("note", i18n.t("ui.sessionGraph.questions.note"))}
      {question("facets", i18n.t("ui.sessionGraph.questions.facets"))}
      {question("failureProgress", i18n.t("ui.sessionGraph.questions.failureProgress"))}
      {question("find", i18n.t("ui.sessionGraph.questions.find"))}
    </ToolbarMenu>
  )
}