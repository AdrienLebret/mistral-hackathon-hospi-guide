# Clinical Sub-Agent & Enhanced Interview Design

**Date:** 2026-03-01
**Status:** Approved

## Problem

The current orchestrator asks only 5 basic questions (name, complaint, 2-3 follow-ups, history, allergies). The compilation step is a dumb Python positional parser that leaves most validation page fields empty. No CCMU scoring, no red flag detection, no OPQRST structure.

## Decision

**Approach A — Single Clinical Sub-Agent** using Claude Haiku via Bedrock.

## Design

### 1. Enhanced Orchestrator (8-step OPQRST interview)

| Step | Question | Captures |
|------|----------|----------|
| 1 | "What is your name?" | Identity |
| 2 | "What brings you to the ER today?" | Chief complaint |
| 3 | "When did this start? Sudden or gradual?" | Onset |
| 4 | "Where exactly? Does it spread anywhere?" | Region/Radiation |
| 5 | "On a scale of 0-10, how bad is it?" | Severity |
| 6 | "Is it constant or comes and goes?" | Timing |
| 7 | "Any medical conditions, past surgeries, or regular medications?" | History + Meds |
| 8 | "Any known allergies, especially to medications?" | Allergies |

Adaptive: skip questions already answered. Still ends with "your file is being compiled" then `stop_conversation`.

### 2. Clinical Compilation Sub-Agent

After voice session ends, one Claude Haiku API call:

- **System prompt:** existing `clinical.md` (OPQRST + CCMU decision tree + red flags)
- **User message:** full transcript
- **Output:** structured JSON per clinical.md spec
- **Model:** `anthropic.claude-3-5-haiku-20241022-v1:0`, fallback `anthropic.claude-3-haiku-20240307-v1:0`
- **Fallback:** current Python positional parser if LLM call fails
- **Expected latency:** ~1-2 seconds

### 3. Field Mapping (Sub-agent JSON to Frontend PatientData)

| Sub-agent field | Frontend field |
|----------------|----------------|
| chief_complaint | clinical.chiefComplaint |
| opqrst.onset | clinical.symptomAssessment.onset |
| opqrst.provocation | clinical.symptomAssessment.provocation |
| opqrst.quality | clinical.symptomAssessment.quality |
| opqrst.region | clinical.symptomAssessment.region |
| opqrst.severity | clinical.symptomAssessment.severity |
| opqrst.timing | clinical.symptomAssessment.timing |
| medical_history | clinical.medicalHistory |
| medications | clinical.currentMedications |
| allergies | clinical.allergies |
| red_flags | clinical.redFlags |
| suggested_ccmu | clinical.suggestedCcmu |
| ccmu_reasoning | clinical.ccmuReasoning |

### 4. Files Changed

1. `backend/agents/prompts/orchestrator.md` - 8-step OPQRST flow
2. `backend/agents/profile_extractor.py` - Claude Haiku call + Python fallback
3. `backend/server.py` - run_in_executor for blocking API call
4. `frontend/.../hooks/useKioskStateMachine.ts` - map new compilation fields

No new files. Frontend validation UI already supports all fields.

### 5. Data Flow

```
Voice session -> 8 OPQRST questions -> stop_conversation
  -> CompilingView (loading)
  -> Claude Haiku (clinical.md prompt + transcript) ~1-2s
  -> JSON response mapped to PatientData
  -> compilation.complete WebSocket event
  -> ValidationView with rich report + CCMU score
```
