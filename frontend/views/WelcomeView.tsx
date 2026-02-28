'use client'

import { motion } from 'framer-motion'
import PixelArtAvatar from '../components/avatar/PixelArtAvatar'

interface WelcomeViewProps {
    onStart: () => void
}

export default function WelcomeView({ onStart }: WelcomeViewProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-4"
        >
            {/* Branding */}
            <motion.h1
                className="text-5xl font-extrabold bg-linear-to-r from-mistral-orange to-mistral-amber bg-clip-text text-transparent"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                TRIASTRAL
            </motion.h1>

            {/* Avatar */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
            >
                <PixelArtAvatar state="waving" size={10} />
            </motion.div>

            {/* Description */}
            <motion.p
                className="text-slate-400 text-lg max-w-md text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                AI-powered emergency pre-triage kiosk.
                Tap below to start your assessment.
            </motion.p>

            {/* Start button — big and unmissable */}
            <motion.button
                onClick={onStart}
                className="text-2xl px-16 py-6 rounded-2xl font-bold bg-mistral-orange text-white shadow-lg shadow-mistral-orange/30 hover:bg-mistral-orange-light active:scale-95 transition-colors cursor-pointer"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                initial={{ opacity: 0, y: 10 }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.97 }}
            >
                Start Conversation
            </motion.button>

            {/* Consent */}
            <motion.p
                className="text-xs text-slate-500 max-w-sm text-center leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
            >
                By using this kiosk, you agree that your conversation will be
                analyzed by AI for medical pre-triage purposes.
            </motion.p>
        </motion.div>
    )
}
