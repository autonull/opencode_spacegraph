import { For, Show, createMemo } from "solid-js"
import type { MountedSession } from "@opencode/plugin/gui"

type TextPart = { type: string; text?: string; name?: string }
type Message = { id: string; type: string; text?: string; content?: TextPart[] }

/**
 * A compact, read-only transcript derived from the session's own messages. The plugin's hybrid
 * surface uses it when the host transcript is not mounted, so the split is never an empty panel.
 */
export function HybridTranscript(props: { session: MountedSession }) {
  const messages = createMemo<Message[]>(() =>
    (props.session.server.data.session.message.list(props.session.id) as unknown as Message[]) ?? [],
  )

  return (
    <div class="sg-hybrid-transcript" data-slot="hybrid-transcript">
      <For each={messages()}>
        {(message) => (
          <Show when={message.type === "user" || message.type === "assistant"}>
            <div class="sg-hybrid-transcript__message" data-role={message.type === "user" ? "user" : "assistant"}>
              <Show when={message.type === "user"}>
                <div class="sg-hybrid-transcript__bubble">{message.text}</div>
              </Show>
              <Show when={message.type === "assistant"}>
                <For each={message.content ?? []}>
                  {(part) => (
                    <Show when={part.type === "text"}>
                      <div class="sg-hybrid-transcript__text">{part.text}</div>
                    </Show>
                  )}
                </For>
              </Show>
            </div>
          </Show>
        )}
      </For>
    </div>
  )
}
