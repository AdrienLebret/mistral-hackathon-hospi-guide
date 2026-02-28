# 🏥 Triastral — AI-Powered Emergency Triage Assistant

> **Hackathon Project** — Mistral AI × AWS × ElevenLabs × Data.gouv MCP

Triastral is an AI-driven voice kiosk that streamlines emergency room intake. Patients speak to a voice agent powered by **Amazon Nova Sonic 2**, and within minutes a structured triage document with a **CCMU classification** recommendation is generated for the coordinating nurse.

---

## 🎯 Problem

Emergency departments across France face chronic overcrowding. The intake bottleneck wastes time for patients and nurses alike. Patients repeat the same information multiple times, nurses lack a consolidated pre-assessment, and triage decisions are made under pressure without structured support.

## 💡 Solution

A voice-first AI kiosk that:

1. **Collects** patient clinical data via real-time voice conversation (Nova Sonic 2 bidirectional audio)
2. **Analyzes** symptoms through a clinical pre-assessment agent (Mistral Large via Bedrock, OPQRST framework)
3. **Enriches** the case with public health data (MCP Data.gouv — epidemiology, medication interactions, facility capabilities)
4. **Generates** a structured triage document with a recommended CCMU classification
5. **Presents** the coordinating nurse with a complete patient file for informed triage decisions

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     VOICE CONVERSATION                          │
│                                                                 │
│  Microphone ◄──────► BidiAgent (Nova Sonic 2) ──────► Speaker  │
│                           │                                     │
│                     ┌─────┼─────┐                               │
│                     │           │                               │
│              clinical_assessment  query_health_data              │
│              (Mistral Large)      (Mistral Large + MCP)         │
│                                        │                        │
│                                   data.gouv.fr                  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Triage Document     │
              │   (JSON, nurse-only)  │
              │   CCMU recommendation │
              └───────────────────────┘
```

### Models Used

| Step | Model | Purpose |
|------|-------|---------|
| Voice conversation | Amazon Nova Sonic 2 | Real-time speech-to-speech with tool calling |
| Clinical assessment | Mistral Large (Bedrock) | OPQRST analysis, red flags, CCMU suggestion |
| DataGouv enrichment | Mistral Large (Bedrock) | MCP queries to data.gouv.fr |

---

## 🧩 Agent System

Triastral uses the **"Agents as Tools"** pattern from [Strands Agents SDK](https://strandsagents.com).

### Orchestrator (`backend/main.py`)
- `BidiAgent` with Nova Sonic 2 for real-time French voice conversation
- Drives the intake flow: greeting → consent → symptoms → clinical delegation → data enrichment → summary → triage document
- Tools: `clinical_assessment`, `query_health_data`, `stop_conversation`
- Never reveals CCMU levels, red flags, or clinical assessments to the patient

### Agent 1 — Clinical Pre-Assessment (`backend/agents/clinical_agent.py`)
- `@tool` wrapping a `strands.Agent` with Mistral Large
- OPQRST framework for structured symptom assessment
- Red flag screening (chest pain + dyspnea, neurological deficit, shock, hemorrhage, etc.)
- Returns JSON with CCMU suggestion and urgency flag

### Agent 2 — DataGouv Health Data (`backend/agents/datagouv_tool.py`)
- `@tool` wrapping a `strands.Agent` with Mistral Large + MCP
- Queries data.gouv.fr for epidemiological context, medication interactions, facility capabilities
- Returns enrichment JSON for the triage document

---

## 📋 CCMU Classification

| Level | Description | Priority |
|-------|-------------|----------|
| **CCMU 1** | Stable, no action needed | Low |
| **CCMU 2** | Stable, requires diagnostic/therapeutic decision | Medium |
| **CCMU 3** | Unstable, no life threat | High |
| **CCMU 4** | Life-threatening prognosis | Critical |
| **CCMU 5** | Immediate life threat | Emergency |
| **CCMU P** | Psychiatric emergency | Specialized |
| **CCMU D** | Deceased on arrival | Protocol |

Classification logic is implemented in `backend/triage.py` and enforced in the orchestrator prompt.

---

## 📁 Project Structure

```
triastral/
├── backend/
│   ├── main.py                    # Entry point — BidiAgent voice orchestrator
│   ├── triage.py                  # CCMU classification + triage document compilation
│   ├── requirements.txt           # Python dependencies
│   ├── agents/
│   │   ├── clinical_agent.py      # Agent 1 — Clinical pre-assessment (@tool)
│   │   ├── datagouv_tool.py       # Agent 2 — DataGouv MCP enrichment (@tool)
│   │   └── prompts/
│   │       ├── orchestrator.md    # Orchestrator system prompt (French)
│   │       ├── clinical.md        # Clinical Agent system prompt (French)
│   │       └── datagouv.md        # DataGouv Agent system prompt
│   ├── output/                    # Triage document JSON files (runtime)
│   ├── api/                       # FastAPI routes (planned)
│   └── persistence/               # Database layer (planned)
├── docs/
│   ├── ARCHITECTURE.md            # Detailed architecture document
│   ├── AGENT_PROMPTS.md           # Agent system prompts reference
│   ├── DATA_MODEL.md              # DynamoDB table schemas
│   └── CCMU_REFERENCE.md          # CCMU classification reference
└── frontend/                      # React apps (planned)
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.x
- AWS credentials configured with Bedrock access (Nova Sonic 2 + Mistral Large)
- PortAudio (`brew install portaudio` on macOS)
- Headphones recommended (to avoid mic feedback loops)

### Install & Run

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
pip install pyaudio

# Run the voice orchestrator
python backend/main.py
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NOVA_SONIC_MODEL_ID` | `amazon.nova-2-sonic-v1:0` | Nova Sonic model |
| `NOVA_SONIC_VOICE_ID` | `tiffany` | Voice for speech synthesis |
| `AWS_REGION` | `us-east-1` | AWS region for Bedrock |
| `BEDROCK_MODEL_ID` | `mistral.mistral-large-3-675b-instruct` | Model for sub-agents |
| `DATAGOUV_MCP_URL` | `https://mcp.data.gouv.fr/mcp` | MCP Data.gouv endpoint |

---

## 🎬 Demo Flow

1. Run `python backend/main.py` — the orchestrator connects to Nova Sonic 2
2. The agent greets you in French: *"Bonjour, je suis l'assistant d'accueil des urgences..."*
3. Describe symptoms in French (e.g., chest pain, headache, injury)
4. The agent asks follow-up questions one at a time
5. Behind the scenes: `clinical_assessment` and `query_health_data` tools are called
6. The agent gives a factual summary (no clinical info revealed to patient)
7. A triage document JSON is compiled for the nurse dashboard

### Test Scenario
> "Bonjour, j'ai une douleur dans la poitrine depuis ce matin, ça serre et ça irradie vers le bras gauche. Je suis essoufflé et en sueur. J'ai de l'hypertension et du diabète de type 2. Je prends de la Metformine et de l'Amlodipine."

---

## 🔐 Information Boundary

The system enforces a strict separation between patient-facing and nurse-facing information:

- **Patient hears**: Factual recaps of what they said, reassurance, logistical next steps
- **Patient never hears**: CCMU levels, red flags, clinical assessments, triage reasoning
- **Nurse receives**: Full triage document with CCMU recommendation, clinical assessment, DataGouv context

---

## 📊 Triage Document Output

```json
{
  "patient_chief_complaint": "Douleur thoracique oppressante depuis ce matin",
  "clinical_assessment": {
    "opqrst": { "onset": "Ce matin", "severity": 7, "..." : "..." },
    "red_flags": ["chest_pain_with_dyspnea_and_diaphoresis"],
    "medical_history": ["hypertension", "diabete_type_2"],
    "medications": ["metformine_1000mg", "amlodipine_5mg"],
    "allergies": []
  },
  "datagouv_context": { "summary": "Contexte cardiovasculaire à risque élevé" },
  "recommended_ccmu": "4",
  "ccmu_reasoning": "Douleur thoracique avec irradiation et facteurs de risque",
  "timestamp": "2026-02-28T14:32:00Z"
}
```

---

## ✅ What's Implemented

- ✅ Voice orchestrator — BidiAgent with Nova Sonic 2
- ✅ Clinical pre-assessment agent — OPQRST + red flags + CCMU suggestion
- ✅ DataGouv health data enrichment — MCP integration
- ✅ CCMU classification logic
- ✅ French system prompts (orchestrator + clinical)
- ✅ Structured logging for tool calls

## 🔲 Planned

- Nurse dashboard (React)
- Patient kiosk UI (React)
- Administrative data collection agent
- DynamoDB persistence
- FastAPI API layer
- QR code + patient queue tracking

---

## 👥 Team

Built during the **Mistral AI Hackathon** (28-29/03/2026)
- Thomas Guillemard
- Adrien Lebret

---

## 📄 License

MIT
