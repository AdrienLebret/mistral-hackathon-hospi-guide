# Agent Prompts & Behavior — Triastral

This document describes the system prompts and behavioral specifications for each agent. The actual prompts are stored as markdown files in `backend/agents/prompts/` and loaded at runtime.

---

## Prompt Files

| Agent | Prompt File | Language |
|-------|------------|----------|
| Orchestrator (BidiAgent) | `backend/agents/prompts/orchestrator.md` | French |
| Clinical Agent (Agent 1) | `backend/agents/prompts/clinical.md` | French |
| DataGouv Agent (Agent 2) | `backend/agents/prompts/datagouv.md` | English |

---

## Orchestrator Agent

**Model**: Amazon Nova Sonic 2 (`amazon.nova-2-sonic-v1:0`)
**Prompt file**: `backend/agents/prompts/orchestrator.md`

### Key Behaviors
- Conducts a structured French voice conversation with the patient
- Follows a 7-step flow: greeting → consent → chief complaint → clinical questions → clinical delegation → DataGouv delegation → factual summary → confirmation → close
- Asks one question at a time
- Calm, reassuring, professional French tone
- Calls `clinical_assessment` tool when enough clinical info is gathered
- Calls `query_health_data` tool for epidemiological enrichment
- Calls `stop_conversation` to end the session
- Compiles a triage document JSON at conversation end

### Information Boundary (Critical)
- NEVER communicates CCMU levels, red flags, clinical assessments, or triage reasoning to the patient
- Patient-facing language limited to: factual recaps, reassurance, logistical next steps
- If patient asks about severity: "L'infirmier(ère) va discuter de cela avec vous."

### CCMU 5 Emergency Fast-Path
- If immediate life threat detected, skips standard flow
- Calls `clinical_assessment` immediately with partial context
- Compiles emergency triage document with CCMU 5
- Ends conversation quickly

### Interruption Handling
- Never restarts greeting after interruption
- Ignores audio echoes (mic picking up speaker output)
- Resumes from current conversation step after interruption

---

## Clinical Agent (Agent 1)

**Model**: Mistral Large (`mistral.mistral-large-3-675b-instruct`) via Bedrock
**Prompt file**: `backend/agents/prompts/clinical.md`

### Key Behaviors
- Analyzes patient conversation context (does not talk to patient directly)
- Follows OPQRST framework: Onset, Provocation, Quality, Region, Severity, Timing
- Collects medical history, medications, allergies
- Screens for 8 red flag indicators:
  - `chest_pain_with_dyspnea_and_diaphoresis`
  - `sudden_neurological_deficit`
  - `signs_of_shock`
  - `severe_hemorrhage`
  - `altered_consciousness`
  - `severe_allergic_reaction_airway`
  - `thunderclap_headache`
  - `significant_mechanism_of_injury`
- Applies CCMU decision tree to suggest classification
- If `red_flags` non-empty → `is_urgent = true`
- Returns structured JSON with all required fields

---

## DataGouv Agent (Agent 2)

**Model**: Mistral Large (`mistral.mistral-large-3-675b-instruct`) via Bedrock
**Prompt file**: `backend/agents/prompts/datagouv.md`
**MCP Server**: `https://mcp.data.gouv.fr/mcp`

### Key Behaviors
- Queries data.gouv.fr datasets via MCP tools
- Search strategy: epidemic surveillance → pathology prevalence → medication safety → hospital capabilities → healthcare accessibility
- Labels all data as "contexte statistique" — never individual predictions
- Includes source dataset names and dates
- Returns structured JSON with epidemiological, medication, and facility context

---

## Conversation State Machine

```
                    ┌──────────────────┐
                    │     GREETING     │
                    │  & CONSENT       │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ CHIEF COMPLAINT  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ CLINICAL Qs      │
                    │ (one at a time)  │
                    └────────┬─────────┘
                             │
                    ┌────────┤
                    ▼        │
            ┌────────────┐   │
            │ CCMU 5?    │   │
            │ → FAST     │   │
            │   PATH     │   │
            └────────────┘   │
                             ▼
                    ┌──────────────────┐
                    │ clinical_        │
                    │ assessment tool  │
                    └────────┬──────���──┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ query_health_    │
                    │ data tool        │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ FACTUAL SUMMARY  │
                    │ & CONFIRMATION   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ TRIAGE DOC       │
                    │ COMPILATION      │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ stop_            │
                    │ conversation     │
                    └──────────────────┘
```
