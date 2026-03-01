import { motion } from 'framer-motion'
import { PixelArtAvatar } from '@/components/avatar/PixelArtAvatar'
import { SpeechBubble } from '@/components/SpeechBubble'
import { InfoCard } from '@/components/InfoCard'
import { Button } from '@/components/ui/button'
import type { KioskState } from '@/hooks/useKioskStateMachine'

interface ValidationViewProps {
  state: KioskState
  onConfirm: () => void
  isProcessing: boolean
}

const ALL_SECTIONS = ['identite', 'motif', 'symptomes', 'antecedents', 'traitements', 'allergies'] as const

export function ValidationView({ state, onConfirm, isProcessing }: ValidationViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto py-6"
    >
      {/* Avatar */}
      <PixelArtAvatar state="idle" size={8} />

      {/* Speech */}
      <SpeechBubble
        message="Here is a summary of your information. Please verify everything is correct before confirming."
        role="assistant"
      />

      {/* Full info card */}
      <InfoCard
        patientData={state.patientData}
        revealedSections={[...ALL_SECTIONS]}
        progress={100}
      />

      {/* Action buttons */}
      <motion.div
        className="flex gap-4 w-full max-w-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          variant="outline"
          size="lg"
          className="flex-1 py-6 text-base"
          disabled
        >
          Correct
        </Button>
        <Button
          size="lg"
          className="flex-1 py-6 text-base font-bold shadow-lg shadow-mistral-orange/25"
          onClick={onConfirm}
          disabled={isProcessing}
        >
          {isProcessing ? 'Generating...' : 'Confirm'}
        </Button>
      </motion.div>
    </motion.div>
  )
}
