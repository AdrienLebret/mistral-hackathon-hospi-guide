import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PixelArtAvatar } from '@/components/avatar/PixelArtAvatar'
import { SpeechBubble } from '@/components/SpeechBubble'
import { QRTicket } from '@/components/QRTicket'
import type { PatientData } from '@/types/patient'

interface TicketViewProps {
  ticketData: PatientData
  onReset: () => void
}

const AUTO_RESET_SECONDS = 30

export function TicketView({ ticketData, onReset }: TicketViewProps) {
  const [countdown, setCountdown] = useState(AUTO_RESET_SECONDS)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onReset()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [onReset])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto py-6"
    >
      {/* Avatar */}
      <PixelArtAvatar state="happy" size={8} />

      {/* Speech */}
      <SpeechBubble
        message="Merci ! Votre dossier de pre-triage est enregistre. Rendez-vous en salle d'attente."
        role="assistant"
      />

      {/* QR Ticket */}
      <QRTicket patientData={ticketData} />

      {/* Auto-reset notice */}
      <motion.p
        className="text-sm text-slate-500"
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Retour a l'accueil dans {countdown}s
      </motion.p>
    </motion.div>
  )
}
