/** Phases the kiosk UI can be in */
export type KioskPhase = 'welcome' | 'conversation' | 'validation' | 'ticket'

/** A single message in the AI conversation */
export interface ConversationMessage {
  id: string
  role: 'assistant' | 'patient'
  text: string
  timestamp: number
}

/** Visual states for the animated avatar */
export type AvatarState = 'idle' | 'waving' | 'talking' | 'listening' | 'happy'

/** Sections displayed in the validation/summary view */
export type InfoSection =
  | 'identite'
  | 'motif'
  | 'symptomes'
  | 'antecedents'
  | 'traitements'
  | 'allergies'
