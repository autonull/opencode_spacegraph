import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"

/**
 * The graph's icon button: a small ghost button whose icon is the affordance and whose label names
 * it — as the accessible name and as the tooltip. Every surface of the graph closes, toggles and
 * navigates the same way, so they all use this one.
 */
export type GraphIconButtonProps = {
  /** The button's accessible name; also its tooltip. */
  label: string
  /** The icon's name in the icon catalogue. */
  icon: string
  onClick: () => void
  /** A toggle's state; absent for a plain button. */
  pressed?: boolean
  disabled?: boolean
}

export const GraphIconButton = (props: GraphIconButtonProps) => (
  <IconButton
    size="small"
    variant="ghost"
    state={props.pressed === undefined ? undefined : props.pressed ? "pressed" : "rest"}
    aria-label={props.label}
    title={props.label}
    disabled={props.disabled}
    onClick={props.onClick}
    icon={<Icon name={props.icon} size="small" />}
  />
)
