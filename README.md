# 🏥 Triastral — AI-Powered Emergency Triage Assistant

> **Hackathon Project** — Mistral AI × AWS × ElevenLabs × Data.gouv MCP

Triastral is an AI-driven kiosk system that streamlines the emergency room intake process. Patients interact with a voice agent at a self-service kiosk, and within minutes, a complete triage-ready patient file is generated for the coordinating nurse — eliminating repetitive questioning, reducing wait times, and supporting clinical decision-making through the **CCMU classification** (Classification Clinique des Malades aux Urgences).

---

## 🎯 Problem

Emergency departments across France face chronic overcrowding. The intake bottleneck at the front desk wastes time for patients and nurses alike. Patients repeat the same information multiple times, nurses lack a consolidated pre-assessment, and triage decisions are made under pressure without structured support.

## 💡 Solution

A voice-first AI kiosk that:

1. **Collects** patient administrative and clinical data via natural conversation (ElevenLabs voice agent + Voxtral transcription)
2. **Analyzes** symptoms through a pre-nurse diagnostic agent (Mistral AI)
3. **Enriches** the case with public health data (MCP Data.gouv)
4. **Generates** a structured triage document with a recommended CCMU classification
5. **Provides** the patient with a QR code for real-time queue tracking
6. **Presents** the coordinating nurse with a dashboard of all waiting patients, prioritized by severity

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PATIENT KIOSK                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  React Web   │◄──►│  ElevenLabs  │◄──►│  Voxtral (STT)   │  │
│  │  Frontend    │    │  Voice Agent │    │  Transcription    │  │
│  └──────┬───────┘    └──────────────┘    └──────────────────┘  │
└─────────┼──────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI + Strands)                   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ORCHESTRATOR AGENT (AO)                      │  │
│  │         Strands Agents SDK + Mistral Large                │  │
│  │                                                           │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │  │
│  │  │  Agent 1   │  │  Agent 2   │  │    Agent 3         │ │  │
│  │  │ Pre-Nurse  │  │ DataGouv   │  │  Administrative    │ │  │
│  │  │ Diagnostic │  │ Health     │  │  File Builder      │ │  │
│  │  │  (@tool)   │  │ Data(@tool)│  │    (@tool)         │ │  │
│  │  └────────────┘  └─────┬──────┘  └────────────────────┘ │  │
│  └────────────────────────┼─────────────────────────────────┘  │
│                           │                                     │
│  ┌────────────────┐  ┌────┴───────┐  ┌────────────────────┐   │
│  │  DynamoDB      │  │  MCP       │  │  DynamoDB          │   │
│  │  Admin Data    │  │  Data.gouv │  │  Clinical Data     │   │
│  │  (standard)    │  │  (MCPClient│  │  (encrypted)       │   │
│  └────────────────┘  └────────────┘  └────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   FastAPI endpoints → QR Code Gen + Queue Management     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   NURSE DASHBOARD                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React Web App — Real-time patient queue, CCMU triage    │  │
│  │  cards, patient documents, call-next-patient controls     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Agent System Design

Triastral uses the **"Agents as Tools"** pattern from [Strands Agents SDK](https://strandsagents.com). Each specialized agent is a `@tool`-decorated function wrapping a Strands `Agent`, and the Orchestrator calls them as needed.

### Orchestrator Agent (AO)
The central agent that manages the patient intake conversation and delegates to sub-agents. It:
- Drives the conversation flow via ElevenLabs voice
- Delegates to the 3 specialized sub-agents (as `@tool` functions)
- Compiles all outputs into a unified **Patient Triage Document**
- Suggests a CCMU classification (1–5) with reasoning
- Sends the document to the nurse dashboard

### Agent 1 — Pre-Nurse Diagnostic
- Conducts a structured clinical interview following triage best practices
- Identifies chief complaint, symptom onset, severity, medical history
- Flags red flags and vital sign concerns
- Outputs a preliminary clinical assessment

### Agent 2 — DataGouv Health Data Tool
- Connects to the **MCP Data.gouv** server via Strands `MCPClient`
- Cross-references patient context with:
  - Pathology prevalence data (Cnam)
  - Comorbidity associations
  - Local epidemiological context
- Enriches the assessment with statistical context

### Agent 3 — Administrative File Builder
- Collects: identity, insurance (Carte Vitale), emergency contacts, allergies, current medications
- Validates data completeness
- Outputs a clean administrative record

---

## 📋 CCMU Classification (Triage Standard)

The system outputs a recommended classification following the **CCMU** scale used across French hospitals:

| Level | Description | Priority |
|-------|-------------|----------|
| **CCMU 1** | Stable condition, no diagnostic or therapeutic action needed | Low |
| **CCMU 2** | Stable condition, requires diagnostic or therapeutic decision | Medium |
| **CCMU 3** | Unstable condition, no life-threatening risk | High |
| **CCMU 4** | Life-threatening prognosis engaged | Critical |
| **CCMU 5** | Immediate life-threatening risk | Emergency |
| **CCMU P** | Psychiatric emergency | Specialized |
| **CCMU D** | Patient deceased on arrival | — |

---

## 🛠️ Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Voice I/O** | ElevenLabs Conversational AI | Real-time voice interaction with the patient |
| **Speech-to-Text** | Voxtral (Mistral) | Transcription of patient speech |
| **LLM Backbone** | Mistral Large / Mistral Medium | Agent reasoning, diagnostic logic, document generation |
| **Agent Orchestration** | Strands Agents SDK (Python) | Multi-agent orchestration via "Agents as Tools" pattern |
| **Model Provider** | Mistral AI API (`MistralModel`) | Direct Mistral API access — no Bedrock dependency |
| **Health Data** | MCP Data.gouv (via Strands `MCPClient`) | Public health datasets (pathologies, epidemiology, FINESS) |
| **Database (Admin)** | Amazon DynamoDB | Patient administrative data |
| **Database (Clinical)** | Amazon DynamoDB (encrypted) | Patient clinical data (separate, encrypted at rest) |
| **API Layer** | FastAPI | REST API + WebSocket for frontend-backend communication |
| **Real-time Updates** | FastAPI WebSocket | Live updates to nurse dashboard |
| **QR Code** | Python `qrcode` library | Generate patient tracking QR code |
| **Frontend (Patient)** | React (Vite) | Kiosk interface for patient interaction |
| **Frontend (Nurse)** | React (Vite) | Triage dashboard for coordinating nurse |
| **Hosting** | AWS Amplify / S3 + CloudFront | Frontend deployment |

---

## 📁 Project Structure

```
triastral/
├── README.md                          # This file
├── docs/
│   ├── ARCHITECTURE.md                # Detailed architecture document
│   ├── AGENT_PROMPTS.md               # Agent system prompts & behavior
│   ├── DATA_MODEL.md                  # Database schemas
│   └── CCMU_REFERENCE.md             # CCMU classification reference
├── frontend/
│   ├── patient-kiosk/                 # Patient-facing kiosk React app
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── VoiceKiosk.jsx     # Main voice interaction screen
│   │   │   │   ├── WelcomeScreen.jsx  # Landing/start screen
│   │   │   │   ├── QRCodeScreen.jsx   # End-of-session QR display
│   │   │   │   └── ConversationView.jsx # Live transcript display
│   │   │   ├── hooks/
│   │   │   │   ├── useElevenLabs.js   # ElevenLabs voice hook
│   │   │   │   └── usePatientSession.js
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── package.json
│   │   └── vite.config.js
│   └── nurse-dashboard/               # Nurse-facing triage dashboard
│       ├── src/
│       │   ├── components/
│       │   │   ├── PatientQueue.jsx    # Priority queue view
│       │   │   ├── PatientCard.jsx     # Individual patient summary
│       │   │   ├── TriageDocument.jsx  # Full patient triage document
│       │   │   ├── CCMUBadge.jsx       # CCMU level indicator
│       │   │   └── CallPatient.jsx     # Call-next-patient action
│       │   ├── hooks/
│       │   │   ├── usePatientQueue.js  # Real-time queue subscription
│       │   │   └── useWebSocket.js
│       │   ├── App.jsx
│       │   └── main.jsx
│       ├── package.json
│       └── vite.config.js
├── backend/
│   ├── agents/
│   │   ├── orchestrator.py            # AO — Strands Agent + @tool sub-agents
│   │   ├── pre_nurse.py               # Agent 1 — clinical pre-assessment (@tool)
│   │   ├── datagouv_tool.py           # Agent 2 — MCP Data.gouv connector (@tool)
│   │   ├── admin_agent.py             # Agent 3 — administrative data (@tool)
│   │   └── prompts/
│   │       ├── orchestrator.md        # AO system prompt
│   │       ├── pre_nurse.md           # Agent 1 system prompt
│   │       ├── datagouv.md            # Agent 2 system prompt
│   │       └── admin.md              # Agent 3 system prompt
│   ├── api/
│   │   ├── main.py                    # FastAPI app entry point
│   │   ├── routes/
│   │   │   ├── sessions.py            # Session management endpoints
│   │   │   ├── queue.py               # Queue management endpoints
│   │   │   ├── triage.py              # Triage document endpoints
│   │   │   └── websocket.py           # WebSocket for nurse dashboard
│   │   └── services/
│   │       ├── session_service.py     # Session business logic
│   │       ├── queue_service.py       # Queue business logic
│   │       └── qr_service.py         # QR code generation
│   ├── db/
│   │   └── dynamodb.py                # DynamoDB client & table access
│   ├── requirements.txt
│   └── .env.example
└── .github/
    └── workflows/
        └── deploy.yml                 # CI/CD pipeline
```

---

## 🚀 Hackathon Execution Plan

### Phase 1 — Foundation (Hours 0–3)
- [ ] Scaffold React apps (patient kiosk + nurse dashboard)
- [ ] Set up AWS infrastructure (DynamoDB tables)
- [ ] Configure ElevenLabs Conversational AI agent
- [ ] Set up Voxtral transcription pipeline
- [ ] Set up FastAPI backend with Strands SDK

### Phase 2 — Agent System (Hours 3–8)
- [ ] Build Orchestrator Agent (AO) with Strands "Agents as Tools"
- [ ] Implement Agent 1 (Pre-Nurse Diagnostic) as `@tool`
- [ ] Implement Agent 2 (DataGouv Tool) with `MCPClient`
- [ ] Implement Agent 3 (Administrative File Builder) as `@tool`
- [ ] Wire agent outputs into triage document format
- [ ] Implement CCMU classification logic

### Phase 3 — Integration & UX (Hours 8–14)
- [ ] Connect ElevenLabs ↔ FastAPI ↔ Strands Agent pipeline end-to-end
- [ ] Build patient kiosk UI (welcome → voice conversation → QR code)
- [ ] Build nurse dashboard (patient queue → triage cards → document view)
- [ ] Implement QR code generation + patient queue tracking
- [ ] WebSocket for real-time nurse dashboard updates

### Phase 4 — Polish & Demo (Hours 14–18)
- [ ] End-to-end testing with realistic patient scenarios
- [ ] UX polish for the "wow effect" — animations, clean design
- [ ] Prepare demo script and fallback scenarios
- [ ] Record backup demo video

---

## 🎬 Demo Flow

**Patient Side:**
1. Patient walks up to the kiosk → Welcome screen with "Start" button
2. Voice agent greets: *"Hello, welcome to the emergency department. I'm here to help gather some information before you see the nurse. Can you tell me what brings you in today?"*
3. Natural conversation: symptoms, history, administrative info
4. Session ends → QR code displayed → *"Please take a photo of this QR code. It will let you track your position in the queue."*

**Nurse Side:**
1. Dashboard shows a real-time queue of waiting patients
2. Each card shows: patient name, chief complaint, recommended CCMU level, wait time
3. Nurse clicks on a patient → full triage document with:
   - Patient transcript summary
   - Clinical pre-assessment
   - DataGouv enrichment context
   - Administrative data
   - Recommended CCMU classification with reasoning
4. Nurse validates/overrides the CCMU level → calls the patient

---

## 🔐 Data Separation

Clinical and administrative data are stored in **separate DynamoDB tables** with different access policies:

- **Admin Table**: Name, DOB, insurance, contact info — standard encryption
- **Clinical Table**: Symptoms, medical history, triage assessment — **encrypted at rest with AWS KMS**, restricted IAM policies, no cross-access

---

## 📊 MCP Data.gouv Integration

The DataGouv agent leverages the MCP connector (via Strands `MCPClient`) to query public health datasets:

| Dataset | Use Case |
|---------|----------|
| **Pathology prevalence** (Cnam) | Contextualize symptom patterns with regional prevalence |
| **Comorbidity associations** | Flag likely comorbidities based on declared conditions |
| **FINESS** (facility registry) | Verify hospital capabilities and redirect if needed |
| **BDPM** (medication database) | Cross-check declared medications for interactions |
| **APL** (medical accessibility) | Assess local healthcare resource availability |

---


## 👥 Team

Built during the **Mistral AI Hackathon** (28-29/03/2026)
- Thomas Guillemard
- Adrien Lebret

---

## 📄 License

MIT
