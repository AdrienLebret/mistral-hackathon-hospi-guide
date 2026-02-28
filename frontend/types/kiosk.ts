import type { PatientSummary } from './patient'

/** Phases the kiosk UI can be in — sequential 4-phase patient flow */
export type KioskPhase = 'welcome' | 'conversation' | 'validation' | 'ticket'

/** Visual states for the animated pixel art avatar */
export type AvatarState = 'idle' | 'waving' | 'talking' | 'listening' | 'happy'

/** A single message in the voice conversation transcript */
export interface ConversationMessage {
    id: string
    role: 'agent' | 'patient'
    text: string
    timestamp: number
}

/** Error codes and French user-facing messages for kiosk failures */
export interface KioskError {
    code: 'ws_disconnected' | 'ws_timeout' | 'mic_denied' | 'audio_error' | 'unknown'
    /** French, non-technical message displayed to the patient */
    message: string
}

/** Data rendered on the final QR ticket screen */
export interface TicketData {
    qrToken: string
    /** ISO 8601 */
    arrivalTime: string
    patientSummary: PatientSummary
}

// Re-export PatientSummary so consumers can import from either file
export type { PatientSummary } from './patient'
