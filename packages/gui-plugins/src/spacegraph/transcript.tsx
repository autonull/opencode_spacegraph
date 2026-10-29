import { For, createMemo } from "solid-js"
import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import type { SessionMessageInfo } from "@opencode/client/promise"

interface TranscriptProps {
  session: MountedSession
  screen: SessionScreen
  t: (key: string, params?: Record<string, string | number>) => string
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

function getToolInput(part: { state: { input?: { [x: string]: unknown } | string } }) {
  const input = part.state.input
  return typeof input === "object" ? input : undefined
}

export function Transcript(props: TranscriptProps) {
  const messages = createMemo(() => props.session.server.data.session.message.list(props.session.id))

  return (
    <div class="flex-1 min-h-0 overflow-auto p-4 md:px-6 space-y-4" data-slot="spacegraph-transcript">
      <For each={messages()}>
        {(message: SessionMessageInfo) => (
          <div class="flex gap-3" data-message-id={message.id}>
            <div class="shrink-0 w-8 text-center text-v2-text-text-muted text-xs font-mono">
              {formatTime(new Date(message.time.created))}
            </div>
            <div class="flex-1 min-w-0">
              {message.type === "user" && (
                <div class="space-y-1">
                  <div class="text-v2-text-text-base font-medium">{props.t("session.messages.you")}</div>
                  <div class="text-v2-text-text-base whitespace-pre-wrap">{message.text}</div>
                  {message.files?.length && (
                    <div class="text-v2-text-text-muted text-xs mt-1">
                      {message.files.map((f) => f.name ?? "file").join(", ")}
                    </div>
                  )}
                </div>
              )}
              {message.type === "assistant" && (
                <div class="space-y-1">
                  <div class="text-v2-text-text-base font-medium">{props.t("session.messages.assistant")}</div>
                  <For each={message.content}>
                    {(part) => (
                      <div class="text-v2-text-text-base whitespace-pre-wrap">
                        {part.type === "text" && part.text}
                        {part.type === "reasoning" && (
                          <details class="text-v2-text-text-muted text-sm">
                            <summary>{props.t("session.messages.reasoning")}</summary>
                            <div class="whitespace-pre-wrap mt-1">{part.text}</div>
                          </details>
                        )}
                        {part.type === "tool" && (
                          <div class="text-v2-text-text-muted text-sm font-mono">
                            {part.name}: {JSON.stringify(getToolInput(part) ?? {}).slice(0, 80)}…
                          </div>
                        )}
                      </div>
                    )}
                  </For>
                </div>
              )}
              {message.type === "system" && (
                <div class="text-v2-text-text-muted text-sm italic">{message.text}</div>
              )}
              {message.type === "synthetic" && (
                <div class="text-v2-text-text-muted text-sm italic">{message.description ?? message.text}</div>
              )}
            </div>
          </div>
        )}
      </For>
      <div class="h-8" />
    </div>
  )
}