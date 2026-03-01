import type { TriageZone, TriageZoneInfo } from '@/types/dashboard'

export const TRIAGE_ZONES: Record<TriageZone, TriageZoneInfo> = {
  rouge: {
    id: 'rouge',
    label: 'Red Zone (SAUV)',
    shortLabel: 'SAUV',
    color: 'red-600',
    description: 'Immediate life threat',
  },
  orange: {
    id: 'orange',
    label: 'Orange Zone',
    shortLabel: 'Urgent',
    color: 'orange-500',
    description: 'Urgent care',
  },
  verte: {
    id: 'verte',
    label: 'Green Zone',
    shortLabel: 'Standard',
    color: 'green-500',
    description: 'Standard care',
  },
  psychiatrique: {
    id: 'psychiatrique',
    label: 'Psychiatric Zone',
    shortLabel: 'Psych',
    color: 'purple-500',
    description: 'Psychiatric pathway',
  },
  attente: {
    id: 'attente',
    label: 'Waiting Room',
    shortLabel: 'Waiting',
    color: 'slate-500',
    description: 'Awaiting assignment',
  },
}

export const CCMU_SORT_ORDER: Record<string, number> = {
  '5': 0,
  '4': 1,
  '3': 2,
  P: 3,
  '2': 4,
  '1': 5,
  D: 6,
}
