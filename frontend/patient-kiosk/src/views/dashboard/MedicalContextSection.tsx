import { Heart, Pill, AlertCircle } from 'lucide-react'
import type { PatientClinical } from '@/types/patient'
import { Badge } from '@/components/ui/badge'

interface MedicalContextSectionProps {
  clinical: Partial<PatientClinical>
}

export function MedicalContextSection({ clinical }: MedicalContextSectionProps) {
  const history = clinical.medicalHistory ?? []
  const meds = clinical.currentMedications ?? []
  const allergies = clinical.allergies ?? []
  const surgical = clinical.surgicalHistory ?? []

  const hasContent = history.length > 0 || meds.length > 0 || allergies.length > 0 || surgical.length > 0

  if (!hasContent) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
        <Heart size={16} className="text-mistral-orange" />
        Medical Context
      </div>

      {history.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-1">Medical History</p>
          <div className="flex flex-wrap gap-1.5">
            {history.map(h => (
              <Badge key={h} variant="outline" className="text-[11px]">
                {h}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {surgical.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-1">Surgical History</p>
          <div className="flex flex-wrap gap-1.5">
            {surgical.map(s => (
              <Badge key={s} variant="outline" className="text-[11px]">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {meds.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            <Pill size={12} /> Current Medications
          </p>
          <div className="flex flex-wrap gap-1.5">
            {meds.map(m => (
              <Badge key={m} variant="secondary" className="text-[11px]">
                {m}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {allergies.length > 0 && (
        <div>
          <p className="text-xs text-red-400 mb-1 flex items-center gap-1">
            <AlertCircle size={12} /> Allergies
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allergies.map(a => (
              <Badge key={a} variant="destructive" className="text-[11px]">
                {a}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
