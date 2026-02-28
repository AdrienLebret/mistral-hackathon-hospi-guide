'use client'

import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import PixelArtAvatar from '../components/avatar/PixelArtAvatar'
import type { TicketData } from '../types/kiosk'

interface TicketViewProps {
    ticketData: TicketData | null
    onReset: () => void
}

function formatArrivalTime(iso: string): string {
    try {
        return new Date(iso).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return '--:--'
    }
}

export default function TicketView({ ticketData, onReset }: TicketViewProps) {
    if (!ticketData) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center min-h-[80vh]"
            >
                <p className="text-slate-400 text-xl">Generating your ticket…</p>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center min-h-[80vh] gap-8 px-4"
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
            >
                <PixelArtAvatar state="happy" />
            </motion.div>

            <motion.h2
                className="text-3xl font-bold text-white text-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                Your Ticket is Ready
            </motion.h2>

            <motion.div
                className="bg-mistral-card rounded-2xl p-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
            >
                <QRCodeSVG
                    value={ticketData.qrToken}
                    size={200}
                    bgColor="transparent"
                    fgColor="#FF7000"
                />
            </motion.div>

            <motion.p
                className="text-xl text-slate-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                Patient ID: <span className="font-mono font-semibold text-mistral-amber">{ticketData.qrToken.split(':')[0]}</span>
            </motion.p>

            <motion.p
                className="text-lg text-slate-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
            >
                Arrival time: <span className="font-semibold text-mistral-amber">{formatArrivalTime(ticketData.arrivalTime)}</span>
            </motion.p>

            <motion.p
                className="text-lg text-slate-400 text-center max-w-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
            >
                You will be taken care of shortly. Please wait in the waiting room.
            </motion.p>

            <motion.button
                onClick={onReset}
                className="text-lg px-10 py-4 rounded-xl font-semibold border-2 border-mistral-card text-slate-300 bg-mistral-card hover:bg-mistral-card-hover active:scale-95 transition-all cursor-pointer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
            >
                Start Over
            </motion.button>
        </motion.div>
    )
}
