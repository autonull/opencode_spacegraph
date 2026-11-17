import type { ExperimentalPersistentPtyConnectTokenInput, OpenCodeClient, PtyConnectTokenInput } from "../promise"
import { Option } from "effect"

export type PtyClientOptions = {
  readonly url: string
  readonly openSocket?: (url: URL) => WebSocket
}

export type PtyConnectInput = {
  readonly ptyID: PtyConnectTokenInput["ptyID"]
  readonly location?: PtyConnectTokenInput["location"]
  readonly cursor?: number
}

export type PersistentPtyConnectInput = {
  readonly ptyID: ExperimentalPersistentPtyConnectTokenInput["ptyID"]
  readonly cursor: number
  readonly attachmentID: string
  readonly takeover?: boolean
}

export function createPtyClient(api: OpenCodeClient, options: PtyClientOptions) {
  return {
    async connect(input: PtyConnectInput) {
      const result = await api.pty.connect.token({
        ptyID: input.ptyID,
        location: input.location,
        "x-opencode-ticket": "1",
      })
      const baseUrl = new URL(options.url)
      if (!baseUrl.pathname.endsWith("/")) baseUrl.pathname += "/"
      const url = new URL(`api/pty/${encodeURIComponent(input.ptyID)}/connect`, baseUrl)
      if (input.location?.directory) url.searchParams.set("location[directory]", input.location.directory)
      if (input.cursor !== undefined) url.searchParams.set("cursor", String(input.cursor))
      url.searchParams.set("ticket", result.data.ticket)
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:"

      const socket = options.openSocket?.(url) ?? new WebSocket(url)
      socket.binaryType = "arraybuffer"
      return socket
    },
  }
}

export function createPersistentPtyClient(api: OpenCodeClient, options: PtyClientOptions) {
  return {
    async connect(input: PersistentPtyConnectInput) {
      const token = await api.experimental.persistentPty.connectToken({
        ptyID: input.ptyID,
        "x-opencode-ticket": "1",
      })
      const baseUrl = new URL(options.url)
      if (!baseUrl.pathname.endsWith("/")) baseUrl.pathname += "/"
      const url = new URL(`api/experimental/persistent-pty/${encodeURIComponent(input.ptyID)}/connect`, baseUrl)
      url.searchParams.set("ticket", token.ticket)
      url.searchParams.set("cursor", String(input.cursor))
      url.searchParams.set("attachment_id", input.attachmentID)
      url.searchParams.set("takeover", String(input.takeover ?? false))
      url.searchParams.set("input_protocol", "1")
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:"

      const socket = options.openSocket?.(url) ?? new WebSocket(url)
      socket.binaryType = "arraybuffer"
      return socket
    },
  }
}

export interface PersistentPtySize {
  readonly cols: number
  readonly rows: number
}

export interface PersistentPtyAttachedMessage {
  readonly type: "attached"
  readonly inputProtocol: number
  readonly info: { readonly size: { readonly cols: number; readonly rows: number } }
  readonly role: "controller"
}

export interface PersistentPtyReplayCompleteMessage {
  readonly type: "replay_complete"
}

export interface PersistentPtyResizedMessage {
  readonly type: "resized"
  readonly cols: number
  readonly rows: number
  readonly checkpoint: string
}

export interface PersistentPtyControllerChangedMessage {
  readonly type: "controller_changed"
  readonly attachmentID: string | null
}

export interface PersistentPtyExitedMessage {
  readonly type: "exited"
  readonly exitCode: number | null
}

export interface PersistentPtyTitleChangedMessage {
  readonly type: "title_changed"
  readonly title: string
}

export interface PersistentPtyForegroundProcessChangedMessage {
  readonly type: "foreground_process_changed"
  readonly process: string | null
}

export type PersistentPtyMessage =
  | PersistentPtyAttachedMessage
  | PersistentPtyReplayCompleteMessage
  | PersistentPtyResizedMessage
  | PersistentPtyControllerChangedMessage
  | PersistentPtyExitedMessage
  | PersistentPtyTitleChangedMessage
  | PersistentPtyForegroundProcessChangedMessage

function decodeAttached(input: unknown): Option.Option<PersistentPtyAttachedMessage> {
  const obj = input as Record<string, unknown>
  if (obj.type !== "attached" || obj.inputProtocol !== 1 || obj.role !== "controller") return Option.none()
  const info = obj.info as Record<string, unknown> | undefined
  if (!info || typeof info.size !== "object" || info.size === null) return Option.none()
  const size = info.size as Record<string, unknown>
  if (typeof size.cols !== "number" || typeof size.rows !== "number") return Option.none()
  return Option.some({
    type: "attached",
    inputProtocol: 1,
    info: { size: { cols: size.cols, rows: size.rows } },
    role: "controller",
  })
}

function decodeReplayComplete(input: unknown): Option.Option<PersistentPtyReplayCompleteMessage> {
  const obj = input as Record<string, unknown>
  if (obj.type !== "replay_complete") return Option.none()
  return Option.some({ type: "replay_complete" })
}

function decodeResized(input: unknown): Option.Option<PersistentPtyResizedMessage> {
  const obj = input as Record<string, unknown>
  if (obj.type !== "resized") return Option.none()
  if (typeof obj.cols !== "number" || typeof obj.rows !== "number") return Option.none()
  if (typeof obj.checkpoint !== "string") return Option.none()
  return Option.some({ type: "resized", cols: obj.cols, rows: obj.rows, checkpoint: obj.checkpoint })
}

function decodeControllerChanged(input: unknown): Option.Option<PersistentPtyControllerChangedMessage> {
  const obj = input as Record<string, unknown>
  if (obj.type !== "controller_changed") return Option.none()
  if (obj.attachmentID !== null && typeof obj.attachmentID !== "string") return Option.none()
  return Option.some({ type: "controller_changed", attachmentID: obj.attachmentID as string | null })
}

function decodeExited(input: unknown): Option.Option<PersistentPtyExitedMessage> {
  const obj = input as Record<string, unknown>
  if (obj.type !== "exited") return Option.none()
  if (obj.exitCode !== null && typeof obj.exitCode !== "number") return Option.none()
  return Option.some({ type: "exited", exitCode: obj.exitCode as number | null })
}

function decodeTitleChanged(input: unknown): Option.Option<PersistentPtyTitleChangedMessage> {
  const obj = input as Record<string, unknown>
  if (obj.type !== "title_changed") return Option.none()
  if (typeof obj.title !== "string") return Option.none()
  return Option.some({ type: "title_changed", title: obj.title })
}

function decodeForegroundProcessChanged(input: unknown): Option.Option<PersistentPtyForegroundProcessChangedMessage> {
  const obj = input as Record<string, unknown>
  if (obj.type !== "foreground_process_changed") return Option.none()
  if (obj.process !== null && typeof obj.process !== "string") return Option.none()
  return Option.some({ type: "foreground_process_changed", process: obj.process as string | null })
}

/**
 * Decodes a persistent PTY message from a JSON string.
 * Returns Some(decoded_message) for known message types with only the fields clients read,
 * or None for unknown types or malformed input.
 */
export function decodePersistentPtyMessage(json: string): Option.Option<PersistentPtyMessage> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return Option.none()
  }

  if (typeof parsed !== "object" || parsed === null) return Option.none()

  return (
    decodeAttached(parsed) ||
    decodeReplayComplete(parsed) ||
    decodeResized(parsed) ||
    decodeControllerChanged(parsed) ||
    decodeExited(parsed) ||
    decodeTitleChanged(parsed) ||
    decodeForegroundProcessChanged(parsed)
  )
}

/**
 * Encodes a persistent PTY frame.
 * Frame format:
 * - Size frame (type 0): [0, cols_high, cols_low, rows_high, rows_low]
 * - Input frame (type 1): [1, cols_high, cols_low, rows_high, rows_low, ...data]
 */
export function persistentPtyFrame(size: PersistentPtySize, data?: Uint8Array): Uint8Array {
  const { cols, rows } = size
  const colsHigh = (cols >> 8) & 0xff
  const colsLow = cols & 0xff
  const rowsHigh = (rows >> 8) & 0xff
  const rowsLow = rows & 0xff

  if (data === undefined) {
    // Size frame
    return new Uint8Array([0, colsHigh, colsLow, rowsHigh, rowsLow])
  } else {
    // Input frame
    const frame = new Uint8Array(5 + data.length)
    frame[0] = 1
    frame[1] = colsHigh
    frame[2] = colsLow
    frame[3] = rowsHigh
    frame[4] = rowsLow
    frame.set(data, 5)
    return frame
  }
}
