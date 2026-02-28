import { motion } from 'framer-motion'
import { PixelArtAvatar } from '@/components/avatar/PixelArtAvatar'
import { SpeechBubble } from '@/components/SpeechBubble'
import { InfoCard } from '@/components/InfoCard'
import { CcmuBadge } from '@/components/CcmuBadge'
import { Button } from '@/components/ui/button'
import type { KioskState } from '@/hooks/useKioskStateMachine'
import type { CcmuLevel } from '@/types/ccmu'

interface ValidationViewProps {
  state: KioskState
  onConfirm: () => void
  isProcessing: boolean
}

const ALL_SECTIONS = ['identite', 'motif', 'symptomes', 'antecedents', 'traitements', 'allergies'] as const

export function ValidationView({ state, onConfirm, isProcessing }: ValidationViewProps) {
  const ccmuLevel = (state.patientData.clinical?.suggestedCcmu ?? '2') as CcmuLevel

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
        message="Voici un resume de vos informations. Veuillez verifier que tout est correct avant de valider."
        role="assistant"
      />

      {/* CCMU Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <CcmuBadge level={ccmuLevel} />
      </motion.div>

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
          Corriger
        </Button>
        <Button
          size="lg"
          className="flex-1 py-6 text-base font-bold shadow-lg shadow-mistral-orange/25"
          onClick={onConfirm}
          disabled={isProcessing}
        >
          {isProcessing ? 'Generation...' : 'Confirmer'}
        </Button>
      </motion.div>
    </motion.div>
  )
}
