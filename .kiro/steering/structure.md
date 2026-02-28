# Triastral — Project Structure

```
backend/
├── main.py                     # Entry point — BidiAgent voice orchestrator (async)
├── triage.py                   # CCMU classification logic + triage document compilation
├── requirements.txt            # Python dependencies
├── agents/
│   ├── clinical_agent.py       # Agent 1 — Clinical pre-assessment (@tool)
│   ├── datagouv_tool.py        # Agent 2 — DataGouv MCP enrichment (@tool)
│   └── prompts/
│       ├── orchestrator.md     # Orchestrator system prompt (French)
│       ├── clinical.md         # Clinical agent system prompt (French)
│       └── datagouv.md         # DataGouv agent system prompt (English)
docs/
├── ARCHITECTURE.md             # System architecture and design decisions
├── AGENT_PROMPTS.md            # Agent behavior specifications
├── DATA_MODEL.md               # DynamoDB table schemas (planned)
└── CCMU_REFERENCE.md           # CCMU classification reference
legacy/                         # Reference code (Nova Sonic chatbot sample)
```

## Conventions

- Agent prompts live in `backend/agents/prompts/` as `.md` files, loaded at runtime via `Path.read_text()`
- Each sub-agent is a single file in `backend/agents/` exporting a `@tool`-decorated function
- Sub-agents create their own `Agent` + `BedrockModel` internally — the orchestrator only sees the `@tool` interface
- Deterministic logic (CCMU classification, document compilation) lives in `backend/triage.py`, separate from agent code
- JSON output uses `ensure_ascii=False` to preserve French characters (accents, cédilles)
- Error handling in agents returns fallback JSON with `suggested_ccmu: "3"` (cautious default)
- Config is via environment variables with sensible defaults (no config files)
- `backend/output/` holds runtime-generated triage document JSON files (gitignored)
