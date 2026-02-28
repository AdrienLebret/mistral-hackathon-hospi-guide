import { cn } from '@/lib/utils'
import type { TriageZone } from '@/types/dashboard'
import { TRIAGE_ZONES } from '@/data/triageZones'

const ZONE_COLORS: Record<TriageZone, string> = {
  rouge: 'bg-red-600 text-white',
  orange: 'bg-orange-500 text-white',
  verte: 'bg-green-500 text-white',
  psychiatrique: 'bg-purple-500 text-white',
  attente: 'bg-slate-600 text-slate-300',
}

interface ZoneBadgeProps {
  zone: TriageZone
  className?: string
}

export function ZoneBadge({ zone, className }: ZoneBadgeProps) {
  const info = TRIAGE_ZONES[zone]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        ZONE_COLORS[zone],
        className,
      )}
    >
      {info.shortLabel}
    </span>
  )
}
