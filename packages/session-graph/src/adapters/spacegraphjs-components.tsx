/**
 * @opencode/session-graph - SpaceGraphJS component adapters
 * Wraps generic SpaceGraphJS components with OpenCode i18n and UI integrations.
 */

import type { I18n } from "@spacegraphjs/shared"
import { useI18n } from "@opencode/ui/context/i18n"
import type { UiI18nPluralKey } from "@opencode/ui/context/i18n"
import { Icon } from "@opencode/ui/icon"
import type { JSX } from "solid-js"
import type { IconComponent } from "@spacegraphjs/shared/icons"
import type { PopoverComponent } from "@spacegraphjs/shared/popover"
import { NODE_KINDS, NODE_STATUSES, DOMAINS } from "@opencode/session-ui/graph"

// Import SpaceGraphJS components
import {
  GraphToolbar,
  GraphLayersControl,
  GraphLayoutControl,
  GraphTimeControl,
  GraphDrawControl,
  GraphShowControl,
  GraphZoomControl,
  GraphQuestionsControl,
} from "@spacegraphjs/toolbar"
import { GraphSearch, GraphFind } from "@spacegraphjs/search"
import { GraphBreadcrumbs, GraphMinimap, GraphLegend } from "@spacegraphjs/navigation"
import { GraphA11y } from "@spacegraphjs/a11y"
import { GraphDiffView } from "@spacegraphjs/diff"
import { GraphPeek, GraphPopover, GraphOverlayManager } from "@spacegraphjs/overlays"
import { GraphStatusBar } from "@spacegraphjs/controls"
import { GraphCompare, GraphCompareBar } from "@spacegraphjs/compare"
import { TurnMapInlineGraph, TurnMapOverlay } from "@spacegraphjs/turn-map"
import { GraphExportControl } from "@spacegraphjs/export"

// Import SpaceGraphJS prop types
import type {
  GraphToolbarProps,
  GraphLayersControlProps,
  GraphLayoutControlProps,
  GraphTimeControlProps,
  GraphDrawControlProps,
  GraphShowControlProps,
  GraphZoomControlProps,
  GraphQuestionsControlProps,
} from "@spacegraphjs/toolbar"
import type {
  GraphSearchProps,
  GraphFindProps,
} from "@spacegraphjs/search"
import type {
  GraphBreadcrumbsProps,
  GraphMinimapProps,
  GraphLegendProps,
} from "@spacegraphjs/navigation"
import type { GraphA11yProps } from "@spacegraphjs/a11y"
import type { GraphDiffViewProps } from "@spacegraphjs/diff"
import type {
  GraphPeekProps,
  GraphPopoverProps,
  GraphOverlayManagerProps,
} from "@spacegraphjs/overlays"
import type { GraphStatusBarProps } from "@spacegraphjs/controls"
import type {
  GraphCompareProps,
  GraphCompareBarProps,
} from "@spacegraphjs/compare"
import type {
  TurnMapInlineGraphProps,
  TurnMapOverlayProps,
} from "@spacegraphjs/turn-map"
import type { GraphExportControlProps } from "@spacegraphjs/export"

// ============ i18n Adapter ============

/** Creates an I18n adapter from OpenCode's useI18n hook result. */
export function createI18nAdapter(i18n: ReturnType<typeof useI18n>): I18n {
  return {
    t: (key: string, values?: Record<string, string | number>) => i18n.t(key, values),
    plural: (key: string, count: number, values?: Record<string, string | number>) =>
      i18n.plural(key as UiI18nPluralKey, count, values),
  }
}

// ============ Icon/Popover Renderers ============

/** Maps SpaceGraphJS icon sizes to OpenCode icon sizes. */
function mapIconSize(size: 'small' | 'medium' | 'large' | undefined): "small" | "normal" | "large" | undefined {
  if (size === 'medium') return 'normal'
  return size
}

/** Default icon renderer using OpenCode's Icon component. */
export function createOpenCodeIconRenderer(): IconComponent {
  return ({ name, size, class: className, style }) => (
    <Icon name={name} size={mapIconSize(size)} class={className} style={style} />
  )
}

/** Default popover renderer using OpenCode's popover pattern. */
export function createOpenCodePopoverRenderer(): PopoverComponent {
  return ({ slot, label, icon, children, ...props }) => (
    <details data-slot={slot} data-popover={true} {...props}>
      <summary class="flex items-center gap-1" aria-label={label}>
        {icon && <Icon name={icon} size="small" />}
        {children}
      </summary>
    </details>
  )
}

// Shared renderer instances
const renderIcon = createOpenCodeIconRenderer()
const PopoverComponent = createOpenCodePopoverRenderer()

// ============ Toolbar Adapters ============

import { toSGJSViewData } from "./spacegraphjs"

/** Adapter props for GraphToolbar - adds OpenCode i18n. */
export interface GraphToolbarAdapterProps
  extends Omit<GraphToolbarProps, "i18n" | "Icon" | "Popover" | "model"> {
  /** OpenCode i18n context (injected via useI18n). */
  i18n?: ReturnType<typeof useI18n>
  /** Session-ui GraphViewData (will be converted to spacegraphjs type). */
  model?: import("@opencode/session-ui/graph").GraphViewData
}

/** Wraps @spacegraphjs/toolbar GraphToolbar with OpenCode i18n. */
export function GraphToolbarAdapter(props: GraphToolbarAdapterProps): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, model, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return (
    <GraphToolbar
      {...rest}
      model={model ? toSGJSViewData(model) : undefined}
      i18n={adaptedI18n}
      Icon={renderIcon}
      Popover={PopoverComponent}
    />
  )
}

/** Adapter for GraphLayersControl. */
export interface GraphLayersControlAdapterProps
  extends Omit<GraphLayersControlProps, "i18n" | "Icon" | "Popover" | "model"> {
  i18n?: ReturnType<typeof useI18n>
  model?: import("@opencode/session-ui/graph").GraphViewData
}

export function GraphLayersControlAdapter(
  props: GraphLayersControlAdapterProps,
): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, model, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return (
    <GraphLayersControl
      {...rest}
      model={model ? toSGJSViewData(model) : undefined}
      i18n={adaptedI18n}
      Icon={renderIcon}
      Popover={PopoverComponent}
    />
  )
}

/** Adapter for GraphLayoutControl. */
export interface GraphLayoutControlAdapterProps
  extends Omit<GraphLayoutControlProps, "i18n" | "Icon" | "Popover"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphLayoutControlAdapter(
  props: GraphLayoutControlAdapterProps,
): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return (
    <GraphLayoutControl
      {...rest}
      i18n={adaptedI18n}
      Icon={renderIcon}
      Popover={PopoverComponent}
    />
  )
}

/** Adapter for GraphTimeControl. */
export interface GraphTimeControlAdapterProps
  extends Omit<GraphTimeControlProps, "i18n" | "Icon" | "Popover" | "model"> {
  i18n?: ReturnType<typeof useI18n>
  model?: import("@opencode/session-ui/graph").GraphViewData
}

export function GraphTimeControlAdapter(
  props: GraphTimeControlAdapterProps,
): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, model, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return (
    <GraphTimeControl
      {...rest}
      model={model ? toSGJSViewData(model) : undefined}
      i18n={adaptedI18n}
      Icon={renderIcon}
      Popover={PopoverComponent}
    />
  )
}

/** Adapter for GraphDrawControl. */
export interface GraphDrawControlAdapterProps
  extends Omit<GraphDrawControlProps, "i18n" | "Icon" | "Popover"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphDrawControlAdapter(
  props: GraphDrawControlAdapterProps,
): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return (
    <GraphDrawControl
      {...rest}
      i18n={adaptedI18n}
      Icon={renderIcon}
      Popover={PopoverComponent}
    />
  )
}

/** Adapter for GraphShowControl. */
export interface GraphShowControlAdapterProps
  extends Omit<GraphShowControlProps, "i18n" | "Icon" | "Popover" | "model"> {
  i18n?: ReturnType<typeof useI18n>
  model?: import("@opencode/session-ui/graph").GraphViewData
}

export function GraphShowControlAdapter(
  props: GraphShowControlAdapterProps,
): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, model, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return (
    <GraphShowControl
      {...rest}
      model={model ? toSGJSViewData(model) : undefined}
      i18n={adaptedI18n}
      Icon={renderIcon}
      Popover={PopoverComponent}
    />
  )
}

/** Adapter for GraphZoomControl. */
export interface GraphZoomControlAdapterProps
  extends Omit<GraphZoomControlProps, "i18n" | "Icon"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphZoomControlAdapter(
  props: GraphZoomControlAdapterProps,
): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return <GraphZoomControl {...rest} i18n={adaptedI18n} Icon={renderIcon} />
}

/** Adapter for GraphQuestionsControl. */
export interface GraphQuestionsControlAdapterProps
  extends Omit<GraphQuestionsControlProps, "i18n" | "Icon" | "Popover"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphQuestionsControlAdapter(
  props: GraphQuestionsControlAdapterProps,
): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return (
    <GraphQuestionsControl
      {...rest}
      i18n={adaptedI18n}
      Icon={renderIcon}
      Popover={PopoverComponent}
    />
  )
}

// ============ Search Adapters ============

/** Adapter for GraphSearch. */
export interface GraphSearchAdapterProps
  extends Omit<GraphSearchProps, "t" | "plural" | "Icon"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphSearchAdapter(props: GraphSearchAdapterProps): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return <GraphSearch {...rest} t={adaptedI18n.t} plural={adaptedI18n.plural} Icon={renderIcon} />
}

/** Adapter for GraphFind. */
export interface GraphFindAdapterProps
  extends Omit<GraphFindProps, "t" | "plural" | "Icon" | "vocabularyKeys"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphFindAdapter(props: GraphFindAdapterProps): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return (
    <GraphFind
      {...rest}
      t={adaptedI18n.t}
      plural={adaptedI18n.plural}
      Icon={renderIcon}
      vocabularyKeys={{
        kind: Object.fromEntries(
          NODE_KINDS.map((k) => [k, adaptedI18n.t(`ui.sessionGraph.kind.${k}`)]),
        ) as Record<string, string>,
        status: Object.fromEntries(
          NODE_STATUSES.map((s) => [s, adaptedI18n.t(`ui.sessionGraph.status.${s}`)]),
        ) as Record<string, string>,
        domain: Object.fromEntries(
          DOMAINS.map((d) => [d, adaptedI18n.t(`ui.sessionGraph.domain.${d}`)]),
        ) as Record<string, string>,
      }}
    />
  )
}

// ============ Navigation Adapters ============

/** Adapter for GraphBreadcrumbs. */
export interface GraphBreadcrumbsAdapterProps
  extends Omit<GraphBreadcrumbsProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphBreadcrumbsAdapter(
  props: GraphBreadcrumbsAdapterProps,
): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return <GraphBreadcrumbs {...rest} i18n={adaptedI18n} />
}

/** Adapter for GraphMinimap. */
export interface GraphMinimapAdapterProps
  extends Omit<GraphMinimapProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphMinimapAdapter(props: GraphMinimapAdapterProps): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return <GraphMinimap {...rest} i18n={adaptedI18n} />
}

/** Adapter for GraphLegend. */
export interface GraphLegendAdapterProps
  extends Omit<GraphLegendProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphLegendAdapter(props: GraphLegendAdapterProps): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return <GraphLegend {...rest} i18n={adaptedI18n} />
}

// ============ A11y Adapter ============

/** Adapter for GraphA11y. */
export interface GraphA11yAdapterProps
  extends Omit<GraphA11yProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphA11yAdapter(props: GraphA11yAdapterProps): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return <GraphA11y {...rest} i18n={adaptedI18n} />
}

// ============ Diff Adapter ============

/** Adapter for GraphDiffView. */
export interface GraphDiffViewAdapterProps
  extends Omit<GraphDiffViewProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphDiffViewAdapter(props: GraphDiffViewAdapterProps): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return <GraphDiffView {...rest} i18n={adaptedI18n} />
}

// ============ Overlays Adapters ============

/** Adapter for GraphPeek. */
export interface GraphPeekAdapterProps
  extends Omit<GraphPeekProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphPeekAdapter(props: GraphPeekAdapterProps): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return <GraphPeek {...rest} i18n={adaptedI18n} />
}

/** Adapter for GraphPopover. */
export interface GraphPopoverAdapterProps
  extends Omit<GraphPopoverProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphPopoverAdapter(props: GraphPopoverAdapterProps): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return <GraphPopover {...rest} i18n={adaptedI18n} />
}

/** Adapter for GraphOverlayManager. */
export interface GraphOverlayManagerAdapterProps
  extends Omit<GraphOverlayManagerProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphOverlayManagerAdapter(
  props: GraphOverlayManagerAdapterProps,
): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return <GraphOverlayManager {...rest} i18n={adaptedI18n} />
}

// ============ Controls Adapters ============

/** Adapter for GraphStatusBar. */
export interface GraphStatusBarAdapterProps
  extends Omit<GraphStatusBarProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphStatusBarAdapter(props: GraphStatusBarAdapterProps): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return <GraphStatusBar {...rest} i18n={adaptedI18n} />
}

// ============ Compare Adapters ============

/** Adapter for GraphCompare. */
export interface GraphCompareAdapterProps
  extends Omit<GraphCompareProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphCompareAdapter(props: GraphCompareAdapterProps): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return <GraphCompare {...rest} i18n={adaptedI18n} />
}

/** Adapter for GraphCompareBar. */
export interface GraphCompareBarAdapterProps
  extends Omit<GraphCompareBarProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphCompareBarAdapter(props: GraphCompareBarAdapterProps): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return <GraphCompareBar {...rest} i18n={adaptedI18n} />
}

// ============ Turn Map Adapters ============

/** Adapter for TurnMapInlineGraph. */
export interface TurnMapInlineGraphAdapterProps
  extends Omit<TurnMapInlineGraphProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export function TurnMapInlineGraphAdapter(
  props: TurnMapInlineGraphAdapterProps,
): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return <TurnMapInlineGraph {...rest} i18n={adaptedI18n} />
}

/** Adapter for TurnMapOverlay. */
export interface TurnMapOverlayAdapterProps
  extends Omit<TurnMapOverlayProps, "i18n"> {
  i18n?: ReturnType<typeof useI18n>
}

export function TurnMapOverlayAdapter(props: TurnMapOverlayAdapterProps): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return <TurnMapOverlay {...rest} i18n={adaptedI18n} />
}

// ============ Export Adapters ============

/** Adapter for GraphExportControl. */
export interface GraphExportControlAdapterProps
  extends Omit<GraphExportControlProps, "t" | "plural" | "Icon" | "Popover"> {
  i18n?: ReturnType<typeof useI18n>
}

export function GraphExportControlAdapter(
  props: GraphExportControlAdapterProps,
): JSX.Element {
  const i18n = props.i18n ?? useI18n()
  const { i18n: _i18n, ...rest } = props
  const adaptedI18n = createI18nAdapter(i18n)

  return (
    <GraphExportControl
      {...rest}
      t={adaptedI18n.t}
      plural={adaptedI18n.plural}
      Icon={renderIcon}
      Popover={PopoverComponent}
    />
  )
}