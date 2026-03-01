import { MousePointerClick } from 'lucide-react'
import type { NurseQueueItem, TriageZone } from '@/types/dashboard'
import { PatientDetailHeader } from './PatientDetailHeader'
import { RedFlagsAlert } from './RedFlagsAlert'
import { ClinicalSummarySection } from './ClinicalSummarySection'
import { MedicalContextSection } from './MedicalContextSection'
import { AIInsightsSection } from './AIInsightsSection'
import { DatagouvObservationsSection } from './DatagouvObservationsSection'
import { AdminInfoSection } from './AdminInfoSection'
import { TriageZoneAssignment } from './TriageZoneAssignment'

interface DetailPanelProps {
  patient: NurseQueueItem | null
  onAssignZone: (patientId: string, zone: TriageZone) => void
}

export function DetailPanel({ patient, onAssignZone }: DetailPanelProps) {
  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-600">
        <MousePointerClick size={48} className="mb-4" />
        <p className="text-sm">Select a patient to view details</p>
      </div>
    )
  }

  return (
    <div
      key={patient.patientId}
      className="h-full overflow-y-auto space-y-4 p-4 scrollbar-thin"
    >
      <PatientDetailHeader item={patient} />

      <RedFlagsAlert flags={patient.patientData.clinical?.redFlags ?? []} />

      <ClinicalSummarySection clinical={patient.patientData.clinical ?? {}} />

      <MedicalContextSection clinical={patient.patientData.clinical ?? {}} />

      <AIInsightsSection insights={patient.aiInsights} />

      {patient.datagouvContext && (
        <DatagouvObservationsSection context={patient.datagouvContext} />
      )}

      <AdminInfoSection identity={patient.patientData.identity ?? {}} />

      <div className="sticky bottom-0 bg-mistral-dark/90 backdrop-blur-sm pt-3 pb-1 -mx-4 px-4 border-t border-slate-800">
        <TriageZoneAssignment
          currentZone={patient.assignedZone}
          onAssign={zone => onAssignZone(patient.patientId, zone)}
        />
      </div>
    </div>
  )
}
