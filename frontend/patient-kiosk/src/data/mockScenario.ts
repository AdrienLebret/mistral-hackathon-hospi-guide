import type { AvatarState, ConversationMessage, InfoSection } from '@/types/kiosk'
import type { PatientData } from '@/types/patient'

export interface ScenarioStep {
  message: ConversationMessage
  revealsSection?: InfoSection
  patientDataDelta: Partial<PatientData>
  avatarState: AvatarState
}

let _id = 0
function msg(role: 'assistant' | 'patient', text: string): ConversationMessage {
  return { id: String(++_id), role, text, timestamp: Date.now() }
}

export const MOCK_SCENARIO: ScenarioStep[] = [
  {
    message: msg('assistant', 'Hello and welcome to the emergency room. I am your pre-triage assistant. What is your name?'),
    avatarState: 'talking',
    patientDataDelta: {},
  },
  {
    message: msg('patient', 'Hello, my name is John Smith.'),
    avatarState: 'listening',
    revealsSection: 'identite',
    patientDataDelta: {
      identity: { fullName: 'John Smith' },
    },
  },
  {
    message: msg('assistant', 'Thank you, Mr. Smith. What is your date of birth?'),
    avatarState: 'talking',
    patientDataDelta: {},
  },
  {
    message: msg('patient', 'May 12th, 1958. I am 67 years old.'),
    avatarState: 'listening',
    patientDataDelta: {
      identity: { fullName: 'John Smith', dateOfBirth: '1958-05-12', gender: 'M' },
    },
  },
  {
    message: msg('assistant', 'Very well. What brings you to the emergency room today?'),
    avatarState: 'talking',
    patientDataDelta: {},
  },
  {
    message: msg('patient', 'I have a severe pain in my chest since this morning. It feels tight and radiates to my left arm. I am also short of breath and sweating.'),
    avatarState: 'listening',
    revealsSection: 'motif',
    patientDataDelta: {
      clinical: { chiefComplaint: 'Oppressive chest pain with radiation to left arm' },
    },
  },
  {
    message: msg('assistant', 'I understand. Can you describe the pain more precisely? When exactly did it start and on a scale from 0 to 10?'),
    avatarState: 'talking',
    patientDataDelta: {},
  },
  {
    message: msg('patient', 'It started this morning after climbing the stairs. It has been continuous for about 3 hours. I would say 7 out of 10.'),
    avatarState: 'listening',
    revealsSection: 'symptomes',
    patientDataDelta: {
      clinical: {
        chiefComplaint: 'Oppressive chest pain with radiation to left arm',
        symptomAssessment: {
          onset: 'This morning, after physical exertion',
          provocation: 'Physical exertion (climbing stairs)',
          quality: 'Tightness, squeezing',
          region: 'Chest, radiation to left arm',
          severity: 7,
          timing: 'Continuous for 3 hours',
        },
        associatedSymptoms: ['Dyspnea', 'Diaphoresis'],
        redFlags: ['Chest pain with dyspnea and diaphoresis'],
      },
    },
  },
  {
    message: msg('assistant', 'Do you have any medical history? Any chronic conditions?'),
    avatarState: 'talking',
    patientDataDelta: {},
  },
  {
    message: msg('patient', 'Yes, I am being treated for arterial hypertension and type 2 diabetes.'),
    avatarState: 'listening',
    revealsSection: 'antecedents',
    patientDataDelta: {
      clinical: {
        chiefComplaint: 'Oppressive chest pain with radiation to left arm',
        symptomAssessment: {
          onset: 'This morning, after physical exertion',
          provocation: 'Physical exertion (climbing stairs)',
          quality: 'Tightness, squeezing',
          region: 'Chest, radiation to left arm',
          severity: 7,
          timing: 'Continuous for 3 hours',
        },
        associatedSymptoms: ['Dyspnea', 'Diaphoresis'],
        redFlags: ['Chest pain with dyspnea and diaphoresis'],
        medicalHistory: ['Arterial Hypertension', 'Type 2 Diabetes'],
      },
    },
  },
  {
    message: msg('assistant', 'Are you currently taking any medications?'),
    avatarState: 'talking',
    patientDataDelta: {},
  },
  {
    message: msg('patient', 'Yes, I take Metformin 1000mg and Amlodipine 5mg.'),
    avatarState: 'listening',
    revealsSection: 'traitements',
    patientDataDelta: {
      clinical: {
        chiefComplaint: 'Oppressive chest pain with radiation to left arm',
        symptomAssessment: {
          onset: 'This morning, after physical exertion',
          provocation: 'Physical exertion (climbing stairs)',
          quality: 'Tightness, squeezing',
          region: 'Chest, radiation to left arm',
          severity: 7,
          timing: 'Continuous for 3 hours',
        },
        associatedSymptoms: ['Dyspnea', 'Diaphoresis'],
        redFlags: ['Chest pain with dyspnea and diaphoresis'],
        medicalHistory: ['Arterial Hypertension', 'Type 2 Diabetes'],
        currentMedications: ['Metformin 1000mg', 'Amlodipine 5mg'],
      },
    },
  },
  {
    message: msg('assistant', 'Do you have any known allergies to medications or other substances?'),
    avatarState: 'talking',
    patientDataDelta: {},
  },
  {
    message: msg('patient', 'No, no known allergies.'),
    avatarState: 'listening',
    revealsSection: 'allergies',
    patientDataDelta: {
      clinical: {
        chiefComplaint: 'Oppressive chest pain with radiation to left arm',
        symptomAssessment: {
          onset: 'This morning, after physical exertion',
          provocation: 'Physical exertion (climbing stairs)',
          quality: 'Tightness, squeezing',
          region: 'Chest, radiation to left arm',
          severity: 7,
          timing: 'Continuous for 3 hours',
        },
        associatedSymptoms: ['Dyspnea', 'Diaphoresis'],
        redFlags: ['Chest pain with dyspnea and diaphoresis'],
        medicalHistory: ['Arterial Hypertension', 'Type 2 Diabetes'],
        currentMedications: ['Metformin 1000mg', 'Amlodipine 5mg'],
        allergies: [],
        suggestedCcmu: '4',
      },
    },
  },
  {
    message: msg('assistant', 'Thank you, Mr. Smith. I have gathered all your information. I am preparing your pre-triage file.'),
    avatarState: 'talking',
    patientDataDelta: {
      identity: {
        fullName: 'John Smith',
        dateOfBirth: '1958-05-12',
        gender: 'M',
        phone: '+1 555 123 4567',
        insuranceType: 'private',
        insuranceNumber: 'INS-58-05-XXX-XXX',
        emergencyContactName: 'Mary Smith',
        emergencyContactPhone: '+1 555 987 6543',
        emergencyContactRelation: 'Spouse',
        attendingPhysician: 'Dr. Martin, Downtown Clinic',
      },
    },
  },
]

export const FINAL_PATIENT_DATA: PatientData = {
  patientId: 'PAT-20260228-001',
  facilityId: 'NECKER',
  arrivalTime: new Date().toISOString(),
  qrToken: crypto.randomUUID(),
  identity: {
    fullName: 'John Smith',
    dateOfBirth: '1958-05-12',
    gender: 'M',
    phone: '+1 555 123 4567',
    insuranceType: 'private',
    insuranceNumber: 'INS-58-05-XXX-XXX',
    emergencyContactName: 'Mary Smith',
    emergencyContactPhone: '+1 555 987 6543',
    emergencyContactRelation: 'Spouse',
    attendingPhysician: 'Dr. Martin, Downtown Clinic',
  },
  clinical: {
    chiefComplaint: 'Oppressive chest pain with radiation to left arm',
    symptomAssessment: {
      onset: 'This morning, after physical exertion',
      provocation: 'Physical exertion (climbing stairs)',
      quality: 'Tightness, squeezing',
      region: 'Chest, radiation to left arm',
      severity: 7,
      timing: 'Continuous for 3 hours',
    },
    associatedSymptoms: ['Dyspnea', 'Diaphoresis'],
    medicalHistory: ['Arterial Hypertension', 'Type 2 Diabetes'],
    surgicalHistory: [],
    currentMedications: ['Metformin 1000mg', 'Amlodipine 5mg'],
    allergies: [],
    redFlags: ['Chest pain with dyspnea and diaphoresis'],
    suggestedCcmu: '4',
  },
}
