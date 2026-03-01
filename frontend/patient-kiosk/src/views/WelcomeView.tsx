import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'
import { PixelArtAvatar } from '@/components/avatar/PixelArtAvatar'
import { Button } from '@/components/ui/button'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined

interface WelcomeViewProps {
  onStart: () => void
}

export function WelcomeView({ onStart }: WelcomeViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[80vh] gap-8"
    >
      {/* Logo */}
      <motion.h1
        className="text-5xl font-extrabold bg-gradient-to-r from-mistral-orange to-mistral-amber bg-clip-text text-transparent"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        TRIASTRAL
      </motion.h1>

      {/* Avatar */}
      <PixelArtAvatar state="waving" size={10} />

      {/* Welcome text */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-white">
          Welcome to the Emergency Room
        </h2>
        <p className="text-slate-400 text-base max-w-md">
          {BACKEND_URL
            ? 'I am your voice pre-triage assistant. Press the button to start speaking.'
            : 'I am your pre-triage assistant. I will ask you a few questions to prepare your file.'}
        </p>
      </div>

      {/* CTA */}
      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Button
          size="lg"
          onClick={onStart}
          className="text-xl px-12 py-8 rounded-2xl font-bold shadow-lg shadow-mistral-orange/25"
        >
          {BACKEND_URL && <Mic size={24} className="mr-3" />}
          Start
        </Button>
      </motion.div>

      {/* Voice mode indicator */}
      {BACKEND_URL && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-xs text-slate-500 flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Voice mode active
        </motion.p>
      )}
    </motion.div>
  )
}
