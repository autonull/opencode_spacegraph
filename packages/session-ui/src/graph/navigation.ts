import type { GraphModel, GraphNode } from "./model"
import type { NodeKind } from "./vocabulary"

export type NavigationMnemonic = {
  key: string
  labelKey: string
  kinds: readonly NodeKind[]
}

export const NAVIGATION_MNEMONICS = [
  { key: "s", labelKey: "ui.sessionGraph.nav.session", kinds: ["session"] },
  { key: "t", labelKey: "ui.sessionGraph.nav.turn", kinds: ["turn"] },
  { key: "m", labelKey: "ui.sessionGraph.nav.message", kinds: ["message"] },
  { key: "f", labelKey: "ui.sessionGraph.nav.file", kinds: ["file"] },
  { key: "d", labelKey: "ui.sessionGraph.nav.directory", kinds: ["directory"] },
  { key: "p", labelKey: "ui.sessionGraph.nav.package", kinds: ["package"] },
  { key: "c", labelKey: "ui.sessionGraph.nav.commit", kinds: ["commit"] },
  { key: "b", labelKey: "ui.sessionGraph.nav.branch", kinds: ["branch"] },
  { key: "i", labelKey: "ui.sessionGraph.nav.issue", kinds: ["issue"] },
] as const satisfies readonly NavigationMnemonic[]

const byKey = new Map<string, NavigationMnemonic>(
  NAVIGATION_MNEMONICS.map((mnemonic) => [mnemonic.key, mnemonic]),
)

export const navigationHelp = () =>
  NAVIGATION_MNEMONICS.map(({ key, labelKey }) => ({ key, labelKey }))

export const parseNavigation = (query: string): NavigationMnemonic | undefined => {
  const match = query.trim().toLowerCase().match(/^g\s*([a-z])$/)
  return match ? byKey.get(match[1]!) : undefined
}

export const navigationTargets = (model: GraphModel, mnemonic: NavigationMnemonic): GraphNode[] => {
  const kinds = new Set<NodeKind>(mnemonic.kinds)
  return model.nodes.filter((node) => kinds.has(node.kind))
}

export const navigationResults = (model: GraphModel, query: string): GraphNode[] | undefined => {
  const mnemonic = parseNavigation(query)
  return mnemonic ? navigationTargets(model, mnemonic) : undefined
}

export const nextNavigationTarget = (
  model: GraphModel,
  mnemonic: NavigationMnemonic,
  current?: string,
): GraphNode | undefined => {
  const targets = navigationTargets(model, mnemonic)
  if (targets.length === 0) return undefined
  const index = current === undefined ? -1 : targets.findIndex((node) => node.id === current)
  return targets[(index + 1) % targets.length]
}
