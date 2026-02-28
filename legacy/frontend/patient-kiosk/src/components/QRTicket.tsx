import { QRCodeSVG } from 'qrcode.react'
import { motion } from 'framer-motion'
import type { PatientData } from '@/types/patient'
import type { CcmuLevel } from '@/types/ccmu'
import { CcmuBadge } from './CcmuBadge'

interface QRTicketProps {
  patientData: PatientData
}

export function QRTicket({ patientData }: QRTicketProps) {
  const qrUrl = `https://hospi-guide.example.com/queue/${patientData.qrToken}`
  const ticketNumber = `URG-${patientData.patientId.replace('PAT-', '')}`
  const ccmuLevel = (patientData.clinical?.suggestedCcmu ?? '2') as CcmuLevel

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-sm mx-auto bg-white rounded-3xl p-8 text-center"
    >
      {/* Ticket number */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Ticket N°</p>
        <p className="text-3xl font-bold text-gray-900 tracking-wider">{ticketNumber}</p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center my-6">
        <div className="p-4 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <QRCodeSVG
            value={qrUrl}
            size={180}
            level="M"
            fgColor="#0F172A"
            bgColor="#FFFFFF"
          />
        </div>
      </div>

      {/* Patient name */}
      <p className="text-lg font-semibold text-gray-800">
        {patientData.identity?.fullName}
      </p>

      {/* CCMU */}
      <div className="mt-3 flex justify-center">
        <CcmuBadge level={ccmuLevel} />
      </div>

      {/* Instructions */}
      <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
        <p className="text-sm text-gray-500">
          Scannez ce QR code pour suivre votre position dans la file d'attente.
        </p>
      </div>
    </motion.div>
  )
}
