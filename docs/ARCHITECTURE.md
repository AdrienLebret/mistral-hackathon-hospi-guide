# Architecture Document — HospiGuide

## 1. System Overview

HospiGuide is a multi-agent AI system designed to accelerate emergency department intake and support triage decision-making. The system operates across two user interfaces (patient kiosk and nurse dashboard) connected to an AWS-hosted backend that orchestrates multiple AI agents.

### Design Principles
- **Voice-first**: The patient interacts primarily through speech, reducing friction
- **Data separation**: Clinical and administrative data live in isolated stores
- **Agent specialization**: Each agent has a single responsibility, orchestrated by a supervisor
- **Real-time**: The nurse dashboard updates in real-time as new patients complete intake
- **Decision support, not replacement**: The system recommends a CCMU level; the nurse always has final authority

---

## 2. Patient Journey (Pathway 1)

```
Patient Arrives
       │
       ▼
┌──────────────────┐
│  Welcome Screen  │  Touch "Start" to begin
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│              VOICE CONVERSATION (3-5 minutes)            │
│                                                           │
│  ElevenLabs Agent ◄─────► Orchestrator Agent (AO)        │
│       ▲                          │                        │
│       │                    ┌─────┼─────┐                  │
│  Voxtral STT               │     │     │                  │
│  (transcription)        Agent1 Agent2 Agent3              │
│                         Diag   Data   Admin               │
└──────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  QR Code Screen  │  Patient photographs QR → joins waiting room
└──────────────────┘
         │
         ▼
┌──────────────────┐
│  Waiting Room    │  Patient checks queue position via QR link
└──────────────────┘
         │
         ▼
┌──────────────────┐
│  Nurse calls     │  Patient proceeds to triage zone
│  patient         │
└──────────────────┘
```

---

## 3. Agent Architecture (Detail)

### 3.1 Orchestrator Agent (AO)

**Runtime**: Amazon Bedrock AgentCore  
**Model**: Mistral Large (via Bedrock)  
**Role**: Conversation manager and agent coordinator

**Responsibilities**:
1. Drive the intake conversation through a structured flow:
   - Greeting & consent
   - Chief complaint identification
   - Symptom deep-dive (delegated to Agent 1)
   - Administrative data collection (delegated to Agent 3)
   - DataGouv enrichment (delegated to Agent 2)
2. Compile all sub-agent outputs into a unified **Patient Triage Document**
3. Apply CCMU classification logic based on the aggregated data
4. Push the final document to the database + nurse dashboard
5. Trigger QR code generation for the patient

**Conversation Flow Logic**:
```
START → Greeting
  → Ask chief complaint (free-form)
  → DELEGATE to Agent 1 (clinical questions based on complaint)
  → DELEGATE to Agent 3 (admin data: name, DOB, insurance, meds, allergies)
  → DELEGATE to Agent 2 (background enrichment — async, non-blocking)
  → Summarize & confirm with patient
  → Generate triage document
  → Generate QR code
→ END
```

### 3.2 Agent 1 — Pre-Nurse Diagnostic

**Model**: Mistral Large  
**Role**: Clinical pre-assessment specialist

**Behavior**:
- Follows a symptom-driven interview protocol
- Adapts questions based on the chief complaint
- Covers: onset, duration, severity (0-10), location, character, aggravating/alleviating factors, associated symptoms
- Asks about: medical history, surgical history, current medications, allergies
- Flags emergency red flags (chest pain + dyspnea, neurological deficits, etc.)

**Output** (structured JSON):
```json
{
  "chief_complaint": "Severe chest pain",
  "symptom_assessment": {
    "onset": "2 hours ago",
    "severity": 8,
    "character": "Crushing, pressure-like",
    "location": "Central chest, radiating to left arm",
    "associated_symptoms": ["Shortness of breath", "Nausea", "Diaphoresis"],
    "aggravating_factors": ["Exertion"],
    "alleviating_factors": ["Rest (partial)"]
  },
  "medical_history": ["Hypertension", "Type 2 Diabetes"],
  "current_medications": ["Metformin 500mg", "Amlodipine 5mg"],
  "allergies": ["Penicillin"],
  "red_flags": ["Chest pain with radiation", "Diaphoresis", "Cardiovascular risk factors"],
  "preliminary_assessment": "Presentation concerning for acute coronary syndrome. Recommend immediate evaluation.",
  "suggested_ccmu": "CCMU 4"
}
```

### 3.3 Agent 2 — DataGouv Health Data Tool

**Model**: Mistral Medium (lighter, tool-focused)  
**Role**: Public health data enrichment  
**Tools**: MCP Data.gouv connector

**Behavior**:
- Receives the patient's clinical context from AO
- Queries relevant Data.gouv datasets via MCP:
  - Pathology prevalence in the patient's department
  - Known comorbidity patterns for identified conditions
  - Medication interactions (BDPM database)
  - Local facility capabilities (FINESS)
- Returns a contextual enrichment report

**MCP Tool Calls**:
```python
# Example MCP queries
mcp.query("pathologies_prevalence", {
    "department": "75",  # Paris
    "pathology_group": "cardiovascular",
    "age_range": "50-65"
})

mcp.query("comorbidity_associations", {
    "primary_condition": "hypertension",
    "secondary_conditions": ["diabetes_type2"]
})

mcp.query("bdpm_interactions", {
    "medications": ["metformin", "amlodipine"]
})
```

**Output** (structured JSON):
```json
{
  "prevalence_context": "Cardiovascular pathologies affect 12.3% of the 50-65 age group in department 75",
  "comorbidity_flags": "Hypertension + Type 2 Diabetes strongly associated with cardiovascular events (OR: 2.4)",
  "medication_notes": "No major interactions between Metformin and Amlodipine",
  "facility_note": "Current facility equipped for cardiac emergencies (FINESS category: CHU)",
  "data_sources": ["cnam_pathologies_2024", "bdpm_v3", "finess_2024"]
}
```

> **Note**: DataGouv data is macro-level (population statistics). Its value is contextual enrichment, not individual diagnosis. The agent must clearly label this as statistical context.

### 3.4 Agent 3 — Administrative File Builder

**Model**: Mistral Medium  
**Role**: Administrative data collector

**Behavior**:
- Collects structured administrative information through conversation:
  - Full name, date of birth, gender
  - Address, phone number
  - Insurance info (Carte Vitale number, mutuelle)
  - Emergency contact
  - Attending physician (médecin traitant)
- Validates completeness and flags missing fields
- Stores data in the Admin DynamoDB table

**Output** (structured JSON):
```json
{
  "patient_id": "PAT-20260228-001",
  "full_name": "Jean Dupont",
  "date_of_birth": "1972-05-14",
  "gender": "M",
  "address": "42 Rue de la Santé, 75013 Paris",
  "phone": "+33612345678",
  "insurance": {
    "carte_vitale": "1720575XXXXX",
    "mutuelle": "MGEN",
    "mutuelle_number": "XXXXX"
  },
  "emergency_contact": {
    "name": "Marie Dupont",
    "relation": "Spouse",
    "phone": "+33698765432"
  },
  "attending_physician": "Dr. Martin, Cabinet Médical Mouffetard",
  "data_complete": true,
  "missing_fields": []
}
```

---

## 4. Patient Triage Document (AO Output)

The final document generated by the Orchestrator Agent:

```
╔══════════════════════════════════════════════════════════╗
║           PATIENT TRIAGE DOCUMENT — HospiGuide           ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Patient: Jean Dupont (M, 53 yo)                        ║
║  Session: PAT-20260228-001                              ║
║  Arrival: 2026-02-28 14:32                              ║
║                                                          ║
║  ┌─────────────────────────────────────────────────┐    ║
║  │  RECOMMENDED CCMU: ████ CCMU 4 — CRITICAL ████ │    ║
║  │  Life-threatening prognosis engaged              │    ║
║  └─────────────────────────────────────────────────┘    ║
║                                                          ║
║  CHIEF COMPLAINT                                         ║
║  Severe crushing chest pain (8/10) for 2 hours,         ║
║  radiating to left arm, with dyspnea and nausea.        ║
║                                                          ║
║  CLINICAL PRE-ASSESSMENT (Agent 1)                      ║
║  • Onset: 2h ago during physical exertion               ║
║  • Red flags: chest pain + radiation + diaphoresis      ║
║  • Hx: HTN, T2DM — significant cardiovascular risk     ║
║  • Current meds: Metformin 500mg, Amlodipine 5mg       ║
║  • Allergy: Penicillin                                  ║
║  • Assessment: Concerning for acute coronary syndrome   ║
║                                                          ║
║  HEALTH DATA CONTEXT (Agent 2 — Data.gouv)              ║
║  • CV pathology prevalence 50-65yo in dept 75: 12.3%   ║
║  • HTN+T2DM comorbidity: OR 2.4 for CV events          ║
║  • No medication interactions flagged                    ║
║  • Facility equipped for cardiac emergencies            ║
║                                                          ║
║  ADMINISTRATIVE (Agent 3)                                ║
║  • Insurance: Carte Vitale ✓ | Mutuelle: MGEN ✓        ║
║  • Emergency contact: Marie Dupont (spouse)             ║
║  • Médecin traitant: Dr. Martin                         ║
║                                                          ║
║  PATIENT TRANSCRIPT SUMMARY                              ║
║  [Condensed transcript of the voice conversation]        ║
║                                                          ║
║  AO RECOMMENDATION                                      ║
║  "Patient presents with classic ACS symptoms on a       ║
║  background of significant cardiovascular risk factors.  ║
║  Recommend immediate cardiac evaluation. CCMU 4."       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

## 5. AWS Infrastructure

### 5.1 Compute & API

| Service | Use |
|---------|-----|
| **Amazon Bedrock AgentCore** | Host and orchestrate all 4 agents (AO + 3 sub-agents) |
| **AWS Lambda** | Session management, QR generation, document compilation, queue management |
| **API Gateway (REST)** | Patient kiosk API, nurse dashboard API |
| **API Gateway (WebSocket)** | Real-time nurse dashboard updates |

### 5.2 Storage

| Service | Use |
|---------|-----|
| **DynamoDB — Admin Table** | Administrative patient data |
| **DynamoDB — Clinical Table** | Clinical data (KMS encrypted, restricted access) |
| **DynamoDB — Queue Table** | Patient queue state, positions, statuses |
| **S3** | Triage document storage (PDF exports), session transcripts |

### 5.3 Security

| Service | Use |
|---------|-----|
| **AWS KMS** | Encryption keys for clinical data |
| **IAM Policies** | Strict separation between admin and clinical data access |
| **Cognito** | Nurse dashboard authentication |

### 5.4 Frontend Hosting

| Service | Use |
|---------|-----|
| **AWS Amplify** or **S3 + CloudFront** | Host both React apps |

### 5.5 Infrastructure Diagram (AWS)

```
                    ┌─────────────┐
                    │  CloudFront │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼                          ▼
     ┌─────────────┐           ┌─────────────┐
     │  S3 Bucket  │           │  S3 Bucket  │
     │  Patient    │           │  Nurse      │
     │  Kiosk App  │           │  Dashboard  │
     └─────────────┘           └─────────────┘
              │                          │
              └────────────┬─────────────┘
                           ▼
                  ┌─────────────────┐
                  │  API Gateway    │
                  │  REST + WSS     │
                  └────────┬────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                 ▼
   ┌────────────┐  ┌────────────┐   ┌────────────┐
   │  Lambda:   │  │  Lambda:   │   │  Lambda:   │
   │  Session   │  │  QR Code   │   │  Queue     │
   │  Manager   │  │  Generator │   │  Manager   │
   └──────┬─────┘  └────────────┘   └──────┬─────┘
          │                                 │
          ▼                                 ▼
   ┌─────────────────────────────────────────────┐
   │          Amazon Bedrock AgentCore            │
   │                                              │
   │   AO ──► Agent 1 (Diag)                     │
   │      ──► Agent 2 (DataGouv) ──► MCP Server  │
   │      ──► Agent 3 (Admin)                     │
   └───────────────────┬─────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼             ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ DynamoDB │ │ DynamoDB │ │ DynamoDB │
   │ Admin    │ │ Clinical │ │ Queue    │
   │ Table    │ │ Table    │ │ Table    │
   │          │ │ (KMS)    │ │          │
   └──────────┘ └──────────┘ └──────────┘
```

---

## 6. Frontend Specifications

### 6.1 Patient Kiosk

**Screen Flow**:
1. **Welcome Screen** — Hospital branding, "Tap to begin" button, language selector (FR/EN)
2. **Voice Conversation Screen** — Animated waveform, live transcript, "I'm listening..." indicator
3. **Summary Screen** — Brief recap of collected info, "Confirm" button
4. **QR Code Screen** — Large QR code, estimated wait time, "You are #X in queue"

**Key UX Requirements**:
- Large touch targets (kiosk context)
- High contrast, accessible design
- Clear audio feedback
- Simple, calming visuals (reduce patient anxiety)
- Auto-timeout after inactivity

### 6.2 Nurse Dashboard

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  HospiGuide — Nurse Dashboard           [Nurse Name] │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────┐  ┌────────────────────────┐ │
│  │   PATIENT QUEUE     │  │   PATIENT DETAIL       │ │
│  │                     │  │                         │ │
│  │  🔴 CCMU 4 — Dupont │  │  Full triage document  │ │
│  │  14:32 | Chest pain │  │  for selected patient   │ │
│  │  [CALL PATIENT]     │  │                         │ │
│  │                     │  │  - Clinical assessment  │ │
│  │  🟠 CCMU 3 — Martin │  │  - DataGouv context     │ │
│  │  14:28 | Abdominal  │  │  - Admin data           │ │
│  │                     │  │  - Transcript summary   │ │
│  │  🟡 CCMU 2 — Leroy  │  │  - AO recommendation   │ │
│  │  14:15 | Knee injury│  │                         │ │
│  │                     │  │  [VALIDATE CCMU]        │ │
│  │  🟢 CCMU 1 — Petit  │  │  [OVERRIDE CCMU]       │ │
│  │  14:02 | Follow-up  │  │  [CALL PATIENT]         │ │
│  │                     │  │                         │ │
│  └─────────────────────┘  └────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Key Features**:
- Auto-sorted by CCMU severity (highest first), then by arrival time
- Color-coded severity badges (🔴 red = CCMU 4-5, 🟠 orange = CCMU 3, 🟡 yellow = CCMU 2, 🟢 green = CCMU 1)
- Real-time new patient notifications
- Click to expand full triage document
- "Call Patient" button updates patient's QR code page
- Nurse can validate or override AI-suggested CCMU level

---

## 7. ElevenLabs Integration

### Voice Agent Configuration

The patient kiosk uses ElevenLabs Conversational AI to create a natural voice interaction:

```javascript
// ElevenLabs agent configuration
const agentConfig = {
  agent_id: "hospi-guide-intake",
  voice: {
    voice_id: "professional_french_female",  // Warm, reassuring voice
    model: "eleven_turbo_v2",
    stability: 0.7,
    similarity_boost: 0.8
  },
  conversation: {
    first_message: "Bonjour et bienvenue aux urgences. Je suis là pour recueillir quelques informations avant votre prise en charge. Pouvez-vous me dire ce qui vous amène aujourd'hui ?",
    language: "fr"
  }
};
```

### Voice ↔ Agent Pipeline

```
Patient speaks
    │
    ▼
ElevenLabs captures audio
    │
    ▼
Voxtral (Mistral STT) transcribes
    │
    ▼
Transcript sent to AO (Bedrock AgentCore)
    │
    ▼
AO generates response text
    │
    ▼
ElevenLabs TTS speaks the response
    │
    ▼
Patient hears and responds
    │
    (loop until conversation complete)
```

---

## 8. Data Models

### 8.1 Admin Table (DynamoDB)

```
Table: hospi-guide-admin
Partition Key: patient_id (String)
Sort Key: session_timestamp (String)

Attributes:
- full_name (String)
- date_of_birth (String)
- gender (String)
- address (String)
- phone (String)
- insurance_type (String)
- insurance_number (String)
- mutuelle (String)
- emergency_contact_name (String)
- emergency_contact_phone (String)
- attending_physician (String)
- created_at (String - ISO 8601)
```

### 8.2 Clinical Table (DynamoDB — KMS Encrypted)

```
Table: hospi-guide-clinical
Partition Key: patient_id (String)
Sort Key: session_timestamp (String)

Attributes:
- chief_complaint (String)
- symptom_assessment (Map)
- medical_history (List<String>)
- surgical_history (List<String>)
- current_medications (List<String>)
- allergies (List<String>)
- red_flags (List<String>)
- preliminary_assessment (String)
- datagouv_context (Map)
- suggested_ccmu (String)
- final_ccmu (String - set by nurse)
- triage_document (String - full document JSON)
- transcript_summary (String)
- created_at (String - ISO 8601)
```

### 8.3 Queue Table (DynamoDB)

```
Table: hospi-guide-queue
Partition Key: facility_id (String)
Sort Key: patient_id (String)

Attributes:
- queue_position (Number)
- ccmu_level (String)
- status (String: "waiting" | "called" | "in_triage" | "completed")
- arrival_time (String - ISO 8601)
- called_time (String - ISO 8601, nullable)
- qr_code_url (String)
- created_at (String - ISO 8601)

GSI: facility_id-status-index
  Partition Key: facility_id
  Sort Key: status
```

---

## 9. API Endpoints

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/sessions` | Create new patient session |
| `GET` | `/sessions/{id}` | Get session details |
| `POST` | `/sessions/{id}/complete` | Mark session as complete, trigger doc generation |
| `GET` | `/sessions/{id}/qr` | Get QR code for patient |
| `GET` | `/queue/{facility_id}` | Get current queue for a facility |
| `POST` | `/queue/{facility_id}/call/{patient_id}` | Call a patient to triage |
| `GET` | `/triage/{patient_id}` | Get full triage document |
| `PUT` | `/triage/{patient_id}/ccmu` | Nurse overrides CCMU level |

### WebSocket API

| Route | Direction | Description |
|-------|-----------|-------------|
| `$connect` | Client → Server | Nurse dashboard connects |
| `queue_update` | Server → Client | New patient added or status changed |
| `patient_called` | Server → Client | Patient has been called |

---

## 10. Security Considerations

1. **Data Encryption**: Clinical table uses AWS KMS customer-managed key
2. **IAM Isolation**: Separate IAM roles for admin vs. clinical data access
3. **No PII in Logs**: Lambda functions strip PII before logging
4. **Session Expiry**: Patient sessions auto-expire after 24 hours
5. **Nurse Auth**: Cognito user pool with hospital-issued credentials
6. **GDPR Compliance**: Patient data deletion API, consent recorded at session start
7. **No data persistence beyond session**: For the MVP, clinical data is session-scoped

---

## 11. Hackathon Priorities & Tradeoffs

### Must-Have (MVP)
- ✅ Voice conversation with patient via ElevenLabs + Voxtral
- ✅ At least 1 working agent (Agent 1 — Pre-Nurse Diagnostic)
- ✅ CCMU classification output
- ✅ Patient kiosk UI (voice + QR code)
- ✅ Nurse dashboard with patient queue
- ✅ End-to-end demo flow

### Should-Have
- Agent 2 (DataGouv) with at least 1 working MCP query
- Agent 3 (Administrative) with structured data collection
- Real-time WebSocket updates on nurse dashboard
- QR code → patient queue tracking page

### Nice-to-Have
- Multiple DataGouv dataset integrations
- PDF export of triage document
- Multi-language support
- Analytics on queue performance
