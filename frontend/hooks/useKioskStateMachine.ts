import { useReducer } from 'react'
import type { KioskPhase, AvatarState, ConversationMessage, KioskError } from '../types/kiosk'
import type { TriageDocument, PatientSummary } from '../types/patient'
import { extractPatientSummary } from '../lib/informationBoundary'

export interface KioskState {
    phase: KioskPhase
    avatarState: AvatarState
    messages: ConversationMessage[]
    triageDocument: TriageDocument | null
    patientSummary: PatientSummary | null
    isProcessing: boolean
    error: KioskError | null
}

export type KioskAction =
    | { type: 'START_CONVERSATION' }
    | { type: 'AGENT_SPEAKING' }
    | { type: 'PATIENT_SPEAKING' }
    | { type: 'IDLE' }
    | { type: 'TOOL_RUNNING'; tool: string }
    | { type: 'TOOL_COMPLETE'; tool: string }
    | { type: 'ADD_MESSAGE'; message: ConversationMessage }
    | { type: 'SESSION_END'; triageDocument: TriageDocument }
    | { type: 'CONFIRM_VALIDATION' }
    | { type: 'CORRECT_INFO' }
    | { type: 'RESET' }
    | { type: 'SET_ERROR'; error: KioskError }
    | { type: 'CLEAR_ERROR' }

export const initialKioskState: KioskState = {
    phase: 'welcome',
    avatarState: 'idle',
    messages: [],
    triageDocument: null,
    patientSummary: null,
    isProcessing: false,
    error: null,
}

export function kioskReducer(state: KioskState, action: KioskAction): KioskState {
    switch (action.type) {
        case 'START_CONVERSATION': {
            if (state.phase !== 'welcome') return state
            return { ...state, phase: 'conversation', avatarState: 'idle' }
        }

        case 'AGENT_SPEAKING': {
            if (state.phase !== 'conversation') return state
            return { ...state, avatarState: 'talking' }
        }

        case 'PATIENT_SPEAKING': {
            if (state.phase !== 'conversation') return state
            return { ...state, avatarState: 'listening' }
        }

        case 'IDLE': {
            if (state.phase !== 'conversation') return state
            return { ...state, avatarState: 'idle' }
        }

        case 'TOOL_RUNNING': {
            if (state.phase !== 'conversation') return state
            return { ...state, avatarState: 'talking', isProcessing: true }
        }

        case 'TOOL_COMPLETE': {
            if (state.phase !== 'conversation') return state
            return { ...state, isProcessing: false }
        }

        case 'ADD_MESSAGE': {
            if (state.phase !== 'conversation') return state
            return { ...state, messages: [...state.messages, action.message] }
        }

        case 'SESSION_END': {
            if (state.phase !== 'conversation') return state
            const patientSummary = extractPatientSummary(action.triageDocument)
            return {
                ...state,
                phase: 'validation',
                triageDocument: action.triageDocument,
                patientSummary,
                isProcessing: false,
            }
        }

        case 'CONFIRM_VALIDATION': {
            if (state.phase !== 'validation') return state
            return { ...state, phase: 'ticket', avatarState: 'happy' }
        }

        case 'CORRECT_INFO': {
            if (state.phase !== 'validation') return state
            return { ...state, phase: 'conversation' }
        }

        case 'RESET': {
            return { ...initialKioskState }
        }

        case 'SET_ERROR': {
            return { ...state, error: action.error }
        }

        case 'CLEAR_ERROR': {
            return { ...state, error: null }
        }

        default:
            return state
    }
}

export function useKioskStateMachine() {
    const [state, dispatch] = useReducer(kioskReducer, initialKioskState)
    return { state, dispatch }
}
