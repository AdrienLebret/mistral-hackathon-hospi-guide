import type { WSEvent, TextInputEvent } from '../types/events'

/** All valid server → client event types */
const VALID_SERVER_EVENT_TYPES = new Set([
    'sessionStart',
    'sessionEnd',
    'audioData',
    'textOutput',
    'toolUse',
    'toolResult',
    'error',
] as const)

/**
 * Parse an incoming JSON frame from the WebSocket into a typed WSEvent.
 * Throws on invalid JSON or unknown event types.
 */
export function parseServerEvent(data: string): WSEvent {
    const parsed = JSON.parse(data)

    if (typeof parsed !== 'object' || parsed === null || typeof parsed.type !== 'string') {
        throw new Error(`Invalid event: missing or non-string "type" field`)
    }

    if (!VALID_SERVER_EVENT_TYPES.has(parsed.type)) {
        throw new Error(`Unknown server event type: "${parsed.type}"`)
    }

    return parsed as WSEvent
}

/**
 * Serialize a text input message for sending to the backend.
 * Returns a JSON string with `{ type: "textInput", content: "..." }`.
 */
export function serializeTextInput(content: string): string {
    const event: TextInputEvent = { type: 'textInput', content }
    return JSON.stringify(event)
}
