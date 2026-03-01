import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioPlayer } from '@/audio/AudioPlayer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface TranscriptEntry {
  id: string
  role: 'user' | 'assistant'
  text: string
  isFinal: boolean
  timestamp: number
}

export interface ProfileUpdate {
  section: string
  data: Record<string, unknown>
  timestamp: number
}

export interface CompilationResult {
  identity?: Record<string, unknown>
  clinical?: Record<string, unknown>
}

export interface VoiceSessionState {
  connectionState: VoiceConnectionState
  isListening: boolean
  isSpeaking: boolean
  transcripts: TranscriptEntry[]
  profileUpdates: ProfileUpdate[]
  error: string | null
  triageDocument: Record<string, unknown> | null
  compilationResult: CompilationResult | null
  sessionEnded: boolean
}

export interface VoiceSessionActions {
  connect: () => Promise<void>
  disconnect: () => void
  toggleMicrophone: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVoiceSession(
  backendUrl: string,
): [VoiceSessionState, VoiceSessionActions] {
  const [connectionState, setConnectionState] = useState<VoiceConnectionState>('disconnected')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [profileUpdates, setProfileUpdates] = useState<ProfileUpdate[]>([])
  const [triageDocument, setTriageDocument] = useState<Record<string, unknown> | null>(null)
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null)
  const [sessionEnded, setSessionEnded] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const playerRef = useRef<AudioPlayer | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const transcriptIdRef = useRef(0)
  const keepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const connStateRef = useRef<VoiceConnectionState>('disconnected')

  // Track live (non-final) transcripts by role to accumulate deltas
  const liveUserRef = useRef<string | null>(null)
  const liveAssistantRef = useRef<string | null>(null)

  // Keep ref in sync with state
  const setConnState = useCallback((s: VoiceConnectionState) => {
    connStateRef.current = s
    setConnectionState(s)
  }, [])

  // ── Cleanup helper ─────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    // Stop keepalive
    if (keepaliveRef.current) {
      clearInterval(keepaliveRef.current)
      keepaliveRef.current = null
    }
    // Stop microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (workletRef.current) {
      workletRef.current.disconnect()
      workletRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    // Stop player
    if (playerRef.current) {
      playerRef.current.close()
      playerRef.current = null
    }
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsListening(false)
    setIsSpeaking(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup])

  // ── Start microphone capture ───────────────────────────────────────
  const startMicrophone = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    streamRef.current = stream

    const audioCtx = new AudioContext({ sampleRate: 16000 })
    audioCtxRef.current = audioCtx

    await audioCtx.audioWorklet.addModule('/pcm-worklet.js')

    const source = audioCtx.createMediaStreamSource(stream)
    const worklet = new AudioWorkletNode(audioCtx, 'pcm-processor')
    workletRef.current = worklet

    worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(e.data)
      }
    }

    source.connect(worklet)
    // Don't connect worklet to destination — we don't want to hear ourselves
    setIsListening(true)
  }, [])

  // ── Stop microphone ────────────────────────────────────────────────
  const stopMicrophone = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (workletRef.current) {
      workletRef.current.disconnect()
      workletRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    setIsListening(false)
  }, [])

  // ── Connect to backend ─────────────────────────────────────────────
  const connect = useCallback(async () => {
    setConnState('connecting')
    setError(null)
    setTranscripts([])
    setProfileUpdates([])
    setTriageDocument(null)
    setCompilationResult(null)
    setSessionEnded(false)
    transcriptIdRef.current = 0
    liveUserRef.current = null
    liveAssistantRef.current = null

    // Build WebSocket URL
    const wsUrl = `${backendUrl}/ws/voice`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      // Create audio player
      const player = new AudioPlayer()
      playerRef.current = player

      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'session.start' }))
      }

      ws.onmessage = async (event: MessageEvent) => {
        // Binary → audio playback
        if (event.data instanceof ArrayBuffer) {
          await player.resume()
          player.playChunk(event.data)
          return
        }

        // Text → JSON event
        try {
          const msg = JSON.parse(event.data as string) as Record<string, unknown>

          switch (msg.type) {
            case 'session.started':
              setConnState('connected')
              // Start keepalive — send silence frames every 10s to prevent
              // Nova Sonic 2 from timing out (55s inactivity limit)
              keepaliveRef.current = setInterval(() => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  // 320 samples of silence (20ms at 16kHz) — Int16 zeros
                  const silence = new ArrayBuffer(640)
                  wsRef.current.send(silence)
                }
              }, 10_000)
              // Start microphone after session is acknowledged
              try {
                await startMicrophone()
              } catch (err) {
                setError(`Microphone error: ${err}`)
              }
              break

            case 'transcript': {
              const role = msg.role as 'user' | 'assistant'
              const text = msg.text as string
              const isFinal = msg.isFinal as boolean

              if (isFinal) {
                // Clear live ref
                if (role === 'user') liveUserRef.current = null
                else liveAssistantRef.current = null

                setTranscripts(prev => {
                  // Remove any non-final (live) entry for this role
                  const filtered = prev.filter(
                    t => !(t.role === role && !t.isFinal),
                  )

                  // Merge consecutive same-role finals into ONE bubble.
                  // Nova Sonic sends a separate final for each sentence,
                  // but we want a single bubble per agent/user turn.
                  const last = filtered.length > 0 ? filtered[filtered.length - 1] : null
                  if (last && last.role === role && last.isFinal) {
                    // Append to the existing bubble
                    return filtered.map((t, i) =>
                      i === filtered.length - 1
                        ? { ...t, text: t.text + ' ' + text, timestamp: Date.now() }
                        : t,
                    )
                  }

                  // Different role → new bubble
                  transcriptIdRef.current++
                  const id = `t-${transcriptIdRef.current}`
                  return [...filtered, { id, role, text, isFinal: true, timestamp: Date.now() }]
                })
              } else {
                // Update or create the live entry
                const liveId = role === 'user' ? 'live-user' : 'live-assistant'
                if (role === 'user') liveUserRef.current = text
                else liveAssistantRef.current = text

                setTranscripts(prev => {
                  const filtered = prev.filter(t => t.id !== liveId)
                  return [...filtered, { id: liveId, role, text, isFinal: false, timestamp: Date.now() }]
                })
              }
              break
            }

            case 'audio.start':
              setIsSpeaking(true)
              break

            case 'audio.end':
              setIsSpeaking(false)
              player.flush()
              break

            case 'profile.update':
              setProfileUpdates(prev => [
                ...prev,
                {
                  section: msg.section as string,
                  data: msg.data as Record<string, unknown>,
                  timestamp: Date.now(),
                },
              ])
              break

            case 'triage.complete':
              setTriageDocument(msg.document as Record<string, unknown>)
              break

            case 'compilation.complete':
              setCompilationResult(msg.data as CompilationResult)
              break

            case 'session.ended':
              setSessionEnded(true)
              setConnState('disconnected')
              stopMicrophone()
              break

            case 'error':
              setError(msg.message as string)
              break

            case 'pong':
              break
          }
        } catch {
          // Ignore non-JSON text frames
        }
      }

      ws.onerror = () => {
        setError('WebSocket connection error')
        setConnState('error')
      }

      ws.onclose = () => {
        // Use ref to avoid stale closure over connectionState
        if (connStateRef.current !== 'disconnected') {
          setConnState('disconnected')
        }
        stopMicrophone()
      }
    } catch (err) {
      setError(`Connection failed: ${err}`)
      setConnState('error')
    }
  }, [backendUrl, setConnState, startMicrophone, stopMicrophone])

  // ── Disconnect ─────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'session.stop' }))
    }
    cleanup()
    setConnState('disconnected')
    setSessionEnded(true)
  }, [cleanup, setConnState])

  // ── Toggle microphone ──────────────────────────────────────────────
  const toggleMicrophone = useCallback(() => {
    if (isListening) {
      stopMicrophone()
    } else {
      startMicrophone().catch(err => setError(`Microphone error: ${err}`))
    }
  }, [isListening, startMicrophone, stopMicrophone])

  const state: VoiceSessionState = {
    connectionState,
    isListening,
    isSpeaking,
    transcripts,
    profileUpdates,
    error,
    triageDocument,
    compilationResult,
    sessionEnded,
  }

  const actions: VoiceSessionActions = {
    connect,
    disconnect,
    toggleMicrophone,
  }

  return [state, actions]
}
