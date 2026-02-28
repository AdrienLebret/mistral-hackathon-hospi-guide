'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { ConversationMessage } from '../types/kiosk'

interface SpeechBubbleProps {
    message: ConversationMessage
}

/** Character-by-character typewriter for agent messages. */
function useTypewriter(text: string, enabled: boolean, speed = 30): string {
    const [displayed, setDisplayed] = useState(enabled ? '' : text)

    useEffect(() => {
        if (!enabled) {
            setDisplayed(text)
            return
        }

        setDisplayed('')
        let i = 0
        const id = setInterval(() => {
            i++
            setDisplayed(text.slice(0, i))
            if (i >= text.length) clearInterval(id)
        }, speed)

        return () => clearInterval(id)
    }, [text, enabled, speed])

    return displayed
}

export default function SpeechBubble({ message }: SpeechBubbleProps) {
    const isAgent = message.role === 'agent'
    const displayedText = useTypewriter(message.text, isAgent)

    return (
        <motion.div
            className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}
            initial={{ opacity: 0, x: isAgent ? -24 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
            <div
                className={`max-w-[75%] rounded-2xl px-5 py-3 text-lg leading-relaxed ${isAgent
                        ? 'bg-mistral-card text-white rounded-bl-sm'
                        : 'bg-mistral-orange text-white rounded-br-sm'
                    }`}
            >
                {displayedText}
            </div>
        </motion.div>
    )
}
