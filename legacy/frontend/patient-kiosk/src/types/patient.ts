/** Patient identity information collected during triage */
export interface PatientIdentity {
  fullName: string
  dateOfBirth: string // ISO 8601 format
  gender: 'M' | 'F' | 'Autre'
  phone: string
  address?: string
  insuranceType?: 'carte_vitale' | 'cmu' | 'ame' | 'private' | 'none'
  insuranceNumber?: string
  mutuelle?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string
  attendingPhysician?: string
}

/** OPQRST symptom assessment framework */
export interface SymptomAssessment {
  onset?: string
  provocation?: string
  palliation?: string
  quality?: string
  region?: string
  radiation?: string
  severity?: number // 0-10
  timing?: string
}

/** Clinical data gathered from the AI conversation */
export interface PatientClinical {
  chiefComplaint: string
  symptomAssessment: SymptomAssessment
  associatedSymptoms: string[]
  medicalHistory: string[]
  surgicalHistory: string[]
  currentMedications: string[]
  allergies: string[]
  redFlags: string[]
  suggestedCcmu: string
}

/** Full patient record for the kiosk session */
export interface PatientData {
  patientId: string // PAT-YYYYMMDD-NNN format
  identity: Partial<PatientIdentity>
  clinical: Partial<PatientClinical>
  qrToken: string
  facilityId: string
  arrivalTime: string // ISO 8601
}
