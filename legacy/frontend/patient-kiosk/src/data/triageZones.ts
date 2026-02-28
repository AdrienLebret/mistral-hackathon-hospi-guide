import type { TriageZone, TriageZoneInfo } from '@/types/dashboard'

export const TRIAGE_ZONES: Record<TriageZone, TriageZoneInfo> = {
  rouge: {
    id: 'rouge',
    label: 'Zone Rouge (SAUV)',
    shortLabel: 'SAUV',
    color: 'red-600',
    description: 'Menace vitale immediate',
  },
  orange: {
    id: 'orange',
    label: 'Zone Orange',
    shortLabel: 'Urgent',
    color: 'orange-500',
    description: 'Soins urgents',
  },
  verte: {
    id: 'verte',
    label: 'Zone Verte',
    shortLabel: 'Standard',
    color: 'green-500',
    description: 'Soins standards',
  },
  psychiatrique: {
    id: 'psychiatrique',
    label: 'Zone Psychiatrique',
    shortLabel: 'Psy',
    color: 'purple-500',
    description: 'Filiere psychiatrique',
  },
  attente: {
    id: 'attente',
    label: "Salle d'attente",
    shortLabel: 'Attente',
    color: 'slate-500',
    description: "En attente d'orientation",
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
