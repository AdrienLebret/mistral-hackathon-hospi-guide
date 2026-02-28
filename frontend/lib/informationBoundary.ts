import type { TriageDocument, PatientSummary } from '../types/patient'

/**
 * Single enforcement point for the information boundary.
 *
 * Extracts ONLY factual, patient-declared data from the triage document.
 * Never accesses or returns restricted fields: recommended_ccmu, ccmu_reasoning,
 * red_flags, opqrst, is_urgent.
 */
export function extractPatientSummary(triageDocument: TriageDocument): PatientSummary {
    const assessment = triageDocument.clinical_assessment

    return {
        chiefComplaint: triageDocument.patient_chief_complaint ?? '',
        declaredSymptoms: [],
        medicalHistory: Array.isArray(assessment?.medical_history) ? assessment.medical_history : [],
        medications: Array.isArray(assessment?.medications) ? assessment.medications : [],
        allergies: Array.isArray(assessment?.allergies) ? assessment.allergies : [],
    }
}
