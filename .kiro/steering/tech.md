# Triastral — Tech Stack & Build

## Runtime
- Python 3.x
- Async entry point (`asyncio.run`)

## Core Frameworks & Libraries
- **Strands Agents SDK** (`strands-agents[bidi]`): Agent framework, BidiAgent for real-time voice
- **Amazon Bedrock**: Model provider for all agents
- **MCP** (`mcp` package): Model Context Protocol client for data.gouv.fr integration
- **boto3**: AWS SDK
- **hypothesis**: Property-based testing

## Models
| Agent | Model | ID |
|-------|-------|----|
| Orchestrator | Amazon Nova Sonic 2 | `amazon.nova-2-sonic-v1:0` |
| Clinical Agent | Mistral Large | `mistral.mistral-large-3-675b-instruct` |
| DataGouv Agent | Mistral Large | `mistral.mistral-large-3-675b-instruct` |

## Agent Pattern
"Agents as Tools" — sub-agents are `@tool`-decorated functions wrapping `strands.Agent` instances, passed to the orchestrator's tools list.

## Environment Variables
| Variable | Default |
|----------|---------|
| `NOVA_SONIC_MODEL_ID` | `amazon.nova-2-sonic-v1:0` |
| `NOVA_SONIC_VOICE_ID` | `tiffany` |
| `AWS_REGION` | `us-east-1` |
| `BEDROCK_MODEL_ID` | `mistral.mistral-large-3-675b-instruct` |
| `DATAGOUV_MCP_URL` | `https://mcp.data.gouv.fr/mcp` |

## Common Commands

```bash
# Setup
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
pip install pyaudio

# Run the voice orchestrator
python backend/main.py

# Run a sub-agent standalone (for testing)
python backend/agents/clinical_agent.py
python backend/agents/datagouv_tool.py
```

## System Requirements
- AWS credentials with Bedrock access (Nova Sonic 2 + Mistral Large)
- PortAudio (`brew install portaudio` on macOS) for microphone/speaker I/O
- Headphones recommended to avoid mic feedback loops

## Planned (Not Yet Implemented)
- FastAPI API layer
- DynamoDB persistence (3 tables: admin, clinical, queue)
- React frontends (patient kiosk + nurse dashboard)
