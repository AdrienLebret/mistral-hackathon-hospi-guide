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
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
      >
        <div
          className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
            isAssistant
              ? 'bg-mistral-card border border-slate-700 text-white rounded-2xl rounded-tl-sm'
              : 'bg-mistral-orange/15 border border-mistral-orange/30 text-slate-200 rounded-2xl rounded-tr-sm'
          }`}
        >
          <span className="text-[10px] font-medium uppercase tracking-wider mb-0.5 block text-slate-500">
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
