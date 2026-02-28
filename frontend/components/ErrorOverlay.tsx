'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { KioskError } from '../types/kiosk'

/** Maps every KioskError code to a patient-friendly English message. */
export function getErrorMessage(code: KioskError['code']): string {
    const messages: Record<KioskError['code'], string> = {
        ws_disconnected: 'The connection was interrupted. Please start over.',
        ws_timeout: 'The service is taking too long to respond. Please try again.',
        mic_denied:
            'Microphone access is required for the conversation. Please allow microphone access in your browser settings.',
        audio_error: 'An audio issue occurred. Please start over.',
        unknown: 'An unexpected error occurred. Please start over.',
    }
    return messages[code]
}

/** Maps error codes to the action button label. */
function getButtonLabel(code: KioskError['code']): string {
    return code === 'ws_timeout' ? 'Retry' : 'Start Over'
}

interface ErrorOverlayProps {
    error: KioskError | null
    onDismiss: () => void
}

export default function ErrorOverlay({ error, onDismiss }: ErrorOverlayProps) {
    return (
        <AnimatePresence>
            {error && (
                <motion.div
                    key="error-overlay"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <motion.div
                        className="mx-6 max-w-md rounded-2xl bg-mistral-card p-8 text-center shadow-xl"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    >
                        <p className="mb-6 text-lg leading-relaxed text-white">
                            {error.message}
                        </p>

                        <button
                            onClick={onDismiss}
                            className="rounded-xl bg-mistral-orange px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-mistral-orange-light cursor-pointer"
                        >
                            {getButtonLabel(error.code)}
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
