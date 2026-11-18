import { Metrics } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { createMemo, createSignal, onCleanup, onMount } from "solid-js"

/**
 * T2.3 — the dry-run readout.
 *
 * The protocol asks whether a task takes three interactions or fewer, which is a measurement, not an
 * estimate. The counter is off until this mounts, and the app mounts it only when the URL carries
 * `graphMetrics=1`, so the numbers exist for a study and nowhere else. Nothing leaves the browser:
 * no telemetry, no network, no storage.
 */
export function GraphMetricsReadout() {
  const i18n = useI18n()
  const [counts, setCounts] = createSignal(Metrics.counts())

  onMount(() => {
    Metrics.enable()

    return Metrics.subscribe(setCounts)
  })

  onCleanup(() => Metrics.disable())

  const total = createMemo(() => Object.values(counts()).reduce((sum, value) => sum + value, 0))

  const breakdown = createMemo(() =>
    Object.entries(counts())
      .filter(([, value]) => value > 0)
      .map(([action, value]) => `${action} ${value}`)
      .join(" · "),
  )

  return (
    <div
      data-slot="graph-metrics"
      class="fixed bottom-3 start-3 z-50 flex items-center gap-2 rounded-md border border-border-weaker-base bg-surface-base px-2 py-1 shadow-md"
    >
      <span class="text-12-regular text-text-base" title={breakdown()}>
        {i18n.plural("ui.sessionGraph.metrics.interactions", total())}
      </span>
      <button
        type="button"
        class="text-12-regular text-text-weak hover:text-text-strong"
        onClick={() => Metrics.reset()}
      >
        {i18n.t("ui.sessionGraph.metrics.reset")}
      </button>
    </div>
  )
}
