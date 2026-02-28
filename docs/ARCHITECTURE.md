# Architecture Document — Triastral

## 1. System Overview

Triastral is a multi-agent AI system designed to accelerate emergency department intake and support triage decision-making. The system uses a **voice-first kiosk** powered by **Amazon Nova Sonic 2** for real-time bidirectional audio streaming, orchestrated by the **Strands Agents SDK** `BidiAgent`. Sub-agents run on **Mistral Large** via Amazon Bedrock, and public health data enrichment is provided by the **MCP Data.gouv** connector.

### Design Principles
- **Voice-first**: The patient interacts through real-time speech via Nova Sonic 2 — no separate STT/TTS pipeline needed
- **Data separation**: Clinical and administrative data live in isolated stores
- **Agent specialization**: Each agent has a single responsibility, orchestrated by a supervisor
- **Agents as Tools**: Sub-agents are `@tool` functions wrapping `strands.Agent` instances, called by the orchestrator
- **Real-time**: The nurse dashboard updates in real-time as new patients complete intake
- **Decision support, not replacement**: The system recommends a CCMU level; the nurse always has final authority
- **Information boundary**: CCMU levels, red flags, and clinical assessments are never communicated to the patient

---

## 2. Patient Journey

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
│  Microphone ◄─────► BidiAgent (Nova Sonic 2)             │
│  Speaker              │                                   │
│                  ┌────┼────┐                              │
│                  │         │                              │
│            Agent 1    Agent 2                             │
│            Clinical   DataGouv                            │
│            (Mistral)  (Mistral + MCP)                    │
└──────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  Triage Document │  JSON sent to nurse dashboard
│  Generated       │
└──────────────────┘
```

---

## 3. Agent Architecture

### Architecture Pattern: Agents as Tools (Strands SDK)

Triastral uses the **"Agents as Tools"** pattern from Strands Agents SDK. The Orchestrator is a `BidiAgent` using Nova Sonic 2 for voice. Sub-agents are `@tool` functions provided to the BidiAgent tools list.

```
┌─────────────────────────────────────────────────────┐
│           ORCHESTRATOR (BidiAgent)                    │
│         Amazon Nova Sonic 2                           │
│         Real-time voice conversation                  │
│                                                       │
│  tools=[                                              │
│    clinical_assessment,     # Agent 1 (@tool)         │
│    query_health_data,       # Agent 2 (@tool + MCP)   │
│    stop_conversation,       # End session             │
│  ]                                                    │
└─────────────────────────────────────────────────────┘
```

### 3.1 Orchestrator Agent (`backend/main.py`)

**Runtime**: Strands Agents SDK — `BidiAgent` (experimental bidi module)
**Model**: Amazon Nova Sonic 2 (`amazon.nova-2-sonic-v1:0`) via `BidiNovaSonicModel`
**Role**: Voice conversation manager and agent coordinator

**Implementation**:
```python
from strands.experimental.bidi import BidiAgent
from strands.experimental.bidi.models import BidiNovaSonicModel
from strands.experimental.bidi.io import BidiAudioIO, BidiTextIO
from strands.experimental.bidi.tools import stop_conversation

model = BidiNovaSonicModel(
    model_id="amazon.nova-2-sonic-v1:0",
    provider_config={"audio": {"voice": "tiffany"}},
    client_config={"region": "us-east-1"},
)

agent = BidiAgent(
    model=model,
    system_prompt=_load_prompt(),  # from backend/agents/prompts/orchestrator.md
    tools=[clinical_assessment, query_health_data, stop_conversation],
)
```

**Conversation Flow**:
```
Greeting & consent
  → Chief complaint identification
  → Clinical questions (one at a time)
  → DELEGATE to clinical_assessment (Agent 1)
  → DELEGATE to query_health_data (Agent 2)
  → Factual summary & confirmation with patient
  → Compile triage document (nurse-only JSON)
  → stop_conversation
```

**Configuration (environment variables)**:
| Variable | Default | Description |
|----------|---------|-------------|
| `NOVA_SONIC_MODEL_ID` | `amazon.nova-2-sonic-v1:0` | Nova Sonic model ID |
| `NOVA_SONIC_VOICE_ID` | `tiffany` | Voice for speech synthesis |
| `AWS_REGION` | `us-east-1` | AWS region for Bedrock |

### 3.2 Agent 1 — Clinical Pre-Assessment (`backend/agents/clinical_agent.py`)

**Model**: Mistral Large (`mistral.mistral-large-3-675b-instruct`) via `BedrockModel`
**Role**: Clinical pre-assessment specialist using OPQRST framework

**Implementation**:
```python
@tool
def clinical_assessment(patient_context: str) -> str:
    """Conduct structured clinical pre-assessment using OPQRST framework."""
    agent = Agent(model=_make_model(), system_prompt=_load_prompt())
    response = agent(patient_context)
    return str(response)  # JSON string
```

**Output** (structured JSON):
```json
{
  "chief_complaint": "Douleur thoracique oppressante",
  "opqrst": {
    "onset": "Ce matin, au réveil",
    "provocation": "Effort physique",
    "quality": "Oppression, serrement",
    "region": "Thorax, irradiation bras gauche",
    "severity": 7,
    "timing": "Continu depuis 3h"
  },
  "medical_history": ["hypertension", "diabete_type_2"],
  "medications": ["metformine_1000mg", "amlodipine_5mg"],
  "allergies": [],
  "red_flags": ["chest_pain_with_dyspnea_and_diaphoresis"],
  "suggested_ccmu": "4",
  "ccmu_reasoning": "Douleur thoracique avec irradiation et facteurs de risque cardiovasculaire",
  "is_urgent": true
}
```

**Error handling**: On agent failure, returns error JSON with `"suggested_ccmu": "3"` (cautious default).

### 3.3 Agent 2 — DataGouv Health Data Tool (`backend/agents/datagouv_tool.py`)

**Model**: Mistral Large (`mistral.mistral-large-3-675b-instruct`) via `BedrockModel`
**Role**: Public health data enrichment via MCP
**MCP Server**: `https://mcp.data.gouv.fr/mcp` (streamable HTTP transport)

**Behavior**:
- Queries data.gouv.fr datasets via MCP for:
  - Pathology prevalence by department/age
  - Medication interactions (BDPM)
  - Local facility capabilities (FINESS)
  - Epidemiological alerts
- Returns contextual enrichment report as JSON

---

## 4. Models Called During a Conversation

| Step | Model | Provider | Purpose |
|------|-------|----------|---------|
| Voice conversation | `amazon.nova-2-sonic-v1:0` (Nova Sonic 2) | Amazon Bedrock | Real-time speech-to-speech, tool orchestration |
| Clinical assessment | `mistral.mistral-large-3-675b-instruct` (Mistral Large) | Amazon Bedrock | OPQRST analysis, red flags, CCMU suggestion |
| DataGouv enrichment | `mistral.mistral-large-3-675b-instruct` (Mistral Large) | Amazon Bedrock | MCP queries to data.gouv.fr |

---

## 5. Triage Document (Orchestrator Output)

The final JSON document generated for the nurse dashboard. Never exposed to the patient.

```json
{
  "patient_chief_complaint": "Douleur thoracique oppressante depuis ce matin",
  "clinical_assessment": {
    "opqrst": { "onset": "...", "provocation": "...", "quality": "...", "region": "...", "severity": 7, "timing": "..." },
    "red_flags": ["chest_pain_with_dyspnea_and_diaphoresis"],
    "medical_history": ["hypertension", "diabete_type_2"],
    "medications": ["metformine_1000mg", "amlodipine_5mg"],
    "allergies": []
  },
  "datagouv_context": {
    "epidemiological_context": {},
    "medication_context": {},
    "facility_context": {},
    "summary": "Résumé narratif pour l'infirmier(ère)"
  },
  "recommended_ccmu": "4",
  "ccmu_reasoning": "Douleur thoracique avec irradiation et facteurs de risque cardiovasculaire",
  "data_quality_notes": null,
  "timestamp": "2026-02-28T14:32:00Z"
}
```

---

## 6. CCMU Classification Logic

Implemented in `backend/triage.py` and in the orchestrator system prompt:

```
IF red_flags with immediate-death-risk indicators → CCMU 5
ELSE IF red_flags present (no immediate death risk) → CCMU 4
ELSE IF psychiatric indicators → CCMU P
ELSE IF unstable without life threat → CCMU 3
ELSE IF stable, requires diagnostic/therapeutic decision → CCMU 2
ELSE IF stable, no action needed → CCMU 1
```

---

## 7. Module Layout

```
backend/
├── main.py                          # Entry point — async main, BidiAgent setup
├── triage.py                        # CCMU classification + triage document compilation
├── agents/
│   ├── clinical_agent.py            # Agent 1 — Clinical pre-assessment (@tool)
│   ├── datagouv_tool.py             # Agent 2 — DataGouv MCP enrichment (@tool, existing)
│   └── prompts/
│       ├── orchestrator.md          # Orchestrator system prompt (French)
│       ├── clinical.md              # Clinical Agent system prompt (French)
│       └── datagouv.md              # DataGouv Agent system prompt (existing)
├── output/                          # Triage document JSON files (generated at runtime)
├── api/                             # FastAPI routes (not yet implemented)
└── persistence/                     # Database layer (not yet implemented)
```

---

## 8. Infrastructure

### 8.1 Backend

| Component | Technology | Role |
|-----------|-----------|------|
| **Agent Runtime** | Strands Agents SDK — `BidiAgent` | Voice orchestration via Nova Sonic 2 |
| **Model Provider** | Amazon Bedrock | Nova Sonic 2 + Mistral Large |
| **MCP Integration** | Strands `MCPClient` + streamable HTTP | Data.gouv.fr public health data |
| **API Server** | FastAPI (planned) | REST API for frontend-backend communication |

### 8.2 Storage (AWS — planned)

| Service | Use |
|---------|-----|
| **DynamoDB — Admin Table** | Administrative patient data |
| **DynamoDB — Clinical Table** | Clinical data (KMS encrypted, restricted access) |
| **DynamoDB — Queue Table** | Patient queue state, positions, statuses |

### 8.3 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NOVA_SONIC_MODEL_ID` | `amazon.nova-2-sonic-v1:0` | Nova Sonic model for orchestrator |
| `NOVA_SONIC_VOICE_ID` | `tiffany` | Voice ID for speech synthesis |
| `AWS_REGION` | `us-east-1` | AWS region for all Bedrock calls |
| `BEDROCK_MODEL_ID` | `mistral.mistral-large-3-675b-instruct` | Model for Clinical Agent and DataGouv tool |
| `DATAGOUV_MCP_URL` | `https://mcp.data.gouv.fr/mcp` | MCP Data.gouv endpoint |

---

## 9. What's Implemented vs Planned

- ✅ Orchestrator Agent — BidiAgent with Nova Sonic 2 voice conversation
- ✅ Agent 1 (Clinical Pre-Assessment) — full OPQRST + red flags + CCMU suggestion
- ✅ Agent 2 (DataGouv MCP enrichment) — full implementation
- ✅ CCMU classification logic (`backend/triage.py`)
- ✅ French system prompts for orchestrator and clinical agent
- ✅ Structured logging for tool calls and session lifecycle
- 🔲 Agent 3 (Admin File Builder) — not yet implemented
- 🔲 FastAPI API layer
- 🔲 DynamoDB persistence layer
- 🔲 Frontend apps (patient kiosk + nurse dashboard)
- 🔲 QR code generation + patient queue tracking

---

## 10. Hackathon Priorities

### Must-Have (MVP)
- ✅ Voice conversation with patient via Nova Sonic 2
- ✅ Clinical pre-assessment agent (OPQRST + red flags)
- ✅ DataGouv health data enrichment via MCP
- ✅ CCMU classification output
- ✅ Triage document generation

### Should-Have
- Nurse dashboard with patient queue
- Patient kiosk UI
- Real-time WebSocket updates
- QR code → patient queue tracking

### Nice-to-Have
- Agent 3 (Administrative data collection)
- PDF export of triage document
- Multi-language support
