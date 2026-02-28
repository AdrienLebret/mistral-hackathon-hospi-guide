import type { PatientData } from './patient'
import type { CcmuLevel } from './ccmu'

// --- Triage Zones ---
export type TriageZone = 'rouge' | 'orange' | 'verte' | 'psychiatrique' | 'attente'

export interface TriageZoneInfo {
  id: TriageZone
  label: string
  shortLabel: string
  color: string
  description: string
}

// --- Queue ---
export type QueueStatus = 'waiting' | 'called' | 'in_triage' | 'completed' | 'cancelled'

export interface NurseQueueItem {
  facilityId: string
  patientId: string
  ccmuLevel: CcmuLevel
  status: QueueStatus
  assignedZone: TriageZone
  chiefComplaintShort: string
  patientName: string
  arrivalTime: string
  calledTime?: string
  qrToken: string
  patientData: PatientData
  datagouvContext?: DatagouvContext
  aiInsights: AIInsight[]
}

// --- DataGouv Enrichment ---
export interface DatagouvContext {
  prevalenceContext: string
  comorbidityFlags: string
  medicationNotes: string
  facilityNote?: string
  dataSources: string[]
}

// --- AI Insights ---
export type InsightType =
  | 'epidemic_alert'
  | 'medication_interaction'
  | 'differential_diagnosis'
  | 'comorbidity_risk'
  | 'population_stat'
  | 'facility_note'

export type InsightSeverity = 'info' | 'warning' | 'critical'

export interface AIInsight {
  id: string
  type: InsightType
  severity: InsightSeverity
  title: string
  description: string
  source: string
  confidence: number
  timestamp: string
}
