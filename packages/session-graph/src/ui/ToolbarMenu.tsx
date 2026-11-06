import { Icon } from "@opencode/ui/icon"
import { type JSX } from "solid-js"

export type ToolbarMenuProps = {
  slot: string
  label: string
  icon: string
  value?: string
  valueSlot?: string
  align?: "start" | "end"
  children: JSX.Element
}

/**
 * T14.2 — a dropdown in the toolbar. The *icon* is the affordance and the label names the current
 * value, so a reader sees what the axis is set to without opening it. A menu with no value to name
 * is the icon alone, and opens without a chevron.
 */
export const ToolbarMenu = (props: ToolbarMenuProps) => (
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