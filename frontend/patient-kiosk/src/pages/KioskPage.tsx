import { useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { createMockDataProvider } from '@/data/mockDataProvider'
import { useKioskStateMachine } from '@/hooks/useKioskStateMachine'
import { ParticleEffect } from '@/components/ParticleEffect'
import { WelcomeView } from '@/views/WelcomeView'
import { ConversationView } from '@/views/ConversationView'
import { ValidationView } from '@/views/ValidationView'
import { TicketView } from '@/views/TicketView'

export function KioskPage() {
  const provider = useMemo(() => createMockDataProvider(), [])
  const [state, actions] = useKioskStateMachine(provider)

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
