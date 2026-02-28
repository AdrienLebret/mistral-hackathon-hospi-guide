'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useKioskStateMachine } from '../hooks/useKioskStateMachine'
import { useWebSocket } from '../hooks/useWebSocket'
import { AudioCaptureService } from '../components/audio/AudioCaptureService'
import { AudioPlaybackService } from '../components/audio/AudioPlaybackService'
import ProgressBar from '../components/ProgressBar'
import ErrorOverlay from '../components/ErrorOverlay'
import WelcomeView from '../views/WelcomeView'
import ConversationView from '../views/ConversationView'
import ValidationView from '../views/ValidationView'
import TicketView from '../views/TicketView'
import type { WSEvent } from '../types/events'
import type { TicketData } from '../types/kiosk'

const WS_URL = 'ws://localhost:8000/ws'

export default function KioskPage() {
    const { state, dispatch } = useKioskStateMachine()
    const [ticketData, setTicketData] = useState<TicketData | null>(null)
    const [processingTool, setProcessingTool] = useState<string | null>(null)

    // Audio service refs — persist across renders, created lazily
    const captureRef = useRef<AudioCaptureService | null>(null)
    const playbackRef = useRef<AudioPlaybackService | null>(null)

    // Track previous phase for cleanup
    const prevPhaseRef = useRef(state.phase)

    // ── WebSocket event handler ──────────────────────────────────────

    const handleWSEvent = useCallback(
        (event: WSEvent) => {
            switch (event.type) {
                case 'sessionStart':
                    // Timeout already cleared by the hook
                    break

                case 'textOutput': {
                    const role = event.role === 'user' ? 'patient' : 'agent'
                    dispatch({
                        type: 'ADD_MESSAGE',
                        message: {
                            id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                            role,
                            text: event.content,
                            timestamp: Date.now(),
                        },
                    })
                    if (event.role === 'agent') {
                        dispatch({ type: 'AGENT_SPEAKING' })
                    } else {
                        dispatch({ type: 'PATIENT_SPEAKING' })
                    }
                    break
                }

                case 'toolUse':
                    setProcessingTool(event.tool)
                    dispatch({ type: 'TOOL_RUNNING', tool: event.tool })
                    break

                case 'toolResult':
                    setProcessingTool(null)
                    dispatch({ type: 'TOOL_COMPLETE', tool: event.tool })
                    break

                case 'sessionEnd':
                    dispatch({
                        type: 'SESSION_END',
                        triageDocument: event.triageDocument,
                    })
                    break

                case 'error':
                    dispatch({
                        type: 'SET_ERROR',
                        error: {
                            code: 'unknown',
                            message: event.message,
                        },
                    })
                    break

                case 'audioData':
                    // Fallback base64 audio — decode and play
                    // (primary path uses binary frames via onBinary)
                    break
            }
        },
        [dispatch],
    )

    // ── WebSocket binary handler (audio playback) ────────────────────

    const handleWSBinary = useCallback((data: ArrayBuffer) => {
        playbackRef.current?.playChunk(data)
    }, [])

    // ── WebSocket error handler ──────────────────────────────────────

    const handleWSError = useCallback(
        (error: { code: string; message: string }) => {
            dispatch({
                type: 'SET_ERROR',
                error: {
                    code: error.code as 'ws_disconnected' | 'ws_timeout' | 'mic_denied' | 'audio_error' | 'unknown',
                    message: error.message,
                },
            })
        },
        [dispatch],
    )

    const { isConnected, connect, disconnect, sendAudio, sendText } = useWebSocket({
        url: WS_URL,
        onEvent: handleWSEvent,
        onBinary: handleWSBinary,
        onError: handleWSError,
    })

    // ── Audio lifecycle: start/stop on conversation phase ────────────

    useEffect(() => {
        const entered = prevPhaseRef.current !== 'conversation' && state.phase === 'conversation'
        const exited = prevPhaseRef.current === 'conversation' && state.phase !== 'conversation'

        prevPhaseRef.current = state.phase

        if (entered) {
            // Create fresh audio services
            captureRef.current = new AudioCaptureService()
            playbackRef.current = new AudioPlaybackService()

            // Start mic capture, pipe chunks to WebSocket
            captureRef.current.start((pcm) => {
                sendAudio(pcm)
            }).catch(() => {
                dispatch({
                    type: 'SET_ERROR',
                    error: {
                        code: 'mic_denied',
                        message:
                            'Microphone access is required for the conversation. Please allow microphone access in your browser settings.',
                    },
                })
            })
        }

        if (exited) {
            // Stop capture and release mic
            captureRef.current?.stop()
            captureRef.current = null

            // Dispose playback and release AudioContext
            playbackRef.current?.dispose()
            playbackRef.current = null
        }
    }, [state.phase, sendAudio, dispatch])

    // ── Barge-in: stop playback when patient starts speaking ─────────

    useEffect(() => {
        if (state.avatarState === 'listening') {
            playbackRef.current?.stop()
        }
    }, [state.avatarState])

    // ── View callbacks ───────────────────────────────────────────────

    const handleStart = useCallback(() => {
        dispatch({ type: 'START_CONVERSATION' })
        connect()
    }, [dispatch, connect])

    const handleConfirmValidation = useCallback(() => {
        // Generate ticket data before transitioning
        const patientId = `PAT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
        const ticket: TicketData = {
            qrToken: `${patientId}:${crypto.randomUUID()}`,
            arrivalTime: new Date().toISOString(),
            patientSummary: state.patientSummary ?? {
                chiefComplaint: '',
                declaredSymptoms: [],
                medicalHistory: [],
                medications: [],
                allergies: [],
            },
        }
        setTicketData(ticket)
        dispatch({ type: 'CONFIRM_VALIDATION' })
    }, [dispatch, state.patientSummary])

    const handleCorrectInfo = useCallback(() => {
        dispatch({ type: 'CORRECT_INFO' })
        connect()
    }, [dispatch, connect])

    const handleReset = useCallback(() => {
        setTicketData(null)
        dispatch({ type: 'RESET' })
    }, [dispatch])

    const handleErrorDismiss = useCallback(() => {
        dispatch({ type: 'CLEAR_ERROR' })
        dispatch({ type: 'RESET' })
    }, [dispatch])

    // ── Render ───────────────────────────────────────────────────────

    return (
        <main className="relative flex min-h-screen flex-col bg-mistral-dark">
            {/* Progress bar — always visible at top */}
            <ProgressBar currentPhase={state.phase} />

            {/* Phase views with animated transitions */}
            <div className="flex-1">
                <AnimatePresence mode="wait">
                    {state.phase === 'welcome' && (
                        <WelcomeView key="welcome" onStart={handleStart} />
                    )}
                    {state.phase === 'conversation' && (
                        <ConversationView
                            key="conversation"
                            avatarState={state.avatarState}
                            messages={state.messages}
                            isProcessing={state.isProcessing}
                            processingTool={processingTool}
                        />
                    )}
                    {state.phase === 'validation' && (
                        <ValidationView
                            key="validation"
                            patientSummary={state.patientSummary}
                            onConfirm={handleConfirmValidation}
                            onCorrect={handleCorrectInfo}
                        />
                    )}
                    {state.phase === 'ticket' && (
                        <TicketView
                            key="ticket"
                            ticketData={ticketData}
                            onReset={handleReset}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Error overlay — always mounted, shows when error is non-null */}
            <ErrorOverlay error={state.error} onDismiss={handleErrorDismiss} />
        </main>
    )
}
