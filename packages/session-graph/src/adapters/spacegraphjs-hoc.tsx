/**
 * @opencode/session-graph - Higher-order component utilities for SpaceGraphJS adapters
 * Reduces boilerplate by providing a generic wrapper pattern.
 */

import type { I18n, IconComponent, PopoverComponent } from "@spacegraphjs/shared"
import { useI18n } from "@opencode/ui/context/i18n"
import { Icon } from "@opencode/ui/icon"
import type { JSX } from "solid-js"

import { toSGJSViewData } from "./spacegraphjs"

// Shared renderer instances
export const renderIcon: IconComponent = ({ name, size, class: className, style }) => (
  <Icon name={name} size={size === "medium" ? "normal" : size} class={className} style={style} />
)

export const PopoverComponentImpl: PopoverComponent = ({ slot, label, icon, children, ...props }) => (
  <details data-slot={slot} data-popover={true} {...props}>
    <summary class="flex items-center gap-1" aria-label={label}>
      {icon && <Icon name={icon} size="small" />}
      {children}
    </summary>
  </details>
)

// Create host I18n adapter
export function createHostI18nAdapter(i18n: ReturnType<typeof useI18n>): I18n {
  return {
    t: (key: string, values?: Record<string, string | number>) => i18n.t(key, values),
    plural: (key: string, count: number, values?: Record<string, string | number>) =>
      i18n.plural(key as any, count, values),
  }
}

/**
 * Base adapter factory - creates an adapter component with shared logic.
 * This is intentionally loosely typed to work with various component prop types.
 */
function createBaseAdapter<Props extends object>(
  Component: (props: Props) => JSX.Element,
  options: {
    withModel?: boolean
    withI18n?: boolean
    withIcon?: boolean
    withPopover?: boolean
    extraProps?: (props: any, adaptedI18n: I18n) => Record<string, unknown>
  } = {},
): (props: any) => JSX.Element {
  const { withModel = false, withI18n = true, withIcon = true, withPopover = true, extraProps } = options

  return function AdapterComponent(props: any): JSX.Element {
    const i18n = props.i18n ?? useI18n()
    const { i18n: _i18n, model, ...rest } = props
    const adaptedI18n = withI18n ? createHostI18nAdapter(i18n) : undefined

    const componentProps: Record<string, unknown> = { ...rest }

    if (withModel && model) {
      componentProps.model = toSGJSViewData(model)
    }
    if (withI18n && adaptedI18n) {
      componentProps.i18n = adaptedI18n
    }
    if (withIcon) {
      componentProps.Icon = renderIcon
    }
    if (withPopover) {
      componentProps.Popover = PopoverComponentImpl
    }

    if (extraProps && adaptedI18n) {
      Object.assign(componentProps, extraProps(props, adaptedI18n))
    }

    return <Component {...(componentProps as Props)} />
  }
}

/**
 * Adapter for toolbar components that need model, i18n, Icon, and Popover.
 */
export function createToolbarAdapter<Props extends object>(
  Component: (props: Props) => JSX.Element,
): (props: Omit<Props, "i18n" | "Icon" | "Popover" | "model"> & {
  i18n?: ReturnType<typeof useI18n>
  model?: import("@opencode/session-ui/graph").GraphViewData
}) => JSX.Element {
  return createBaseAdapter(Component, { withModel: true, withI18n: true, withIcon: true, withPopover: true })
}

/**
 * Adapter for control components that only need i18n and Icon.
 */
export function createControlAdapter<Props extends object>(
  Component: (props: Props) => JSX.Element,
): (props: Omit<Props, "i18n" | "Icon"> & {
  i18n?: ReturnType<typeof useI18n>
}) => JSX.Element {
  return createBaseAdapter(Component, { withModel: false, withI18n: true, withIcon: true, withPopover: false })
}

/**
 * Adapter for overlay components that need i18n, Icon, and Popover but no model.
 */
export function createOverlayAdapter<Props extends object>(
  Component: (props: Props) => JSX.Element,
): (props: Omit<Props, "i18n" | "Icon" | "Popover"> & {
  i18n?: ReturnType<typeof useI18n>
}) => JSX.Element {
  return createBaseAdapter(Component, { withModel: false, withI18n: true, withIcon: true, withPopover: true })
}

/**
 * Adapter for search components that need custom vocabulary keys.
 */
export function createSearchAdapter<Props extends object>(
  Component: (props: Props) => JSX.Element,
  getVocabularyKeys: (i18n: I18n) => Record<string, unknown>,
): (props: Omit<Props, "t" | "plural" | "Icon" | "vocabularyKeys"> & {
  i18n?: ReturnType<typeof useI18n>
}) => JSX.Element {
  return createBaseAdapter(Component, {
    withModel: false,
    withI18n: true,
    withIcon: true,
    withPopover: false,
    extraProps: (_, adaptedI18n) => ({
      t: adaptedI18n.t,
      plural: adaptedI18n.plural,
      vocabularyKeys: getVocabularyKeys(adaptedI18n),
    }),
  })
}

/**
 * Adapter for export components that need t/plural/Icon/Popover but no model.
 */
export function createExportAdapter<Props extends object>(
  Component: (props: Props) => JSX.Element,
): (props: Omit<Props, "t" | "plural" | "Icon" | "Popover"> & {
  i18n?: ReturnType<typeof useI18n>
}) => JSX.Element {
  return createBaseAdapter(Component, {
    withModel: false,
    withI18n: true,
    withIcon: true,
    withPopover: true,
    extraProps: (_, adaptedI18n) => ({
      t: adaptedI18n.t,
      plural: adaptedI18n.plural,
    }),
  })
}

/**
 * Adapter for simple components that only need i18n.
 */
export function createSimpleAdapter<Props extends object>(
  Component: (props: Props) => JSX.Element,
): (props: Omit<Props, "i18n"> & {
  i18n?: ReturnType<typeof useI18n>
}) => JSX.Element {
  return createBaseAdapter(Component, { withModel: false, withI18n: true, withIcon: false, withPopover: false })
}