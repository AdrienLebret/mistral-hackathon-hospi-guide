import { useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
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
  const scrollRef = useRef<HTMLDivElement>(null)

  const lastRevealedSection = state.revealedSections[state.revealedSections.length - 1]

  // Derive voice status label
  const voiceStatus = state.isVoiceMode
    ? state.voiceConnectionState === 'connecting'
      ? { text: 'Connecting...', color: 'text-mistral-orange', dot: 'bg-mistral-orange' }
      : state.voiceConnectionState === 'error'
        ? { text: 'Connection error', color: 'text-red-400', dot: '' }
        : state.voiceConnectionState === 'disconnected' && state.voiceError
          ? { text: 'Disconnected', color: 'text-red-400', dot: '' }
          : state.voiceMicActive
            ? { text: 'Listening...', color: 'text-green-400', dot: 'bg-green-400' }
            : state.voiceConnectionState === 'connected'
              ? { text: 'Microphone off', color: 'text-slate-400', dot: '' }
              : { text: 'Disconnected', color: 'text-slate-500', dot: '' }
    : null

  // ── Mock-mode auto-advance ───────────────────────────────────────
  const advanceLoop = useCallback(async () => {
    if (state.isVoiceMode) return
    if (advancingRef.current || doneRef.current) return
    advancingRef.current = true
    const hasMore = await actions.advanceConversation()
    advancingRef.current = false
    if (!hasMore) {
      doneRef.current = true
      setTimeout(() => actions.goToValidation(), 1500)
    }
  }, [actions, state.isVoiceMode])

  useEffect(() => {
    if (state.isVoiceMode) return
    doneRef.current = false
    advancingRef.current = false
    advanceLoop()
    const timer = setInterval(() => {
      if (!doneRef.current) advanceLoop()
    }, 3500)
    return () => clearInterval(timer)
  }, [advanceLoop, state.isVoiceMode])

  // ── Auto-scroll message list ─────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [state.messages.length])

  // ── Render: two-column split layout ──────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-[1fr_360px] gap-6 w-full max-w-5xl mx-auto py-6 h-[calc(100vh-2rem)]"
    >
      {/* ── LEFT: Chat Panel ──────────────────────────────────────── */}
      <div className="flex flex-col h-full min-h-0">
        {/* Voice status indicator */}
        {state.isVoiceMode && voiceStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex items-center gap-2 text-sm mb-3 ${voiceStatus.color}`}
          >
            {voiceStatus.dot && (
              <motion.div
                className={`w-2 h-2 rounded-full ${voiceStatus.dot}`}
                animate={
                  state.voiceConnectionState === 'connecting'
                    ? { scale: [1, 1.5, 1] }
                    : { opacity: [1, 0.3, 1] }
                }
                transition={{ duration: state.voiceConnectionState === 'connecting' ? 0.8 : 1.2, repeat: Infinity }}
              />
            )}
            {voiceStatus.text}
          </motion.div>
        )}

        {/* Error display */}
        {state.isVoiceMode && state.voiceError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm mb-3"
          >
            {state.voiceError}
          </motion.div>
        )}

        {/* Scrollable chat history — unified for both modes */}
        <div
          ref={scrollRef}
          className="flex flex-col gap-3 flex-1 overflow-y-auto px-2 scrollbar-thin min-h-0"
        >
          {state.messages.length === 0 && state.isVoiceMode && state.voiceConnectionState === 'connected' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center text-slate-500 text-sm py-8"
            >
              {state.voiceMicActive
                ? 'Speak, I\'m listening...'
                : 'Enable the microphone to start'}
            </motion.div>
          ) : (
            state.messages.map(msg => (
              <SpeechBubble
                key={msg.id}
                message={msg.text}
                role={msg.role}
                isTyping={!state.isVoiceMode && msg.id === state.messages[state.messages.length - 1]?.id && msg.role === 'assistant'}
              />
            ))
          )}

          {/* Processing indicator (mock mode) */}
          {!state.isVoiceMode && state.isProcessing && state.messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-slate-400 text-sm py-4"
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-mistral-orange"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              Processing...
            </motion.div>
          )}
        </div>

        {/* Microphone button (voice mode only) */}
        {state.isVoiceMode && (
          <div className="flex flex-col items-center gap-2 pt-4 shrink-0">
            <motion.button
              onClick={actions.toggleMicrophone}
              whileTap={{ scale: 0.95 }}
              disabled={state.voiceConnectionState !== 'connected'}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                state.voiceConnectionState !== 'connected'
                  ? 'bg-slate-700 shadow-slate-700/30 opacity-50 cursor-not-allowed'
                  : state.voiceMicActive
                    ? 'bg-red-500 shadow-red-500/30'
                    : 'bg-slate-600 shadow-slate-600/30 hover:bg-slate-500'
              }`}
            >
              {state.voiceMicActive ? (
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  <Mic size={24} className="text-white" />
                </motion.div>
              ) : (
                <MicOff size={24} className="text-slate-300" />
              )}
            </motion.button>
            <span className="text-xs text-slate-500">
              {state.voiceConnectionState === 'connecting'
                ? 'Connecting...'
                : state.voiceConnectionState === 'connected'
                  ? state.voiceMicActive
                    ? 'Tap to mute'
                    : 'Tap to speak'
                  : 'Not connected'}
            </span>
          </div>
        )}
      </div>

      {/* ── RIGHT: Avatar + InfoCard ──────────────────────────────── */}
      <div className="flex flex-col gap-4 h-full min-h-0">
        {/* Avatar (compact) */}
        <div className="relative flex justify-center shrink-0">
          <PixelArtAvatar state={state.avatarState} size={6} />
          {state.isVoiceMode && state.voiceMicActive && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-mistral-orange"
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>

        {/* Progressive info card */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
          <InfoCard
            patientData={state.patientData}
            revealedSections={state.revealedSections}
            progress={state.progress}
            activeSection={lastRevealedSection}
          />
        </div>
      </div>
    </motion.div>
  )
}
