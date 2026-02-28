import { motion, AnimatePresence } from 'framer-motion'
import { TypewriterText } from './TypewriterText'

interface SpeechBubbleProps {
  message: string
  role: 'assistant' | 'patient'
  isTyping?: boolean
  onTypingComplete?: () => void
}

export function SpeechBubble({ message, role, isTyping = false, onTypingComplete }: SpeechBubbleProps) {
  const isAssistant = role === 'assistant'

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={message}
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`relative max-w-lg mx-auto px-5 py-4 rounded-2xl text-base leading-relaxed ${
          isAssistant
            ? 'bg-mistral-card border border-slate-700 text-white'
            : 'bg-mistral-orange/15 border border-mistral-orange/30 text-slate-200'
        }`}
      >
        {/* Tail */}
        <div
          className={`absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 ${
            isAssistant ? 'bg-mistral-card border-l border-t border-slate-700' : 'bg-mistral-orange/15 border-l border-t border-mistral-orange/30'
          }`}
        />
        <div className="relative z-10">
          <span className="text-xs font-medium uppercase tracking-wider mb-1 block text-slate-400">
            {isAssistant ? 'Assistant' : 'Patient'}
          </span>
          {isTyping ? (
            <TypewriterText text={message} speed={25} onComplete={onTypingComplete} />
          ) : (
            message
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
