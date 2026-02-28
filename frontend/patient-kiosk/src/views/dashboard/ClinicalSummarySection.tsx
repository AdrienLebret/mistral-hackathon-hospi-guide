import { Stethoscope } from 'lucide-react'
import type { PatientClinical } from '@/types/patient'
import { Badge } from '@/components/ui/badge'

interface ClinicalSummarySectionProps {
  clinical: Partial<PatientClinical>
}

const OPQRST_LABELS: Record<string, string> = {
  onset: 'Debut',
  provocation: 'Provocation',
  palliation: 'Soulagement',
  quality: 'Qualite',
  region: 'Localisation',
  severity: 'Intensite',
  timing: 'Temporalite',
}

export function ClinicalSummarySection({ clinical }: ClinicalSummarySectionProps) {
  const sa = clinical.symptomAssessment ?? {}
  const opqrstEntries = Object.entries(OPQRST_LABELS)
    .map(([key, label]) => {
      const val = sa[key as keyof typeof sa]
      if (val === undefined || val === null) return null
      return { label, value: key === 'severity' ? `${val}/10` : String(val) }
    })
    .filter(Boolean) as { label: string; value: string }[]

  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
        <Stethoscope size={16} className="text-mistral-orange" />
        Resume clinique
      </div>

      {clinical.chiefComplaint && (
        <p className="text-sm text-white mb-3 bg-slate-800/50 rounded-lg p-2">
          {clinical.chiefComplaint}
        </p>
      )}

      {opqrstEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
          {opqrstEntries.map(entry => (
            <div key={entry.label} className="text-xs">
              <span className="text-slate-500">{entry.label} :</span>{' '}
              <span className="text-slate-300">{entry.value}</span>
            </div>
          ))}
        </div>
      )}

      {clinical.associatedSymptoms && clinical.associatedSymptoms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {clinical.associatedSymptoms.map(s => (
            <Badge key={s} variant="secondary" className="text-[11px]">
              {s}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
