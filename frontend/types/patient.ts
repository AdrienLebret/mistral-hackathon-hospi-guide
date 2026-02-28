/**
 * Patient-safe summary extracted from the triage document via the information boundary.
 * Contains ONLY factual, patient-declared data — never CCMU, red flags, or clinical reasoning.
 */
export interface PatientSummary {
    chiefComplaint: string
    declaredSymptoms: string[]
    medicalHistory: string[]
    medications: string[]
    allergies: string[]
}

/**
 * Full triage document received from the backend.
 * Fields marked "NEVER shown to patient" must be filtered out before any patient-facing display.
 */
export interface TriageDocument {
    patient_chief_complaint: string
    clinical_assessment: {
        chief_complaint?: string
        opqrst: Record<string, unknown>
        red_flags: string[]
        medical_history: string[]
        medications: string[]
        allergies: string[]
        associated_symptoms?: string[]
    }
    datagouv_context: Record<string, unknown>
    /** NEVER shown to patient */
    recommended_ccmu: string
    /** NEVER shown to patient */
    ccmu_reasoning: string
    data_quality_notes: string | null
    timestamp: string
    [key: string]: unknown
}
