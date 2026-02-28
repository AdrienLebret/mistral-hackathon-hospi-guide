import { useCallback, useRef, useState } from 'react'
import type { KioskPhase, ConversationMessage, AvatarState, InfoSection } from '@/types/kiosk'
import type { PatientData } from '@/types/patient'
import type { DataProvider } from '@/data/mockDataProvider'

export interface KioskState {
  phase: KioskPhase
  avatarState: AvatarState
  messages: ConversationMessage[]
  patientData: Partial<PatientData>
  revealedSections: InfoSection[]
  progress: number
  isProcessing: boolean
  ticketData: PatientData | null
}

export interface KioskActions {
  startConversation: () => void
  advanceConversation: () => Promise<boolean> // returns false when done
  goToValidation: () => void
  confirmAndGenerateTicket: () => Promise<void>
  reset: () => void
}

const TOTAL_SECTIONS = 6

export function useKioskStateMachine(provider: DataProvider): [KioskState, KioskActions] {
  const [phase, setPhase] = useState<KioskPhase>('welcome')
  const [avatarState, setAvatarState] = useState<AvatarState>('idle')
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [patientData, setPatientData] = useState<Partial<PatientData>>({})
  const [revealedSections, setRevealedSections] = useState<InfoSection[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [ticketData, setTicketData] = useState<PatientData | null>(null)
  const isAdvancing = useRef(false)

  const progress = Math.round((revealedSections.length / TOTAL_SECTIONS) * 100)

  const startConversation = useCallback(() => {
    provider.startSession()
    setPhase('conversation')
    setAvatarState('waving')
    setMessages([])
    setPatientData({})
    setRevealedSections([])
    setTicketData(null)
    setTimeout(() => setAvatarState('talking'), 1000)
  }, [provider])

  const advanceConversation = useCallback(async (): Promise<boolean> => {
    if (isAdvancing.current) return true
    isAdvancing.current = true
    setIsProcessing(true)

    const step = await provider.getNextStep()
    if (!step) {
      isAdvancing.current = false
      setIsProcessing(false)
      return false
    }

    setMessages(prev => [...prev, step.message])
    setAvatarState(step.avatarState)

    // Merge patient data delta
    if (step.patientDataDelta.identity || step.patientDataDelta.clinical) {
      setPatientData(prev => ({
        ...prev,
        identity: { ...prev.identity, ...step.patientDataDelta.identity },
        clinical: { ...prev.clinical, ...step.patientDataDelta.clinical },
      }))
    }

    // Reveal section
    if (step.revealsSection) {
      setRevealedSections(prev =>
        prev.includes(step.revealsSection!) ? prev : [...prev, step.revealsSection!],
      )
    }

    isAdvancing.current = false
    setIsProcessing(false)
    return true
  }, [provider])

  const goToValidation = useCallback(() => {
    setPhase('validation')
    setAvatarState('idle')
  }, [])

  const confirmAndGenerateTicket = useCallback(async () => {
    setIsProcessing(true)
    setAvatarState('happy')
    const data = await provider.submitValidation()
    setTicketData(data)
    setPhase('ticket')
    setIsProcessing(false)
  }, [provider])

  const reset = useCallback(() => {
    provider.reset()
    setPhase('welcome')
    setAvatarState('idle')
    setMessages([])
    setPatientData({})
    setRevealedSections([])
    setTicketData(null)
    setIsProcessing(false)
  }, [provider])

  return [
    { phase, avatarState, messages, patientData, revealedSections, progress, isProcessing, ticketData },
    { startConversation, advanceConversation, goToValidation, confirmAndGenerateTicket, reset },
  ]
}
