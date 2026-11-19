import { ErrorBoundary, Suspense, type ParentProps } from "solid-js"

type Translate = (key: string) => string

/**
 * Contains a lazily imported graph surface. A module-load failure is caught here instead of
 * propagating to the session route, so the transcript stays mounted and usable. The fallback keeps
 * the app-level copy and returns the reader to the transcript surface.
 */
export function GraphLoadBoundary(props: ParentProps<{ t: Translate; onBack: () => void; silent?: boolean }>) {
  return (
    <ErrorBoundary
      fallback={
        props.silent ? null : (
          <div
            data-slot="session-graph-error"
            class="flex size-full flex-col items-center justify-center gap-3 p-6 text-center"
          >
            <div class="flex flex-col items-center gap-1">
              <div class="text-14-medium text-text-strong">{props.t("session.graph.error")}</div>
              <div class="max-w-md text-13-regular text-text-weak">{props.t("session.graph.error.description")}</div>
            </div>
            <button
              type="button"
              class="rounded-md border border-v2-border-border-base px-3 py-1.5 text-13-medium text-text-base hover:bg-v2-overlay-simple-overlay-hover"
              onClick={props.onBack}
            >
              {props.t("session.graph.back")}
            </button>
          </div>
        )
      }
    >
      <Suspense fallback={props.silent ? null : <div data-slot="session-graph-loading" class="h-full w-full" />}>
        {props.children}
      </Suspense>
    </ErrorBoundary>
  )
}
