import { createSignal } from "solid-js"
import { EXPECTED_CONTRACT_VERSION } from "../canvas/renderer-registry"

export type GraphFallbackProps = {
  error: string | undefined
  rendererID: string | undefined
}

export const GraphFallback = (props: GraphFallbackProps) => {
  const [copied, setCopied] = createSignal(false)

  const copyReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      renderer: props.rendererID ?? "unknown",
      contractVersion: EXPECTED_CONTRACT_VERSION,
      error: props.error ?? "unknown error",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    }
    const text = JSON.stringify(report, null, 2)
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!props.error) return null

  return (
    <div
      data-slot="graph-fallback"
      class="border-b border-border-weaker-base bg-surface-base px-2 py-1 text-12-regular text-text-weak"
    >
      <div class="flex items-center justify-between">
        <span>Graph renderer error: {props.error}</span>
        <button
          type="button"
          class="ms-2 text-12-regular text-text-base hover:text-text-emphasis transition-colors"
          onClick={copyReport}
          aria-label="Copy error report"
        >
          {copied() ? "Copied!" : "Copy report"}
        </button>
      </div>
      <details class="mt-1">
        <summary class="cursor-pointer text-12-regular text-text-weak">
          Error details
        </summary>
        <pre class="mt-1 text-11-regular text-text-weaker overflow-auto max-h-40 whitespace-pre-wrap">
          {props.error}
        </pre>
      </details>
    </div>
  )
}
