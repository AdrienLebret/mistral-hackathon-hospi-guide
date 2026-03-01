import { useCallback, useEffect, useRef, useState } from 'react'
import type { KioskPhase, ConversationMessage, AvatarState, InfoSection } from '@/types/kiosk'
import type { PatientData } from '@/types/patient'
import type { DataProvider } from '@/data/mockDataProvider'
import type { VoiceSessionState, VoiceSessionActions } from '@/hooks/useVoiceSession'

export interface KioskState {
  phase: KioskPhase
  avatarState: AvatarState
  messages: ConversationMessage[]
  patientData: Partial<PatientData>
  revealedSections: InfoSection[]
  progress: number
  isProcessing: boolean
  ticketData: PatientData | null
  /** True when operating in real-time voice mode */
  isVoiceMode: boolean
  /** Microphone is capturing audio */
  voiceMicActive: boolean
  /** WebSocket connection status */
  voiceConnectionState: string
  /** Voice session error message */
  voiceError: string | null
}

export interface KioskActions {
  startConversation: () => void
  advanceConversation: () => Promise<boolean>
  goToValidation: () => void
  confirmAndGenerateTicket: () => Promise<void>
  reset: () => void
  toggleMicrophone: () => void
}

type MockInput = { mode: 'mock'; provider: DataProvider }
type VoiceInput = {
  mode: 'voice'
  voiceState: VoiceSessionState
  voiceActions: VoiceSessionActions
}
export type KioskInput = MockInput | VoiceInput

const TOTAL_SECTIONS = 6

export function useKioskStateMachine(input: KioskInput): [KioskState, KioskActions] {
  const isVoice = input.mode === 'voice'

  const [phase, setPhase] = useState<KioskPhase>('welcome')
  const [avatarState, setAvatarState] = useState<AvatarState>('idle')
  const [mockMessages, setMockMessages] = useState<ConversationMessage[]>([])
  const [patientData, setPatientData] = useState<Partial<PatientData>>({})
  const [revealedSections, setRevealedSections] = useState<InfoSection[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [ticketData, setTicketData] = useState<PatientData | null>(null)
  const isAdvancing = useRef(false)

  // ── Voice-derived state ──────────────────────────────────────────
  const voiceState = isVoice ? (input as VoiceInput).voiceState : null
  const voiceActions = isVoice ? (input as VoiceInput).voiceActions : null

  // Map voice transcripts to ConversationMessage[], grouping consecutive
  // same-role entries into a single bubble so the chat stays clean.
  const voiceMessages: ConversationMessage[] = voiceState
    ? voiceState.transcripts.reduce<ConversationMessage[]>((acc, t) => {
        const role = t.role === 'user' ? 'patient' as const : 'assistant' as const
        const last = acc.length > 0 ? acc[acc.length - 1] : null
        if (last && last.role === role) {
          // Merge into the previous bubble
          acc[acc.length - 1] = {
            ...last,
            text: last.text + ' ' + t.text,
            timestamp: t.timestamp,
          }
        } else {
          acc.push({ id: t.id, role, text: t.text, timestamp: t.timestamp })
        }
        return acc
      }, [])
    : []

  const messages = isVoice ? voiceMessages : mockMessages

  // Avatar state from voice activity
  const derivedAvatarState: AvatarState = isVoice
    ? voiceState!.isSpeaking
      ? 'talking'
      : voiceState!.isListening
        ? 'listening'
        : 'idle'
    : avatarState

  const progress = Math.round((revealedSections.length / TOTAL_SECTIONS) * 100)

  // ── Voice mode: progressive section reveal by transcript count ───
  // Sections appear immediately as the conversation progresses, giving
  // instant visual feedback.  Actual data is filled in a few seconds
  // later by the background profile extractor via profile.update events.
  useEffect(() => {
    if (!isVoice || phase !== 'conversation') return

    const finalCount = voiceState!.transcripts.filter(t => t.isFinal).length
    const REVEAL_SCHEDULE: [number, InfoSection][] = [
      [2, 'identite'],
      [4, 'motif'],
      [6, 'symptomes'],
      [8, 'antecedents'],
      [10, 'traitements'],
      [12, 'allergies'],
    ]

    setRevealedSections(prev => {
      const next = [...prev]
      for (const [threshold, section] of REVEAL_SCHEDULE) {
        if (finalCount >= threshold && !next.includes(section)) {
          next.push(section)
        }
      }
      return next.length > prev.length ? next : prev
    })
  }, [isVoice, phase, voiceState?.transcripts])

  // ── Voice mode: fill data from background profile extractor ──────
  // The backend runs a Mistral extraction every few transcripts and
  // pushes profile.update events.  We use these to fill actual values
  // into the patient data (sections are already revealed above).
  const processedProfileCount = useRef(0)

  useEffect(() => {
    if (!isVoice || phase !== 'conversation') return
    const updates = voiceState!.profileUpdates
    if (updates.length <= processedProfileCount.current) return

    const newUpdates = updates.slice(processedProfileCount.current)
    processedProfileCount.current = updates.length

    for (const update of newUpdates) {
      const d = update.data
      switch (update.section) {
        case 'identity':
          setPatientData(prev => ({
            ...prev,
            identity: {
              ...prev.identity,
              ...(d.name ? { fullName: d.name as string } : {}),
              ...(d.dateOfBirth ? { dateOfBirth: d.dateOfBirth as string } : {}),
              ...(d.sex ? { sex: d.sex as string } : {}),
            },
          }))
          break

        case 'chief_complaint': {
          const opqrst = d.opqrst as Record<string, unknown> | undefined
          setPatientData(prev => ({
            ...prev,
            clinical: {
              ...prev.clinical,
              ...(d.chiefComplaint ? { chiefComplaint: d.chiefComplaint as string } : {}),
              ...(opqrst ? {
                symptomAssessment: {
                  onset: (opqrst.onset as string) ?? '',
                  provocation: (opqrst.provocation as string) ?? '',
                  quality: (opqrst.quality as string) ?? '',
                  region: (opqrst.region as string) ?? '',
                  severity: (opqrst.severity as number) ?? 0,
                  timing: (opqrst.timing as string) ?? '',
                },
              } : {}),
            },
          }))
          break
        }

        case 'medical_history':
          setPatientData(prev => ({
            ...prev,
            clinical: {
              ...prev.clinical,
              medicalHistory: (d.conditions as string[]) ?? prev.clinical?.medicalHistory,
            },
          }))
          break

        case 'medications':
          setPatientData(prev => ({
            ...prev,
            clinical: {
              ...prev.clinical,
              currentMedications: (d.medications as string[]) ?? prev.clinical?.currentMedications,
            },
          }))
          break

        case 'allergies':
          setPatientData(prev => ({
            ...prev,
            clinical: {
              ...prev.clinical,
              allergies: (d.allergies as string[]) ?? prev.clinical?.allergies,
            },
          }))
          break
      }
    }
  }, [isVoice, phase, voiceState?.profileUpdates])

  // ── Voice mode: transition to compiling when session ends ────────
  // When the voice agent calls stop_conversation, we immediately show
  // the "Compiling…" loading screen.  The server runs a final Mistral
  // compilation and sends compilation.complete with all patient data.
  useEffect(() => {
    if (isVoice && voiceState!.sessionEnded && phase === 'conversation') {
      setPhase('compiling')
      setIsProcessing(true)
    }
  }, [isVoice, voiceState?.sessionEnded, phase])

  // ── Voice mode: fill patient data from final compilation ──────────
  // The authoritative data arrives via the compilation.complete event
  // after the server finishes its Mistral extraction on the full transcript.
  useEffect(() => {
    if (!isVoice || !voiceState?.compilationResult) return
    if (phase !== 'compiling') return

    const result = voiceState.compilationResult
    const identity = result.identity as Record<string, unknown> | undefined
    const clinical = result.clinical as Record<string, unknown> | undefined

    const newPatientData: Partial<PatientData> = {}

    if (identity) {
      newPatientData.identity = {
        ...(identity.fullName ? { fullName: identity.fullName as string } : {}),
        ...(identity.dateOfBirth ? { dateOfBirth: identity.dateOfBirth as string } : {}),
        ...(identity.sex ? { gender: identity.sex as string } : {}),
      }
    }

    if (clinical) {
      const sa = clinical.symptomAssessment as Record<string, unknown> | undefined
      newPatientData.clinical = {
        ...(clinical.chiefComplaint ? { chiefComplaint: clinical.chiefComplaint as string } : {}),
        ...(sa ? {
          symptomAssessment: {
            onset: (sa.onset as string) ?? '',
            provocation: (sa.provocation as string) ?? '',
            quality: (sa.quality as string) ?? '',
            region: (sa.region as string) ?? '',
            severity: (sa.severity as number) ?? 0,
            timing: (sa.timing as string) ?? '',
          },
        } : {}),
        medicalHistory: (clinical.medicalHistory as string[]) ?? [],
        currentMedications: (clinical.currentMedications as string[]) ?? [],
        allergies: (clinical.allergies as string[]) ?? [],
        redFlags: (clinical.redFlags as string[]) ?? [],
        suggestedCcmu: (clinical.suggestedCcmu as string) ?? '',
        ccmuReasoning: (clinical.ccmuReasoning as string) ?? '',
      }
    }

    setPatientData(newPatientData)
    setRevealedSections(['identite', 'motif', 'symptomes', 'antecedents', 'traitements', 'allergies'])
    setIsProcessing(false)
    setPhase('validation')
  }, [isVoice, phase, voiceState?.compilationResult])

  // ── Actions ──────────────────────────────────────────────────────

  const startConversation = useCallback(() => {
    if (isVoice) {
      voiceActions!.connect()
    } else {
      ;(input as MockInput).provider.startSession()
    }
    setPhase('conversation')
    setAvatarState('waving')
    setMockMessages([])
    setPatientData({})
    setRevealedSections([])
    setTicketData(null)
    processedProfileCount.current = 0
    if (!isVoice) {
      setTimeout(() => setAvatarState('talking'), 1000)
    }
  }, [isVoice, voiceActions, input])

  const advanceConversation = useCallback(async (): Promise<boolean> => {
    // In voice mode, conversation advances via WebSocket — nothing to do
    if (isVoice) return true

    const provider = (input as MockInput).provider
    if (isAdvancing.current) return true
    isAdvancing.current = true
    setIsProcessing(true)

    const step = await provider.getNextStep()
    if (!step) {
      isAdvancing.current = false
      setIsProcessing(false)
      return false
    }

    setMockMessages(prev => [...prev, step.message])
    setAvatarState(step.avatarState)

    if (step.patientDataDelta.identity || step.patientDataDelta.clinical) {
      setPatientData(prev => ({
        ...prev,
        identity: { ...prev.identity, ...step.patientDataDelta.identity },
        clinical: { ...prev.clinical, ...step.patientDataDelta.clinical },
      }))
    }

    if (step.revealsSection) {
      setRevealedSections(prev =>
        prev.includes(step.revealsSection!) ? prev : [...prev, step.revealsSection!],
      )
    }

    isAdvancing.current = false
    setIsProcessing(false)
    return true
  }, [isVoice, input])

  const goToValidation = useCallback(() => {
    setPhase('validation')
    setAvatarState('idle')
  }, [])

  const confirmAndGenerateTicket = useCallback(async () => {
    setIsProcessing(true)
    setAvatarState('happy')

    if (isVoice) {
      const now = new Date()
      const patientId = `PAT-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`
      const data: PatientData = {
        patientId,
        identity: patientData.identity ?? {},
        clinical: patientData.clinical ?? {},
        qrToken: crypto.randomUUID(),
        facilityId: 'NECKER',
        arrivalTime: now.toISOString(),
      }
      setTicketData(data)
    } else {
      const data = await (input as MockInput).provider.submitValidation()
      setTicketData(data)
    }

    setPhase('ticket')
    setIsProcessing(false)
  }, [isVoice, input, patientData])

  const reset = useCallback(() => {
    if (isVoice) {
      voiceActions!.disconnect()
    } else {
      ;(input as MockInput).provider.reset()
    }
    setPhase('welcome')
    setAvatarState('idle')
    setMockMessages([])
    setPatientData({})
    setRevealedSections([])
    setTicketData(null)
    setIsProcessing(false)
  }, [isVoice, voiceActions, input])

  const toggleMicrophone = useCallback(() => {
    if (isVoice) {
      voiceActions!.toggleMicrophone()
    }
  }, [isVoice, voiceActions])

  return [
    {
      phase,
      avatarState: derivedAvatarState,
      messages,
      patientData,
      revealedSections,
      progress,
      isProcessing,
      ticketData,
      isVoiceMode: isVoice,
      voiceMicActive: voiceState?.isListening ?? false,
      voiceConnectionState: voiceState?.connectionState ?? 'disconnected',
      voiceError: voiceState?.error ?? null,
    },
    {
      startConversation,
      advanceConversation,
      goToValidation,
      confirmAndGenerateTicket,
      reset,
      toggleMicrophone,
    },
  ]
}
