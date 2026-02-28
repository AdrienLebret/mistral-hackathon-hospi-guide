'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PixelArtAvatar from '../components/avatar/PixelArtAvatar'
import SpeechBubble from '../components/SpeechBubble'
import type { AvatarState, ConversationMessage } from '../types/kiosk'

interface ConversationViewProps {
    avatarState: AvatarState
    messages: ConversationMessage[]
    isProcessing: boolean
}

/** Animated dots indicator shown while backend tools are running. */
function ProcessingIndicator() {
    return (
        <motion.div
            className="flex items-center gap-1.5 px-4 py-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <span className="text-sm text-slate-400">Analyzing</span>
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    className="inline-block w-1.5 h-1.5 rounded-full bg-mistral-orange"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </motion.div>
    )
}

export default function ConversationView({
    avatarState,
    messages,
    isProcessing,
}: ConversationViewProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when new messages arrive or processing state changes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isProcessing])

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center h-[80vh] gap-4"
        >
            {/* Avatar — fixed at top, centered */}
            <motion.div
                className="shrink-0 py-4"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
            >
                <PixelArtAvatar state={avatarState} />
            </motion.div>

            {/* Scrollable message area */}
            <div className="flex-1 w-full max-w-2xl overflow-y-auto px-4 space-y-3">
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <SpeechBubble key={msg.id} message={msg} />
                    ))}
                </AnimatePresence>

                {/* Processing indicator */}
                <AnimatePresence>
                    {isProcessing && <ProcessingIndicator />}
                </AnimatePresence>

                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
            </div>
        </motion.div>
    )
}
