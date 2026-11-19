import type { GraphNode, NodeKind, NodeStatus } from "./model"

/**
 * T15 — the equalizer. A rule is a **predicate over a node** plus an **effect on the card**, written
 * in the graph's own vocabulary: the kind, the status, and the age.
 *
 * The effect decides what it costs, and the costs are not the same:
 *
 * - a **size** rule (`scale`) re-lays-out the map: the layout's cell cursor reads the card's box,
 *   so the rows move. It is a deliberate act, like changing the level;
 * - a **style** rule (`hue`, `muted`) rebuilds the model and moves nothing;
 * - an **age** rule (`fadeAfter`) fades a card as it grows old. Age is a continuous input, so it
 *   never re-lays-out: a map that moves under the reader every minute is worse than a card that
 *   dims.
 */
export type EqualizerRule = {
  id: string
  /** The kind the rule speaks to; absent means every kind. */
  kind?: NodeKind
  /** The status the rule speaks to; absent means every status. */
  status?: NodeStatus
  /** The card's size, as a scale on the layout's box. */
  scale?: number
  /** The accent's hue, in degrees. */
  hue?: number
  /** The card is dimmed. */
  muted?: boolean
  /** The card fades once it is this old, in seconds. */
  fadeAfter?: number
}

export type EqualizerRuleSet = readonly EqualizerRule[]

/** Whether a rule speaks to a node. */
export function ruleMatches(rule: EqualizerRule, node: GraphNode): boolean {
  if (rule.kind && node.kind !== rule.kind) return false
  if (rule.status && node.status !== rule.status) return false
  return true
}

/**
 * The rule that speaks to a node — the last matching one, so the reader's order is their order.
 * A caller that needs several effects at once resolves the rule once and reads them off it.
 */
export function equalizerMatch(rules: EqualizerRuleSet, node: GraphNode): EqualizerRule | undefined {
  for (let index = rules.length - 1; index >= 0; index--) {
    const rule = rules[index]!
    if (ruleMatches(rule, node)) return rule
  }
  return undefined
}

/** The scale a rule set gives a card's box. The layout reads it, so it costs a re-layout. */
export function equalizerScale(rules: EqualizerRuleSet, node: GraphNode): number {
  const scale = equalizerMatch(rules, node)?.scale
  return scale === undefined ? 1 : scale
}

/**
 * How loud a card is, given how old it is. The age fades a card but never moves the map: the fade is
 * the card's own opacity, and it costs the model a rebuild, not the layout a re-run.
 */
export function equalizerFade(rules: EqualizerRuleSet, node: GraphNode, now: number): number {
  const fadeAfter = equalizerMatch(rules, node)?.fadeAfter
  if (fadeAfter === undefined || node.time === undefined) return 1
  const age = (now - node.time) / 1000
  if (age <= fadeAfter) return 1
  // The fade runs over the next hour, so an old card dims without disappearing.
  return Math.max(0.25, 1 - (age - fadeAfter) / 3600)
}

/**
 * The presets are the product: a reader should not have to write rules to get value. Each preset is
 * a named rule set; the host names them (the labels are the host's copy).
 */
export const EQUALIZER_PRESETS: readonly { id: string; rules: EqualizerRuleSet }[] = [
  {
    id: "errors-larger",
    rules: [{ id: "errors-larger", kind: "error", scale: 1.4 }],
  },
  {
    id: "subagents-as-large",
    rules: [{ id: "subagents-as-large", kind: "subagent", scale: 1.3 }],
  },
  {
    id: "old-files-dimmer",
    rules: [{ id: "old-files-dimmer", kind: "file", fadeAfter: 600 }],
  },
  {
    id: "directories-as-large",
    rules: [{ id: "directories-as-large", kind: "directory", scale: 1.5 }],
  },
  {
    id: "untouched-dimmer",
    rules: [{ id: "untouched-dimmer", kind: "file", muted: true }],
  },
]
