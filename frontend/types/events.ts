import type { TriageDocument } from './patient'

// ── Server → Client events ──────────────────────────────────────────

export interface SessionStartEvent {
    type: 'sessionStart'
    timestamp: string
}

export interface SessionEndEvent {
    type: 'sessionEnd'
    timestamp: string
    triageDocument: TriageDocument
}

export interface AudioDataEvent {
    type: 'audioData'
    timestamp: string
    /** Base64-encoded PCM 24kHz (fallback when binary frames unavailable) */
    data: string
}

export interface TextOutputEvent {
    type: 'textOutput'
    timestamp: string
    role: 'agent' | 'user'
    content: string
}

export interface ToolUseEvent {
    type: 'toolUse'
    timestamp: string
    tool: string
    status: 'running'
}

export interface ToolResultEvent {
    type: 'toolResult'
    timestamp: string
    tool: string
    status: 'complete' | 'error'
}

export interface ErrorEvent {
    type: 'error'
    timestamp: string
    message: string
}

/** Union of all server-to-client WebSocket events */
export type WSEvent =
    | SessionStartEvent
    | SessionEndEvent
    | AudioDataEvent
    | TextOutputEvent
    | ToolUseEvent
    | ToolResultEvent
    | ErrorEvent

// ── Client → Server events ──────────────────────────────────────────

export interface TextInputEvent {
    type: 'textInput'
    content: string
}
