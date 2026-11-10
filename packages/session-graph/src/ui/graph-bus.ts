import type { GraphCommandName } from "./graph-commands"

/**
 * Scoped event bus for a single SessionGraph instance.
 * Each graph instance owns its bus; a host-level router forwards window events to the active instance.
 */
export interface GraphBus {
  /** Emit a command to this instance's subscribers. */
  emit(name: GraphCommandName, payload?: { source?: string }): void
  /** Subscribe to commands for this instance. Returns an unsubscribe function. */
  on(handler: (name: GraphCommandName, payload?: { source?: string }) => void): () => void
  /** Get the instance ID this bus belongs to. */
  instanceId: string
}

/**
 * Creates a new scoped event bus for a graph instance.
 */
export function createGraphBus(instanceId: string): GraphBus {
  const handlers = new Set<(name: GraphCommandName, payload?: { source?: string }) => void>()

  return {
    instanceId,
    emit(name: GraphCommandName, payload?: { source?: string }) {
      for (const handler of handlers) {
        handler(name, payload)
      }
    },
    on(handler: (name: GraphCommandName, payload?: { source?: string }) => void) {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
  }
}