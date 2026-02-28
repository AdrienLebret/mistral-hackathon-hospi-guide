import { cn } from '@/lib/utils'
import type { TriageZone } from '@/types/dashboard'
import { TRIAGE_ZONES } from '@/data/triageZones'

const ZONE_BUTTON_COLORS: Record<TriageZone, { base: string; active: string }> = {
  rouge: { base: 'border-red-700 text-red-400 hover:bg-red-950/50', active: 'bg-red-600 text-white border-red-600' },
  orange: { base: 'border-orange-700 text-orange-400 hover:bg-orange-950/50', active: 'bg-orange-500 text-white border-orange-500' },
  verte: { base: 'border-green-700 text-green-400 hover:bg-green-950/50', active: 'bg-green-500 text-white border-green-500' },
  psychiatrique: { base: 'border-purple-700 text-purple-400 hover:bg-purple-950/50', active: 'bg-purple-500 text-white border-purple-500' },
  attente: { base: 'border-slate-600 text-slate-400 hover:bg-slate-800', active: 'bg-slate-600 text-white border-slate-600' },
}

const ZONE_ORDER: TriageZone[] = ['rouge', 'orange', 'verte', 'psychiatrique', 'attente']

interface TriageZoneAssignmentProps {
  currentZone: TriageZone
  onAssign: (zone: TriageZone) => void
}

export function TriageZoneAssignment({ currentZone, onAssign }: TriageZoneAssignmentProps) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-300 mb-2">Orientation</p>
      <div className="grid grid-cols-5 gap-2">
        {ZONE_ORDER.map(zone => {
          const info = TRIAGE_ZONES[zone]
          const colors = ZONE_BUTTON_COLORS[zone]
          const isActive = currentZone === zone

          return (
            <button
              key={zone}
              onClick={() => onAssign(zone)}
              className={cn(
                'flex flex-col items-center gap-0.5 p-2 rounded-lg border text-center transition-all',
                isActive ? colors.active : colors.base,
              )}
            >
              <span className="text-xs font-semibold">{info.shortLabel}</span>
              <span className="text-[9px] opacity-70 leading-tight">{info.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
