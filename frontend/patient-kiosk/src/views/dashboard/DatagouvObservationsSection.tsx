import { Database } from 'lucide-react'
import type { DatagouvContext } from '@/types/dashboard'

interface DatagouvObservationsSectionProps {
  context: DatagouvContext
}

export function DatagouvObservationsSection({ context }: DatagouvObservationsSectionProps) {
  const entries = [
    { label: 'Prevalence', value: context.prevalenceContext },
    { label: 'Comorbidities', value: context.comorbidityFlags },
    { label: 'Medications', value: context.medicationNotes },
    ...(context.facilityNote ? [{ label: 'Facility', value: context.facilityNote }] : []),
  ]

  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
        <Database size={16} className="text-emerald-400" />
        Data.gouv Observations
      </div>

      <div className="space-y-2">
        {entries.map(entry => (
          <div key={entry.label} className="bg-slate-800/40 rounded-lg p-2.5">
            <p className="text-[10px] text-emerald-400 font-semibold uppercase mb-0.5">
              {entry.label}
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">{entry.value}</p>
          </div>
        ))}
      </div>

      {context.dataSources.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {context.dataSources.map(src => (
            <span
              key={src}
              className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400/70"
            >
              {src}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
