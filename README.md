# 🏥 Triastral — AI-Powered Emergency Triage Assistant

> **Hackathon Project** — Mistral AI × AWS × ElevenLabs × Data.gouv MCP

HospiGuide is an AI-driven kiosk system that streamlines the emergency room intake process. Patients interact with a voice agent at a self-service kiosk, and within minutes, a complete triage-ready patient file is generated for the coordinating nurse — eliminating repetitive questioning, reducing wait times, and supporting clinical decision-making through the **CCMU classification** (Classification Clinique des Malades aux Urgences).

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
│                    AWS BACKEND INFRASTRUCTURE                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ORCHESTRATOR AGENT (AO)                      │  │
│  │         Amazon Bedrock AgentCore + Mistral Large          │  │
│  │                                                           │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │  │
│  │  │  Agent 1   │  │  Agent 2   │  │    Agent 3         │ │  │
│  │  │ Pre-Nurse  │  │ DataGouv   │  │  Administrative    │ │  │
│  │  │ Diagnostic │  │ Health     │  │  File Builder      │ │  │
│  │  │            │  │ Data Tool  │  │                    │ │  │
│  │  └────────────┘  └─────┬──────┘  └────────────────────┘ │  │
│  └────────────────────────┼─────────────────────────────────┘  │
│                           │                                     │
│  ┌────────────────┐  ┌────┴───────┐  ┌────────────────────┐   │
│  │  DynamoDB      │  │  MCP       │  │  DynamoDB          │   │
│  │  Admin Data    │  │  Data.gouv │  │  Clinical Data     │   │
│  │  (standard)    │  │  Connector │  │  (encrypted)       │   │
│  └────────────────┘  └────────────┘  └────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   API Gateway + Lambda → QR Code Gen + Queue Management  │  │
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

### Orchestrator Agent (AO)
The central agent that manages the patient intake conversation and delegates to sub-agents. It:
- Drives the conversation flow via ElevenLabs voice
- Delegates to the 3 specialized sub-agents
- Compiles all outputs into a unified **Patient Triage Document**
- Suggests a CCMU classification (1–5) with reasoning
- Sends the document to the nurse dashboard

### Agent 1 — Pre-Nurse Diagnostic
- Conducts a structured clinical interview following triage best practices
- Identifies chief complaint, symptom onset, severity, medical history
- Flags red flags and vital sign concerns
- Outputs a preliminary clinical assessment

### Agent 2 — DataGouv Health Data Tool
- Connects to the **MCP Data.gouv** server for public health datasets
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
| **Agent Orchestration** | Amazon Bedrock AgentCore | Multi-agent orchestration on AWS |
| **Health Data** | MCP Data.gouv | Public health datasets (pathologies, epidemiology, FINESS) |
| **Database (Admin)** | Amazon DynamoDB | Patient administrative data |
| **Database (Clinical)** | Amazon DynamoDB (encrypted) | Patient clinical data (separate, encrypted at rest) |
| **API Layer** | AWS API Gateway + Lambda | REST API for frontend-backend communication |
| **Real-time Updates** | AWS AppSync / WebSocket API | Live updates to nurse dashboard |
| **QR Code** | Lambda function (qrcode lib) | Generate patient tracking QR code |
| **Frontend (Patient)** | React (Vite) | Kiosk interface for patient interaction |
| **Frontend (Nurse)** | React (Vite) | Triage dashboard for coordinating nurse |
| **Hosting** | AWS Amplify / S3 + CloudFront | Frontend deployment |

---

## 📁 Project Structure

```
hospi-guide/
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
│   │   ├── orchestrator/              # AO — main orchestrator agent
│   │   │   ├── agent_config.json
│   │   │   └── prompt.md
│   │   ├── pre-nurse/                 # Agent 1 — clinical pre-assessment
│   │   │   ├── agent_config.json
│   │   │   └── prompt.md
│   │   ├── datagouv-tool/             # Agent 2 — MCP Data.gouv connector
│   │   │   ├── agent_config.json
│   │   │   ├── prompt.md
│   │   │   └── mcp_tools.py
│   │   └── admin-agent/               # Agent 3 — administrative data
│   │       ├── agent_config.json
│   │       └── prompt.md
│   ├── lambdas/
│   │   ├── session_manager/           # Create/manage patient sessions
│   │   ├── qr_generator/             # Generate patient QR codes
│   │   ├── triage_document/          # Compile & store triage documents
│   │   └── queue_manager/            # Queue position & notifications
│   ├── infrastructure/
│   │   ├── template.yaml             # AWS SAM / CloudFormation template
│   │   └── bedrock_agents.yaml       # Bedrock AgentCore configuration
│   └── requirements.txt
└── .github/
    └── workflows/
        └── deploy.yml                 # CI/CD pipeline
```

---

## 🚀 Hackathon Execution Plan

### Phase 1 — Foundation (Hours 0–3)
- [ ] Scaffold React apps (patient kiosk + nurse dashboard)
- [ ] Set up AWS infrastructure (DynamoDB, API Gateway, Lambda)
- [ ] Configure ElevenLabs Conversational AI agent
- [ ] Set up Voxtral transcription pipeline
- [ ] Define DynamoDB schemas (admin + clinical tables)

### Phase 2 — Agent System (Hours 3–8)
- [ ] Build Orchestrator Agent (AO) on Bedrock AgentCore
- [ ] Implement Agent 1 (Pre-Nurse Diagnostic) with clinical interview flow
- [ ] Implement Agent 2 (DataGouv Tool) with MCP connector
- [ ] Implement Agent 3 (Administrative File Builder)
- [ ] Wire agent outputs into triage document format
- [ ] Implement CCMU classification logic

### Phase 3 — Integration & UX (Hours 8–14)
- [ ] Connect ElevenLabs ↔ Backend ↔ Agent pipeline end-to-end
- [ ] Build patient kiosk UI (welcome → voice conversation → QR code)
- [ ] Build nurse dashboard (patient queue → triage cards → document view)
- [ ] Implement QR code generation + patient queue tracking
- [ ] WebSocket/polling for real-time nurse dashboard updates

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

The DataGouv agent leverages the MCP connector to query public health datasets:

| Dataset | Use Case |
|---------|----------|
| **Pathology prevalence** (Cnam) | Contextualize symptom patterns with regional prevalence |
| **Comorbidity associations** | Flag likely comorbidities based on declared conditions |
| **FINESS** (facility registry) | Verify hospital capabilities and redirect if needed |
| **BDPM** (medication database) | Cross-check declared medications for interactions |
| **APL** (medical accessibility) | Assess local healthcare resource availability |

---

## 🏃 Quick Start

```bash
# Clone the repository
git clone https://github.com/YOUR_ORG/mistral-hackathon-hospi-guide.git
cd mistral-hackathon-hospi-guide

# Frontend — Patient Kiosk
cd frontend/patient-kiosk
npm install && npm run dev

# Frontend — Nurse Dashboard
cd ../nurse-dashboard
npm install && npm run dev

# Backend — Deploy to AWS
cd ../../backend
sam build && sam deploy --guided
```

### Environment Variables

```env
# ElevenLabs
ELEVENLABS_API_KEY=your_key
ELEVENLABS_AGENT_ID=your_agent_id

# Mistral
MISTRAL_API_KEY=your_key

# AWS
AWS_REGION=eu-west-3
DYNAMODB_ADMIN_TABLE=hospi-guide-admin
DYNAMODB_CLINICAL_TABLE=hospi-guide-clinical

# MCP Data.gouv
DATAGOUV_MCP_ENDPOINT=your_endpoint
```

---

## 👥 Team

Built during the **Mistral AI Hackathon** — Team TrueNorth

---

## 📄 License

MIT
