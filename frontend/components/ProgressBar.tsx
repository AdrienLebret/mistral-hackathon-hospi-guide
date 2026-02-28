'use client'

import { motion } from 'framer-motion'
import type { KioskPhase } from '../types/kiosk'

const PHASES: { key: KioskPhase; label: string }[] = [
    { key: 'welcome', label: 'Welcome' },
    { key: 'conversation', label: 'Conversation' },
    { key: 'validation', label: 'Review' },
    { key: 'ticket', label: 'Ticket' },
]

function phaseIndex(phase: KioskPhase): number {
    return PHASES.findIndex((p) => p.key === phase)
}

interface ProgressBarProps {
    currentPhase: KioskPhase
}

export default function ProgressBar({ currentPhase }: ProgressBarProps) {
    const current = phaseIndex(currentPhase)

    return (
        <nav
            aria-label="Journey progress"
            className="flex w-full items-center justify-center gap-2 px-6 py-4"
        >
            {PHASES.map((phase, i) => {
                const isCompleted = i < current
                const isCurrent = i === current

                return (
                    <div key={phase.key} className="flex items-center gap-2">
                        {/* Step indicator */}
                        <div className="flex flex-col items-center gap-1">
                            <motion.div
                                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${isCurrent
                                    ? 'bg-mistral-orange text-white'
                                    : isCompleted
                                        ? 'bg-mistral-orange/80 text-white'
                                        : 'bg-mistral-card text-white/40'
                                    }`}
                                animate={{
                                    scale: isCurrent ? 1.15 : 1,
                                }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                                {isCompleted ? '✓' : i + 1}
                            </motion.div>
                            <span
                                className={`text-xs font-medium ${isCurrent
                                    ? 'text-mistral-orange'
                                    : isCompleted
                                        ? 'text-white/70'
                                        : 'text-white/30'
                                    }`}
                            >
                                {phase.label}
                            </span>
                        </div>

                        {/* Connector line between steps */}
                        {i < PHASES.length - 1 && (
                            <div className="relative h-0.5 w-12 bg-mistral-card">
                                <motion.div
                                    className="absolute inset-y-0 left-0 bg-mistral-orange"
                                    initial={{ width: '0%' }}
                                    animate={{ width: isCompleted ? '100%' : '0%' }}
                                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                                />
                            </div>
                        )}
                    </div>
                )
            })}
        </nav>
    )
}
