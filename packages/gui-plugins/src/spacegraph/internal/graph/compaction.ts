import type { GraphViewData, GraphNode, GraphEdge, NodeKind } from "./model"

/**
 * Compaction priority for a node.
 * Higher priority = more likely to be kept during compaction.
 */
export type CompactionPriority = "critical" | "high" | "normal" | "low" | "drop"

/**
 * Node with compaction metadata.
 */
export interface CompactionNode extends GraphNode {
  compactionPriority: CompactionPriority
  compactionReason: string
}

/**
 * Result of compaction analysis.
 */
export interface CompactionAnalysis {
  nodes: CompactionNode[]
  /** Nodes that form the "decision spine" - errors, fixes, key decisions */
  decisionSpine: string[]
  /** Summary statistics */
  stats: {
    critical: number
    high: number
    normal: number
    low: number
    drop: number
  }
}

/**
 * Phase categories that indicate decision-making work.
 */
const DECISION_PHASES: Set<string> = new Set(["edit", "verify", "delegate"])

/**
 * Node kinds that are typically "why" nodes (should be kept).
 */
const WHY_KINDS: Set<NodeKind> = new Set([
  "error",
  "retry",
  "compaction",
  "phase",
  "subagent",
])

/**
 * Node kinds that are typically "what" nodes (can be dropped).
 */
const WHAT_KINDS: Set<NodeKind> = new Set([
  "reasoning",
  "message",
  "result",
])

/**
 * Edge kinds that indicate causal/decision relationships.
 */
const CAUSAL_EDGE_KINDS: Set<string> = new Set([
  "evidence",
  "produces",
  "writes",
  "delegates",
  "compacts",
])

/**
 * Analyze the graph and assign compaction priorities to nodes.
 * This is a research spike - do not ship without evidence.
 */
export function analyzeCompaction(model: GraphViewData): CompactionAnalysis {
  const { nodes, edges } = model

  // Build adjacency maps for fast lookups
  const outgoingEdges = new Map<string, GraphEdge[]>()
  const incomingEdges = new Map<string, GraphEdge[]>()

  for (const edge of edges) {
    const out = outgoingEdges.get(edge.source) ?? []
    out.push(edge)
    outgoingEdges.set(edge.source, out)

    const inc = incomingEdges.get(edge.target) ?? []
    inc.push(edge)
    incomingEdges.set(edge.target, inc)
  }

  // Find the decision spine: nodes that are errors, retries, or have causal edges
  const decisionSpine = new Set<string>()

  for (const node of nodes) {
    // Errors and retries are always in the decision spine
    if (node.kind === "error" || node.kind === "retry") {
      decisionSpine.add(node.id)
      continue
    }

    // Phases that are decision-making phases
    if (node.kind === "phase" && node.data?.category && DECISION_PHASES.has(node.data.category as string)) {
      decisionSpine.add(node.id)
      continue
    }

    // Subagents (delegation points)
    if (node.kind === "subagent") {
      decisionSpine.add(node.id)
      continue
    }

    // Compaction events
    if (node.kind === "compaction") {
      decisionSpine.add(node.id)
      continue
    }

    // Nodes with causal edges (evidence, produces, writes, delegates)
    const outgoing = outgoingEdges.get(node.id) ?? []
    const hasCausalOutgoing = outgoing.some((e) => CAUSAL_EDGE_KINDS.has(e.kind))

    const incoming = incomingEdges.get(node.id) ?? []
    const hasCausalIncoming = incoming.some((e) => CAUSAL_EDGE_KINDS.has(e.kind))

    if (hasCausalOutgoing || hasCausalIncoming) {
      decisionSpine.add(node.id)
    }
  }

  // Also include nodes that lead to decision spine nodes (evidence chain)
  const expandedSpine = new Set(decisionSpine)
  for (const nodeId of decisionSpine) {
    const incoming = incomingEdges.get(nodeId) ?? []
    for (const edge of incoming) {
      if (CAUSAL_EDGE_KINDS.has(edge.kind)) {
        expandedSpine.add(edge.source)
      }
    }
  }

  // Assign priorities
  const compactionNodes: CompactionNode[] = []
  const stats = { critical: 0, high: 0, normal: 0, low: 0, drop: 0 }

  for (const node of nodes) {
    let priority: CompactionPriority = "normal"
    let reason = ""

    if (expandedSpine.has(node.id)) {
      priority = "critical"
      reason = "Part of decision spine (causal chain)"
      stats.critical++
    } else if (WHY_KINDS.has(node.kind)) {
      priority = "high"
      reason = `${node.kind} nodes are typically decision-relevant`
      stats.high++
    } else if (WHAT_KINDS.has(node.kind)) {
      // Check if this message has tool calls or other important content
      const outgoing = outgoingEdges.get(node.id) ?? []
      const hasTools = outgoing.some((e) => e.kind === "part-of" || e.kind === "produces")
      if (hasTools) {
        priority = "normal"
        reason = "Message with tool activity"
        stats.normal++
      } else {
        priority = "low"
        reason = "Message without tool activity"
        stats.low++
      }
    } else if (node.kind === "file" || node.kind === "directory") {
      priority = "high"
      reason = "File/directory nodes show what changed"
      stats.high++
    } else if (node.kind === "tool") {
      // Tools are important if they wrote files or had errors
      const outgoing = outgoingEdges.get(node.id) ?? []
      const hasWrites = outgoing.some((e) => e.kind === "writes")
      const hasError = outgoing.some((e) => e.kind === "evidence")
      if (hasWrites || hasError) {
        priority = "high"
        reason = "Tool with writes or errors"
        stats.high++
      } else {
        priority = "normal"
        reason = "Tool without writes"
        stats.normal++
      }
    } else {
      priority = "normal"
      reason = "Default priority"
      stats.normal++
    }

    compactionNodes.push({
      ...node,
      compactionPriority: priority,
      compactionReason: reason,
    })
  }

  return {
    nodes: compactionNodes,
    decisionSpine: [...expandedSpine],
    stats,
  }
}

/**
 * Filter nodes by compaction priority threshold.
 * Returns nodes that should be kept at the given priority level.
 */
export function filterByCompactionPriority(
  analysis: CompactionAnalysis,
  minPriority: CompactionPriority,
): CompactionNode[] {
  const priorityOrder: CompactionPriority[] = ["critical", "high", "normal", "low", "drop"]
  const minIndex = priorityOrder.indexOf(minPriority)

  return analysis.nodes.filter((node) => {
    const nodeIndex = priorityOrder.indexOf(node.compactionPriority)
    return nodeIndex <= minIndex
  })
}

/**
 * Get a summary of what would be kept/dropped at each priority level.
 */
export function getCompactionSummary(analysis: CompactionAnalysis): string {
  const { stats, decisionSpine } = analysis
  const total = stats.critical + stats.high + stats.normal + stats.low + stats.drop

  return (
    `Compaction Analysis:\n` +
    `  Total nodes: ${total}\n` +
    `  Decision spine: ${decisionSpine.length} nodes\n` +
    `  Critical (keep): ${stats.critical}\n` +
    `  High (keep): ${stats.high}\n` +
    `  Normal: ${stats.normal}\n` +
    `  Low (drop candidate): ${stats.low}\n` +
    `  Drop: ${stats.drop}\n` +
    `  Would keep at "normal": ${stats.critical + stats.high + stats.normal} (${Math.round(((stats.critical + stats.high + stats.normal) / total) * 100)}%)\n` +
    `  Would keep at "high": ${stats.critical + stats.high} (${Math.round(((stats.critical + stats.high) / total) * 100)}%)`
  )
}