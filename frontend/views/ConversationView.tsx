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
    processingTool?: string | null
}

/** Tool-specific processing messages */
function getProcessingMessage(tool: string | null | undefined): string {
    switch (tool) {
        case 'clinical_assessment':
            return 'Running clinical assessment...'
        case 'query_health_data':
            return 'Searching public health databases...'
        default:
            return 'Thinking...'
    }
}

function ProcessingIndicator({ tool }: { tool?: string | null }) {
    return (
        <motion.div
            className="flex items-center gap-2 px-4 py-3 bg-mistral-card/50 rounded-xl mx-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
        >
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    className="inline-block w-2 h-2 rounded-full bg-mistral-orange"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: 'easeInOut',
                    }}
                />
            ))}
            <span className="text-sm text-slate-400 ml-1">
                {getProcessingMessage(tool)}
            </span>
        </motion.div>
    )
}

/** Microphone active indicator */
function MicIndicator({ isListening }: { isListening: boolean }) {
    if (!isListening) return null
    return (
        <motion.div
            className="flex items-center gap-2 text-mistral-orange text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="w-3 h-3 rounded-full bg-mistral-orange"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            Listening...
        </motion.div>
    )
}

export default function ConversationView({
    avatarState,
    messages,
    isProcessing,
    processingTool,
}: ConversationViewProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isProcessing])

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center h-[80vh] gap-3"
        >
            {/* Avatar + mic indicator */}
            <div className="shrink-0 flex flex-col items-center gap-2 py-3">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                >
                    <PixelArtAvatar state={avatarState} size={10} />
                </motion.div>
                <AnimatePresence>
                    <MicIndicator isListening={avatarState === 'listening'} />
                </AnimatePresence>
            </div>

            {/* Scrollable message area */}
            <div className="flex-1 w-full max-w-2xl overflow-y-auto px-4 space-y-3">
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <SpeechBubble key={msg.id} message={msg} />
                    ))}
                </AnimatePresence>

                <AnimatePresence>
                    {isProcessing && <ProcessingIndicator tool={processingTool} />}
                </AnimatePresence>

                <div ref={messagesEndRef} />
            </div>
        </motion.div>
    )
}
