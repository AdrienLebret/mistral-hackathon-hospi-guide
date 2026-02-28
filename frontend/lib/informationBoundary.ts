import type { TriageDocument, PatientSummary } from '../types/patient'

/**
 * Single enforcement point for the information boundary.
 *
 * Extracts ONLY factual, patient-declared data from the triage document.
 * Never accesses or returns restricted fields: recommended_ccmu, ccmu_reasoning,
 * red_flags, opqrst, is_urgent.
 *
 * Handles multiple possible document structures since the backend may
 * produce different shapes depending on whether tool results were captured.
 */
export function extractPatientSummary(triageDocument: TriageDocument): PatientSummary {
    const assessment = triageDocument.clinical_assessment ?? {} as TriageDocument['clinical_assessment']

    // Chief complaint: try multiple sources
    const chiefComplaint =
        triageDocument.patient_chief_complaint
        || assessment?.chief_complaint
        || (triageDocument as Record<string, unknown>).chief_complaint as string
        || ''

    // Declared symptoms: try associated_symptoms
    const declaredSymptoms: string[] = Array.isArray(assessment?.associated_symptoms)
        ? assessment.associated_symptoms
        : []

    // Medical history
    const medicalHistory: string[] = Array.isArray(assessment?.medical_history)
        ? assessment.medical_history
        : []

    // Medications
    const medications: string[] = Array.isArray(assessment?.medications)
        ? assessment.medications
        : []

    // Allergies
    const allergies: string[] = Array.isArray(assessment?.allergies)
        ? assessment.allergies
        : []

    return {
        chiefComplaint,
        declaredSymptoms,
        medicalHistory,
        medications,
        allergies,
    }
}
