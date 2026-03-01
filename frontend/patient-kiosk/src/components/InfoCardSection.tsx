import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  AlertCircle,
  Activity,
  FileText,
  Pill,
  ShieldAlert,
} from 'lucide-react'
import type { InfoSection } from '@/types/kiosk'
import type { PatientData } from '@/types/patient'

interface InfoCardSectionProps {
  section: InfoSection
  revealed: boolean
  patientData: Partial<PatientData>
  isActive?: boolean
}

const SECTION_CONFIG: Record<InfoSection, { icon: typeof User; label: string }> = {
  identite: { icon: User, label: 'Identity' },
  motif: { icon: AlertCircle, label: 'Chief Complaint' },
  symptomes: { icon: Activity, label: 'Symptoms' },
  antecedents: { icon: FileText, label: 'Medical History' },
  traitements: { icon: Pill, label: 'Current Medications' },
  allergies: { icon: ShieldAlert, label: 'Allergies' },
}

function renderContent(section: InfoSection, data: Partial<PatientData>) {
  const identity = data.identity
  const clinical = data.clinical

  switch (section) {
    case 'identite':
      return (
        <div className="space-y-1 text-sm">
          {identity?.fullName && <p><span className="text-slate-400">Name:</span> {identity.fullName}</p>}
          {identity?.dateOfBirth && <p><span className="text-slate-400">DOB:</span> {identity.dateOfBirth}</p>}
          {identity?.gender && <p><span className="text-slate-400">Sex:</span> {identity.gender}</p>}
          {identity?.insuranceType && <p><span className="text-slate-400">Insurance:</span> {identity.insuranceType}</p>}
        </div>
      )
    case 'motif':
      return clinical?.chiefComplaint ? (
        <p className="text-sm">{clinical.chiefComplaint}</p>
      ) : null
    case 'symptomes': {
      const sa = clinical?.symptomAssessment
      return sa ? (
        <div className="space-y-1 text-sm">
          {sa.onset && <p><span className="text-slate-400">Onset:</span> {sa.onset}</p>}
          {sa.quality && <p><span className="text-slate-400">Quality:</span> {sa.quality}</p>}
          {sa.region && <p><span className="text-slate-400">Location:</span> {sa.region}</p>}
          {sa.severity != null && <p><span className="text-slate-400">Severity:</span> {sa.severity}/10</p>}
          {sa.timing && <p><span className="text-slate-400">Duration:</span> {sa.timing}</p>}
          {clinical?.associatedSymptoms && clinical.associatedSymptoms.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-1">
              {clinical.associatedSymptoms.map(s => (
                <span key={s} className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs">{s}</span>
              ))}
            </div>
          )}
        </div>
      ) : null
    }
    case 'antecedents':
      return clinical?.medicalHistory && clinical.medicalHistory.length > 0 ? (
        <div className="flex gap-1.5 flex-wrap">
          {clinical.medicalHistory.map(h => (
            <span key={h} className="px-2 py-0.5 rounded-full bg-mistral-orange/20 text-mistral-orange-light text-xs">{h}</span>
          ))}
        </div>
      ) : null
    case 'traitements':
      return clinical?.currentMedications && clinical.currentMedications.length > 0 ? (
        <div className="flex gap-1.5 flex-wrap">
          {clinical.currentMedications.map(m => (
            <span key={m} className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs">{m}</span>
          ))}
        </div>
      ) : null
    case 'allergies':
      return (
        <p className="text-sm">
          {clinical?.allergies && clinical.allergies.length > 0
            ? clinical.allergies.join(', ')
            : 'No known allergies'}
        </p>
      )
    default:
      return null
  }
}

export function InfoCardSection({ section, revealed, patientData, isActive }: InfoCardSectionProps) {
  const config = SECTION_CONFIG[section]
  const Icon = config.icon

  return (
    <motion.div
      layout
      className={`border-b border-slate-700/50 last:border-0 transition-colors ${
        isActive ? 'bg-mistral-orange/5' : ''
      }`}
    >
      <div className={`flex items-center gap-3 px-4 py-3 ${revealed ? 'text-white' : 'text-slate-500'}`}>
        <Icon size={18} className={revealed ? 'text-mistral-orange' : 'text-slate-600'} />
        <span className="font-medium text-sm">{config.label}</span>
        {!revealed && <span className="ml-auto text-xs text-slate-600">Pending...</span>}
      </div>
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pl-11">
              {renderContent(section, patientData)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
