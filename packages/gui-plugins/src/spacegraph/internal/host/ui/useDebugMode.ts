import { createMemo } from "solid-js"

export type UseDebugModeReturn = {
  debugMode: () => boolean
}

export function useDebugMode(): UseDebugModeReturn {
  const debugMode = createMemo(() => {
    if (typeof window === "undefined") return false
    const params = new URLSearchParams(window.location.search)
    if (params.get("debug") === "true") return true
    try {
      return localStorage.getItem("debugGraph") === "true"
    } catch {
      return false
    }
  })

  return { debugMode }
}