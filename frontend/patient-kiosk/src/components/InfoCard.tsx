import { motion } from 'framer-motion'
import { ClipboardList } from 'lucide-react'
import type { InfoSection } from '@/types/kiosk'
import type { PatientData } from '@/types/patient'
import { InfoCardSection } from './InfoCardSection'
import { ProgressBar } from './ProgressBar'

interface InfoCardProps {
  patientData: Partial<PatientData>
  revealedSections: InfoSection[]
  progress: number
  activeSection?: InfoSection
}

const ALL_SECTIONS: InfoSection[] = [
  'identite',
  'motif',
  'symptomes',
  'antecedents',
  'traitements',
  'allergies',
]

export function InfoCard({ patientData, revealedSections, progress, activeSection }: InfoCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg mx-auto bg-mistral-card border border-slate-700 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-mistral-orange" />
          <span className="font-semibold text-sm">Fiche Patient</span>
        </div>
        <span className="text-xs text-slate-400">
          {revealedSections.length}/{ALL_SECTIONS.length} sections
        </span>
      </div>

      {/* Progress */}
      <div className="px-4 pt-3">
        <ProgressBar progress={progress} />
      </div>

      {/* Sections */}
      <div className="mt-2">
        {ALL_SECTIONS.map(section => (
          <InfoCardSection
            key={section}
            section={section}
            revealed={revealedSections.includes(section)}
            patientData={patientData}
            isActive={activeSection === section}
          />
        ))}
      </div>
    </motion.div>
  )
}
