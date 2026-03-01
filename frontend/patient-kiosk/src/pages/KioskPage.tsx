import { useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { createMockDataProvider } from '@/data/mockDataProvider'
import { useKioskStateMachine } from '@/hooks/useKioskStateMachine'
import type { KioskInput } from '@/hooks/useKioskStateMachine'
import { useVoiceSession } from '@/hooks/useVoiceSession'
import { ParticleEffect } from '@/components/ParticleEffect'
import { WelcomeView } from '@/views/WelcomeView'
import { ConversationView } from '@/views/ConversationView'
import { CompilingView } from '@/views/CompilingView'
import { ValidationView } from '@/views/ValidationView'
import { TicketView } from '@/views/TicketView'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined

export function KioskPage() {
  const mockProvider = useMemo(() => createMockDataProvider(), [])

  // Voice session is always initialised but only used when BACKEND_URL is set
  const [voiceState, voiceActions] = useVoiceSession(BACKEND_URL ?? '')

  const kioskInput: KioskInput = BACKEND_URL
    ? { mode: 'voice', voiceState, voiceActions }
    : { mode: 'mock', provider: mockProvider }

  const [state, actions] = useKioskStateMachine(kioskInput)

  return (
    <div className="relative min-h-screen bg-mistral-dark overflow-hidden">
      <ParticleEffect />

      <div className="relative z-10 px-6 py-8">
        <AnimatePresence mode="wait">
          {state.phase === 'welcome' && (
            <WelcomeView key="welcome" onStart={actions.startConversation} />
          )}
          {state.phase === 'conversation' && (
            <ConversationView key="conversation" state={state} actions={actions} />
          )}
          {state.phase === 'compiling' && (
            <CompilingView key="compiling" />
          )}
          {state.phase === 'validation' && (
            <ValidationView
              key="validation"
              state={state}
              onConfirm={actions.confirmAndGenerateTicket}
              isProcessing={state.isProcessing}
            />
          )}
          {state.phase === 'ticket' && state.ticketData && (
            <TicketView
              key="ticket"
              ticketData={state.ticketData}
              onReset={actions.reset}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
