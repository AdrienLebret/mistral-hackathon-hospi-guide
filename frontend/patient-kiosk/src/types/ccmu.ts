/** CCMU classification levels used in French emergency medicine */
export type CcmuLevel = '1' | '2' | '3' | '4' | '5' | 'P' | 'D'

/** Display information for a CCMU level */
export interface CcmuInfo {
  level: CcmuLevel
  label: string // French label
  color: string // Tailwind class
  priority: string // French priority description
}

/** Mapping of CCMU levels to their display information */
export const CCMU_MAP: Record<CcmuLevel, CcmuInfo> = {
  '1': {
    level: '1',
    label: 'Etat stable, abstention therapeutique',
    color: 'green-500',
    priority: 'Non urgent',
  },
  '2': {
    level: '2',
    label: 'Etat stable, decision diagnostique ou therapeutique',
    color: 'yellow-500',
    priority: 'Peu urgent',
  },
  '3': {
    level: '3',
    label: 'Etat susceptible de s\'aggraver',
    color: 'orange-500',
    priority: 'Urgent',
  },
  '4': {
    level: '4',
    label: 'Pronostic vital engage',
    color: 'red-500',
    priority: 'Tres urgent',
  },
  '5': {
    level: '5',
    label: 'Pronostic vital engage, prise en charge immediate',
    color: 'red-600',
    priority: 'Urgence absolue',
  },
  P: {
    level: 'P',
    label: 'Probleme psychiatrique predominant',
    color: 'purple-500',
    priority: 'Psychiatrique',
  },
  D: {
    level: 'D',
    label: 'Patient decede',
    color: 'gray-900',
    priority: 'Deces',
  },
}
