/** CCMU classification levels used in French emergency medicine */
export type CcmuLevel = '1' | '2' | '3' | '4' | '5' | 'P' | 'D'

/** Display information for a CCMU level */
export interface CcmuInfo {
  level: CcmuLevel
  label: string
  color: string // Tailwind class
  priority: string
}

/** Mapping of CCMU levels to their display information */
export const CCMU_MAP: Record<CcmuLevel, CcmuInfo> = {
  '1': {
    level: '1',
    label: 'Stable, no treatment needed',
    color: 'green-500',
    priority: 'Non-urgent',
  },
  '2': {
    level: '2',
    label: 'Stable, diagnostic or therapeutic decision needed',
    color: 'yellow-500',
    priority: 'Low urgency',
  },
  '3': {
    level: '3',
    label: 'Condition may deteriorate',
    color: 'orange-500',
    priority: 'Urgent',
  },
  '4': {
    level: '4',
    label: 'Life-threatening prognosis',
    color: 'red-500',
    priority: 'Very urgent',
  },
  '5': {
    level: '5',
    label: 'Life-threatening, immediate care required',
    color: 'red-600',
    priority: 'Absolute emergency',
  },
  P: {
    level: 'P',
    label: 'Predominant psychiatric condition',
    color: 'purple-500',
    priority: 'Psychiatric',
  },
  D: {
    level: 'D',
    label: 'Patient deceased',
    color: 'gray-900',
    priority: 'Deceased',
  },
}
