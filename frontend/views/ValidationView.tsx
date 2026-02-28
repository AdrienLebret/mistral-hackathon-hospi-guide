'use client'

import { motion } from 'framer-motion'
import type { PatientSummary } from '../types/patient'

interface ValidationViewProps {
    patientSummary: PatientSummary | null
    onConfirm: () => void
    onCorrect: () => void
}

/** Renders a labeled card section with a list of items or a fallback. */
function SummarySection({ label, items }: { label: string; items: string[] | string }) {
    const isArray = Array.isArray(items)
    const isEmpty = isArray ? items.length === 0 : !items

    return (
        <motion.div
            className="bg-mistral-card rounded-xl p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <h3 className="text-sm font-semibold text-mistral-amber uppercase tracking-wide mb-2">
                {label}
            </h3>
            {isEmpty ? (
                <p className="text-slate-500 text-lg italic">Not provided</p>
            ) : isArray ? (
                <ul className="space-y-1">
                    {items.map((item, i) => (
                        <li key={i} className="text-white text-lg">
                            • {item}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-white text-lg">{items}</p>
            )}
        </motion.div>
    )
}

export default function ValidationView({
    patientSummary,
    onConfirm,
    onCorrect,
}: ValidationViewProps) {
    if (!patientSummary) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center min-h-[80vh]"
            >
                <p className="text-slate-400 text-xl">Loading your information…</p>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center min-h-[80vh] gap-6 py-8 px-4 max-w-2xl mx-auto"
        >
            <motion.h2
                className="text-3xl font-bold text-white text-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                Review Your Information
            </motion.h2>
            <p className="text-slate-400 text-center text-lg -mt-2">
                Please verify that the information below is correct.
            </p>

            <motion.div
                className="w-full space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, staggerChildren: 0.1 }}
            >
                <SummarySection label="Chief Complaint" items={patientSummary.chiefComplaint} />
                <SummarySection label="Declared Symptoms" items={patientSummary.declaredSymptoms} />
                <SummarySection label="Medical History" items={patientSummary.medicalHistory} />
                <SummarySection label="Medications" items={patientSummary.medications} />
                <SummarySection label="Allergies" items={patientSummary.allergies} />
            </motion.div>

            <motion.div
                className="flex gap-4 w-full mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <button
                    onClick={onCorrect}
                    className="flex-1 text-lg py-4 rounded-xl font-semibold border-2 border-mistral-card text-slate-300 bg-mistral-card hover:bg-mistral-card-hover active:scale-95 transition-all cursor-pointer"
                >
                    Correct
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 text-lg py-4 rounded-xl font-bold bg-mistral-orange text-white shadow-lg shadow-mistral-orange/25 hover:bg-mistral-orange-light active:scale-95 transition-all cursor-pointer"
                >
                    Confirm
                </button>
            </motion.div>
        </motion.div>
    )
}
