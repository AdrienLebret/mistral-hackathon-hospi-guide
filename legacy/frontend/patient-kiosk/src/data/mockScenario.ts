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
    message: msg('assistant', 'Bonjour et bienvenue aux urgences. Je suis votre assistant de pré-triage. Comment vous appelez-vous ?'),
    avatarState: 'talking',
    patientDataDelta: {},
  },
  {
    message: msg('patient', 'Bonjour, je m\'appelle Jean Dupont.'),
    avatarState: 'listening',
    revealsSection: 'identite',
    patientDataDelta: {
      identity: { fullName: 'Jean Dupont' },
    },
  },
  {
    message: msg('assistant', 'Merci Monsieur Dupont. Quelle est votre date de naissance ?'),
    avatarState: 'talking',
    patientDataDelta: {},
  },
  {
    message: msg('patient', 'Le 12 mai 1958. J\'ai 67 ans.'),
    avatarState: 'listening',
    patientDataDelta: {
      identity: { fullName: 'Jean Dupont', dateOfBirth: '1958-05-12', gender: 'M' },
    },
  },
  {
    message: msg('assistant', 'Très bien. Qu\'est-ce qui vous amène aux urgences aujourd\'hui ?'),
    avatarState: 'talking',
    patientDataDelta: {},
  },
  {
    message: msg('patient', 'J\'ai une forte douleur dans la poitrine depuis ce matin, ça serre et ça irradie vers le bras gauche. Je suis aussi essoufflé et en sueur.'),
    avatarState: 'listening',
    revealsSection: 'motif',
    patientDataDelta: {
      clinical: { chiefComplaint: 'Douleur thoracique oppressante avec irradiation bras gauche' },
    },
  },
  {
    message: msg('assistant', 'Je comprends. Pouvez-vous me décrire plus précisément cette douleur ? Quand a-t-elle commencé exactement et sur une échelle de 0 à 10 ?'),
    avatarState: 'talking',
    patientDataDelta: {},
  },
  {
    message: msg('patient', 'Ça a commencé ce matin après avoir monté les escaliers. C\'est continu depuis environ 3 heures. Je dirais 7 sur 10.'),
    avatarState: 'listening',
    revealsSection: 'symptomes',
    patientDataDelta: {
      clinical: {
        chiefComplaint: 'Douleur thoracique oppressante avec irradiation bras gauche',
        symptomAssessment: {
          onset: 'Ce matin, après effort physique',
          provocation: 'Effort physique (montée d\'escaliers)',
          quality: 'Oppression, serrement',
          region: 'Thorax, irradiation bras gauche',
          severity: 7,
          timing: 'Continu depuis 3 heures',
        },
        associatedSymptoms: ['Dyspnée', 'Diaphorèse'],
        redFlags: ['Douleur thoracique avec dyspnée et diaphorèse'],
      },
    },
  },
  {
    message: msg('assistant', 'Avez-vous des antécédents médicaux ? Des maladies chroniques ?'),
    avatarState: 'talking',
    patientDataDelta: {},
  },
  {
    message: msg('patient', 'Oui, je suis suivi pour de l\'hypertension artérielle et un diabète de type 2.'),
    avatarState: 'listening',
    revealsSection: 'antecedents',
    patientDataDelta: {
      clinical: {
        chiefComplaint: 'Douleur thoracique oppressante avec irradiation bras gauche',
        symptomAssessment: {
          onset: 'Ce matin, après effort physique',
          provocation: 'Effort physique (montée d\'escaliers)',
          quality: 'Oppression, serrement',
          region: 'Thorax, irradiation bras gauche',
          severity: 7,
          timing: 'Continu depuis 3 heures',
        },
        associatedSymptoms: ['Dyspnée', 'Diaphorèse'],
        redFlags: ['Douleur thoracique avec dyspnée et diaphorèse'],
        medicalHistory: ['Hypertension artérielle', 'Diabète de type 2'],
      },
    },
  },
  {
    message: msg('assistant', 'Prenez-vous des médicaments actuellement ?'),
    avatarState: 'talking',
    patientDataDelta: {},
  },
  {
    message: msg('patient', 'Oui, je prends de la Metformine 1000mg et de l\'Amlodipine 5mg.'),
    avatarState: 'listening',
    revealsSection: 'traitements',
    patientDataDelta: {
      clinical: {
        chiefComplaint: 'Douleur thoracique oppressante avec irradiation bras gauche',
        symptomAssessment: {
          onset: 'Ce matin, après effort physique',
          provocation: 'Effort physique (montée d\'escaliers)',
          quality: 'Oppression, serrement',
          region: 'Thorax, irradiation bras gauche',
          severity: 7,
          timing: 'Continu depuis 3 heures',
        },
        associatedSymptoms: ['Dyspnée', 'Diaphorèse'],
        redFlags: ['Douleur thoracique avec dyspnée et diaphorèse'],
        medicalHistory: ['Hypertension artérielle', 'Diabète de type 2'],
        currentMedications: ['Metformine 1000mg', 'Amlodipine 5mg'],
      },
    },
  },
  {
    message: msg('assistant', 'Avez-vous des allergies connues à des médicaments ou autres ?'),
    avatarState: 'talking',
    patientDataDelta: {},
  },
  {
    message: msg('patient', 'Non, pas d\'allergies connues.'),
    avatarState: 'listening',
    revealsSection: 'allergies',
    patientDataDelta: {
      clinical: {
        chiefComplaint: 'Douleur thoracique oppressante avec irradiation bras gauche',
        symptomAssessment: {
          onset: 'Ce matin, après effort physique',
          provocation: 'Effort physique (montée d\'escaliers)',
          quality: 'Oppression, serrement',
          region: 'Thorax, irradiation bras gauche',
          severity: 7,
          timing: 'Continu depuis 3 heures',
        },
        associatedSymptoms: ['Dyspnée', 'Diaphorèse'],
        redFlags: ['Douleur thoracique avec dyspnée et diaphorèse'],
        medicalHistory: ['Hypertension artérielle', 'Diabète de type 2'],
        currentMedications: ['Metformine 1000mg', 'Amlodipine 5mg'],
        allergies: [],
        suggestedCcmu: '4',
      },
    },
  },
  {
    message: msg('assistant', 'Merci Monsieur Dupont. J\'ai rassemblé toutes vos informations. Je prépare votre dossier de pré-triage.'),
    avatarState: 'talking',
    patientDataDelta: {
      identity: {
        fullName: 'Jean Dupont',
        dateOfBirth: '1958-05-12',
        gender: 'M',
        phone: '+33 6 12 34 56 78',
        insuranceType: 'carte_vitale',
        insuranceNumber: '1 58 05 75 XXX XXX XX',
        mutuelle: 'MGEN',
        emergencyContactName: 'Marie Dupont',
        emergencyContactPhone: '+33 6 98 76 54 32',
        emergencyContactRelation: 'Épouse',
        attendingPhysician: 'Dr Martin, Cabinet Rivoli',
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
    fullName: 'Jean Dupont',
    dateOfBirth: '1958-05-12',
    gender: 'M',
    phone: '+33 6 12 34 56 78',
    insuranceType: 'carte_vitale',
    insuranceNumber: '1 58 05 75 XXX XXX XX',
    mutuelle: 'MGEN',
    emergencyContactName: 'Marie Dupont',
    emergencyContactPhone: '+33 6 98 76 54 32',
    emergencyContactRelation: 'Épouse',
    attendingPhysician: 'Dr Martin, Cabinet Rivoli',
  },
  clinical: {
    chiefComplaint: 'Douleur thoracique oppressante avec irradiation bras gauche',
    symptomAssessment: {
      onset: 'Ce matin, après effort physique',
      provocation: 'Effort physique (montée d\'escaliers)',
      quality: 'Oppression, serrement',
      region: 'Thorax, irradiation bras gauche',
      severity: 7,
      timing: 'Continu depuis 3 heures',
    },
    associatedSymptoms: ['Dyspnée', 'Diaphorèse'],
    medicalHistory: ['Hypertension artérielle', 'Diabète de type 2'],
    surgicalHistory: [],
    currentMedications: ['Metformine 1000mg', 'Amlodipine 5mg'],
    allergies: [],
    redFlags: ['Douleur thoracique avec dyspnée et diaphorèse'],
    suggestedCcmu: '4',
  },
}
