import type { GraphNode, GraphViewData, JsonValue } from "./model"

/**
 * The cost lens reads the usage the builder records on a turn. It is a pure projection over the
 * model, so every surface that already has the session's nodes can show the same numbers without
 * fetching anything new.
 */

/** The token counts a provider reports for one assistant step. */
export type CostTokens = {
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
}

/** One turn's measured cost. `streaming` means at least one step has no end time yet. */
export type TurnCost = {
  tokens: CostTokens
  /** Reported provider cost, when the provider supplies it. */
  cost: number
  /** Wall time from the first step's start to the last completed step. */
  wallTime: number
  tools: number
  steps: number
  streaming: boolean
}

/** The sum of the session's turns, for the root card. */
export type SessionCost = TurnCost & {
  turns: number
}

export type CostLens = {
  turns: Map<string, TurnCost>
  session: SessionCost
}

const ZERO_TOKENS: CostTokens = {
  input: 0,
  output: 0,
  reasoning: 0,
  cacheRead: 0,
  cacheWrite: 0,
}

const numberField = (value: JsonValue | undefined): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0

const tokenField = (value: JsonValue | undefined, key: string): number => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return 0

  return numberField(value[key])
}

/** Reads the usage the builder writes on a turn node. */
export function turnCost(node: GraphNode): TurnCost | undefined {
  if (node.kind !== "turn" || !node.data) return undefined

  const usage = node.data.usage
  if (typeof usage !== "object" || usage === null || Array.isArray(usage)) return undefined

  const tokens = usage.tokens

  return {
    tokens: {
      input: tokenField(tokens, "input"),
      output: tokenField(tokens, "output"),
      reasoning: tokenField(tokens, "reasoning"),
      cacheRead: tokenField(tokens, "cacheRead"),
      cacheWrite: tokenField(tokens, "cacheWrite"),
    },
    cost: numberField(usage.cost),
    wallTime: numberField(usage.wallTime),
    tools: numberField(usage.tools),
    steps: numberField(usage.steps),
    streaming: usage.streaming === true,
  }
}

const totalTokens = (tokens: CostTokens) =>
  tokens.input + tokens.output + tokens.reasoning + tokens.cacheRead + tokens.cacheWrite

const addTurn = (total: SessionCost, turn: TurnCost): SessionCost => ({
  tokens: {
    input: total.tokens.input + turn.tokens.input,
    output: total.tokens.output + turn.tokens.output,
    reasoning: total.tokens.reasoning + turn.tokens.reasoning,
    cacheRead: total.tokens.cacheRead + turn.tokens.cacheRead,
    cacheWrite: total.tokens.cacheWrite + turn.tokens.cacheWrite,
  },
  cost: total.cost + turn.cost,
  wallTime: total.wallTime + turn.wallTime,
  tools: total.tools + turn.tools,
  steps: total.steps + turn.steps,
  streaming: total.streaming || turn.streaming,
  turns: total.turns + 1,
})

/** The per-turn costs and their session total. */
export function costLens(model: GraphViewData): CostLens {
  const turns = new Map<string, TurnCost>()
  let session: SessionCost = { tokens: ZERO_TOKENS, cost: 0, wallTime: 0, tools: 0, steps: 0, streaming: false, turns: 0 }

  for (const node of model.nodes) {
    const cost = turnCost(node)
    if (!cost) continue
    turns.set(node.id, cost)
    session = addTurn(session, cost)
  }

  return { turns, session }
}

/** The total token count of one usage record, for compact labels. */
export const tokenTotal = (tokens: CostTokens) => totalTokens(tokens)
