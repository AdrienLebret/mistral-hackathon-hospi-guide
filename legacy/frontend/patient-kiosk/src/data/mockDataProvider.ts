import type { PatientData } from '@/types/patient'
import { MOCK_SCENARIO, FINAL_PATIENT_DATA, type ScenarioStep } from './mockScenario'

export interface DataProvider {
  startSession(): Promise<string>
  getNextStep(): Promise<ScenarioStep | null>
  submitValidation(): Promise<PatientData>
  reset(): void
}

export function createMockDataProvider(): DataProvider {
  let currentIndex = 0

  return {
    async startSession() {
      currentIndex = 0
      return FINAL_PATIENT_DATA.patientId
    },

    async getNextStep() {
      if (currentIndex >= MOCK_SCENARIO.length) return null
      const step = MOCK_SCENARIO[currentIndex]!
      currentIndex++
      // Simulate network delay proportional to message length
      const delay = Math.min(step.message.text.length * 25, 2000) + 500
      await new Promise(r => setTimeout(r, delay))
      return step
    },

    async submitValidation() {
      await new Promise(r => setTimeout(r, 800))
      return { ...FINAL_PATIENT_DATA, qrToken: crypto.randomUUID() }
    },

    reset() {
      currentIndex = 0
    },
  }
}
