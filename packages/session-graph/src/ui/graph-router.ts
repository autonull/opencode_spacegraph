import type { GraphBus } from "./graph-bus"
import { isGraphCommandName } from "./graph-commands"

let activeInstanceId: string | null = null
const instanceBuses = new Map<string, GraphBus>()
let globalListenerBound = false

/**
 * Register a graph instance's bus with the router.
 * Only one instance can be active at a time (the one with pointer/focus).
 */
export function registerGraphBus(bus: GraphBus): () => void {
  instanceBuses.set(bus.instanceId, bus)

  // Bind the global listener on first registration
  if (!globalListenerBound && typeof window !== "undefined") {
    window.addEventListener("graph:command", handleGlobalCommand)
    globalListenerBound = true
  }

  return () => {
    instanceBuses.delete(bus.instanceId)
    if (activeInstanceId === bus.instanceId) {
      activeInstanceId = null
    }
    // Unbind global listener if no more instances
    if (instanceBuses.size === 0 && globalListenerBound) {
      window.removeEventListener("graph:command", handleGlobalCommand)
      globalListenerBound = false
    }
  }
}

/**
 * Set the active instance (the one that should receive commands).
 * Called when an instance gains pointer/focus.
 */
export function setActiveGraphInstance(instanceId: string | null): void {
  if (instanceId !== null && !instanceBuses.has(instanceId)) {
    return // Ignore unknown instances
  }
  activeInstanceId = instanceId
}

/**
 * Get the currently active instance ID.
 */
export function getActiveGraphInstance(): string | null {
  return activeInstanceId
}

/**
 * Get the bus for a specific instance.
 */
export function getGraphBus(instanceId: string): GraphBus | undefined {
  return instanceBuses.get(instanceId)
}

/**
 * Handle global graph:command events and forward to the active instance.
 */
function handleGlobalCommand(event: Event): void {
  const detail = (event as CustomEvent<{ name?: string; source?: string }>).detail
  const name = detail?.name

  if (!name || !isGraphCommandName(name)) return

  const bus = activeInstanceId ? instanceBuses.get(activeInstanceId) : undefined
  if (bus) {
    bus.emit(name, { source: detail?.source })
  }
}