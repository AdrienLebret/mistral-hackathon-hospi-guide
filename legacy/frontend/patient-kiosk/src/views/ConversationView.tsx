import { useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PixelArtAvatar } from '@/components/avatar/PixelArtAvatar'
import { SpeechBubble } from '@/components/SpeechBubble'
import { InfoCard } from '@/components/InfoCard'
import type { KioskState, KioskActions } from '@/hooks/useKioskStateMachine'

interface ConversationViewProps {
  state: KioskState
  actions: KioskActions
}

export function ConversationView({ state, actions }: ConversationViewProps) {
  const advancingRef = useRef(false)
  const doneRef = useRef(false)

  const lastMessage = state.messages[state.messages.length - 1]
  const lastRevealedSection = state.revealedSections[state.revealedSections.length - 1]

  const advanceLoop = useCallback(async () => {
    if (advancingRef.current || doneRef.current) return
    advancingRef.current = true
    const hasMore = await actions.advanceConversation()
    advancingRef.current = false
    if (!hasMore) {
      doneRef.current = true
      // Small pause before validation
      setTimeout(() => actions.goToValidation(), 1500)
    }
  }, [actions])

  // Start advancing on mount and continue
  useEffect(() => {
    doneRef.current = false
    advancingRef.current = false

    // Advance first step immediately
    advanceLoop()

    // Then keep advancing on interval
    const timer = setInterval(() => {
      if (!doneRef.current) advanceLoop()
    }, 3500)

    return () => clearInterval(timer)
  }, [advanceLoop])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto py-6"
    >
      {/* Avatar */}
      <PixelArtAvatar state={state.avatarState} size={8} />

      {/* Speech bubble */}
      {lastMessage && (
        <SpeechBubble
          message={lastMessage.text}
          role={lastMessage.role}
          isTyping={lastMessage.role === 'assistant'}
        />
      )}

      {/* Processing indicator */}
      {state.isProcessing && !lastMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-slate-400 text-sm"
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-mistral-orange"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          Traitement en cours...
        </motion.div>
      )}

      {/* Progressive info card */}
      <InfoCard
        patientData={state.patientData}
        revealedSections={state.revealedSections}
        progress={state.progress}
        activeSection={lastRevealedSection}
      />
    </motion.div>
  )
}
