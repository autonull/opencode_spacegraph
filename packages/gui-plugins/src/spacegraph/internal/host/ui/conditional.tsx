import { For, Show, type JSX } from "solid-js"

/**
 * Conditional rendering utilities to reduce repetitive Show patterns.
 */

/**
 * Renders children when condition is truthy, otherwise renders fallback.
 */
export function When<T>(
  props: { when: T; fallback?: JSX.Element; children: (value: T) => JSX.Element }
): JSX.Element {
  return (
    <Show when={props.when} fallback={props.fallback}>
      {(value) => props.children(value as T)}
    </Show>
  )
}

/**
 * Renders children when condition is truthy.
 */
export function If(props: { when: boolean; children: JSX.Element }): JSX.Element {
  return <Show when={props.when}>{props.children}</Show>
}

/**
 * Renders fallback when condition is falsy, otherwise renders children.
 */
export function Unless(props: { when: boolean; fallback: JSX.Element; children: JSX.Element }): JSX.Element {
  return <Show when={!props.when} fallback={props.children}>{props.fallback}</Show>
}

/**
 * Renders children for each item in an array.
 */
export function ForEach<T>(
  props: { each: readonly T[]; children: (item: T, index: () => number) => JSX.Element }
): JSX.Element {
  return (
    <For each={props.each}>
      {(item, index) => props.children(item, index)}
    </For>
  )
}

/**
 * Renders first truthy value from a list of conditions.
 */
export function Match<T>(
  props: { value: T; cases: Array<{ when: (value: T) => boolean; render: (value: T) => JSX.Element }>; fallback?: JSX.Element }
): JSX.Element {
  for (const case_ of props.cases) {
    if (case_.when(props.value)) {
      return case_.render(props.value)
    }
  }
  return props.fallback ?? null
}

/**
 * Renders different content based on a string key (like a switch statement).
 */
export function Switch<T extends string>(
  props: { value: T; cases: Partial<Record<T, JSX.Element>>; fallback?: JSX.Element }
): JSX.Element {
  return props.cases[props.value] ?? props.fallback ?? null
}