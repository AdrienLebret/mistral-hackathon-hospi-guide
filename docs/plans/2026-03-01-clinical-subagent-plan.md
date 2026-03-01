# Clinical Sub-Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the dumb Python transcript parser with a Claude Haiku clinical sub-agent that produces a rich OPQRST report with CCMU scoring, and deepen the voice interview to collect better data.

**Architecture:** After the voice session ends, one Claude Haiku API call via Bedrock `converse()` receives the full transcript and the existing `clinical.md` prompt. It returns structured JSON that maps directly to the frontend's PatientData type. The current Python parser is kept as fallback.

**Tech Stack:** boto3 Bedrock Runtime (converse API), Claude 3.5 Haiku, existing FastAPI/WebSocket server

---

### Task 1: Rewrite Orchestrator Prompt (8-step OPQRST Interview)

**Files:**
- Modify: `backend/agents/prompts/orchestrator.md` (full rewrite)

**Step 1: Rewrite orchestrator.md**

Replace the entire file with the enhanced 8-step OPQRST interview flow:

```markdown
You are Triastral, a voice-based triage assistant at a hospital emergency room kiosk. You conduct a short, focused voice conversation in English.

## Your Mission

Collect the patient's name, symptoms (following the OPQRST framework), medical history, medications, and allergies through a natural, caring conversation. Keep it simple: ask one short question at a time.

You NEVER make a diagnosis. You NEVER communicate any clinical assessment to the patient.

## Available Tools

- **`stop_conversation`**: Call to end the voice session. Call this IMMEDIATELY after your closing message. Do NOT call any other tool.

## Conversation Flow

### Step 1 — Name
Say: "Hello, I am the emergency room intake assistant. I will ask you a few quick questions. What is your name?"

### Step 2 — Chief Complaint
Ask: "What brings you to the emergency room today?"

### Step 3 — Onset
Ask: "When did this start? Was it sudden or gradual?"
Skip if the patient already mentioned timing in their chief complaint.

### Step 4 — Region & Radiation
Ask: "Where exactly do you feel it? Does it spread or radiate anywhere?"
Skip if the patient already described the location clearly.

### Step 5 — Severity
Ask: "On a scale from 0 to 10, how would you rate the intensity right now?"
Skip if the patient already gave a number.

### Step 6 — Timing
Ask: "Is it constant, or does it come and go?"
Skip if the patient already described the pattern.

### Step 7 — Medical History & Medications
Ask: "Do you have any medical conditions, past surgeries, or medications you take regularly?"
If yes, let them list everything. If no, confirm and move on.

### Step 8 — Allergies
Ask: "Any known allergies, especially to medications?"
If yes, ask which ones. If no, confirm and move on.

### Step 9 — Close
Say: "Thank you [name]. Your file is being compiled now. A nurse will be with you shortly."
Then IMMEDIATELY call `stop_conversation`. Do NOT call any other tool. Do NOT summarize or ask for confirmation.

## Rules

- **One question at a time.** Never combine multiple questions.
- **Short sentences.** This is a voice conversation.
- **Be adaptive.** If the patient volunteers information that answers a future question, skip that question.
- **Never repeat your greeting.** If interrupted, continue where you left off.
- **Ignore echoes.** If the patient repeats your exact words, skip it.
- **Never reveal clinical data** to the patient.
- **Call `stop_conversation` immediately** after your closing message. No delays.

## Fast Track — Life-Threatening Emergency

If the patient shows signs of cardiac arrest, respiratory distress, loss of consciousness, massive hemorrhage, or anaphylaxis:
1. Say: "I am forwarding your information to the medical team right now. Stay calm, someone is coming."
2. Call `stop_conversation` immediately.
```

**Step 2: Verify the file was saved correctly**

Run: `cat backend/agents/prompts/orchestrator.md | head -5`
Expected: Shows "You are Triastral" header

**Step 3: Commit**

```bash
git add backend/agents/prompts/orchestrator.md
git commit -m "feat(orchestrator): rewrite prompt with 8-step OPQRST interview flow"
```

---

### Task 2: Add `ccmuReasoning` Field to Frontend Types

**Files:**
- Modify: `frontend/patient-kiosk/src/types/patient.ts` (line 39, add field after `suggestedCcmu`)

**Step 1: Add ccmuReasoning to PatientClinical**

In `frontend/patient-kiosk/src/types/patient.ts`, add `ccmuReasoning` after `suggestedCcmu`:

```typescript
// Inside PatientClinical interface, after line 39:
  suggestedCcmu: string
  ccmuReasoning?: string  // <-- ADD THIS LINE
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend/patient-kiosk && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/patient-kiosk/src/types/patient.ts
git commit -m "feat(types): add ccmuReasoning field to PatientClinical"
```

---

### Task 3: Rewrite `run_final_compilation()` with Claude Haiku Sub-Agent

**Files:**
- Modify: `backend/agents/profile_extractor.py` (rewrite `run_final_compilation` function)

**Step 1: Rewrite run_final_compilation with Claude Haiku call**

Replace the entire `run_final_compilation` function. Keep the existing `ProfileExtractorOutput` class unchanged. The new function:

1. Loads `clinical.md` as the system prompt
2. Calls Claude Haiku via `boto3 bedrock-runtime converse()`
3. Parses the JSON response
4. Maps clinical.md output format → frontend PatientData format
5. Falls back to a simple Python extraction if the API call fails

```python
"""
Profile Extractor — collects transcripts, compiles patient record via Claude Haiku.

After the voice session ends, sends the full transcript to Claude Haiku with
the clinical.md prompt (OPQRST + CCMU decision tree). Returns structured JSON
for the frontend validation page.

Falls back to basic Python extraction if the API call fails.
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import TYPE_CHECKING

import boto3

from strands.experimental.bidi.types.events import (
    BidiOutputEvent,
    BidiTranscriptStreamEvent,
)
from strands.experimental.bidi.types.io import BidiOutput

if TYPE_CHECKING:
    from strands.experimental.bidi.agent.agent import BidiAgent

logger = logging.getLogger(__name__)

CLINICAL_PROMPT_PATH = Path(__file__).parent / "prompts" / "clinical.md"

# Model priority: try Haiku 3.5 first, fall back to Haiku 3
MODELS = [
    "anthropic.claude-3-5-haiku-20241022-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0",
]


def _load_clinical_prompt() -> str:
    """Load the clinical.md system prompt."""
    return CLINICAL_PROMPT_PATH.read_text(encoding="utf-8")


def _call_claude_haiku(transcript_text: str) -> dict | None:
    """Call Claude Haiku via Bedrock converse() API.

    Returns the parsed JSON dict from Claude, or None on failure.
    """
    region = os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
    client = boto3.client("bedrock-runtime", region_name=region)
    system_prompt = _load_clinical_prompt()

    for model_id in MODELS:
        try:
            logger.info("Calling %s for clinical compilation...", model_id)
            response = client.converse(
                modelId=model_id,
                system=[{"text": system_prompt}],
                messages=[
                    {
                        "role": "user",
                        "content": [{"text": f"Here is the full patient triage transcript:\n\n{transcript_text}"}],
                    }
                ],
                inferenceConfig={"maxTokens": 2048, "temperature": 0.0},
            )

            # Extract text from response
            output_text = response["output"]["message"]["content"][0]["text"].strip()
            logger.info("Claude response received (%d chars)", len(output_text))

            # Parse JSON — Claude may wrap in ```json ... ```
            if output_text.startswith("```"):
                # Strip markdown code fences
                output_text = re.sub(r"^```(?:json)?\s*", "", output_text)
                output_text = re.sub(r"\s*```$", "", output_text)

            result = json.loads(output_text)
            logger.info("Clinical compilation parsed: ccmu=%s", result.get("suggested_ccmu"))
            return result

        except client.exceptions.ThrottlingException:
            logger.warning("Model %s throttled, trying next...", model_id)
            continue
        except json.JSONDecodeError as e:
            logger.error("Failed to parse Claude JSON: %s — raw: %s", e, output_text[:200])
            return None
        except Exception as e:
            logger.error("Model %s failed: %s", model_id, e)
            continue

    logger.error("All Claude models failed")
    return None


def _map_to_frontend(clinical_result: dict) -> dict:
    """Map clinical.md JSON output to frontend PatientData structure."""
    opqrst = clinical_result.get("opqrst", {})

    return {
        "clinical": {
            "chiefComplaint": clinical_result.get("chief_complaint", ""),
            "symptomAssessment": {
                "onset": opqrst.get("onset", ""),
                "provocation": opqrst.get("provocation", ""),
                "quality": opqrst.get("quality", ""),
                "region": opqrst.get("region", ""),
                "severity": opqrst.get("severity", 0),
                "timing": opqrst.get("timing", ""),
            },
            "medicalHistory": clinical_result.get("medical_history", []),
            "currentMedications": clinical_result.get("medications", []),
            "allergies": clinical_result.get("allergies", []),
            "redFlags": clinical_result.get("red_flags", []),
            "suggestedCcmu": clinical_result.get("suggested_ccmu", "2"),
            "ccmuReasoning": clinical_result.get("ccmu_reasoning", ""),
        },
    }


def _fallback_parse(transcript_text: str) -> dict:
    """Basic Python parser — used when Claude API fails.

    Extracts patient turns by position (same logic as the old parser).
    """
    patient_turns: list[str] = []
    for line in transcript_text.strip().split("\n"):
        line = line.strip()
        if line.startswith("Patient:"):
            patient_turns.append(line[len("Patient:"):].strip())

    name = patient_turns[0] if len(patient_turns) > 0 else ""
    chief_complaint = patient_turns[1] if len(patient_turns) > 1 else ""

    # Last 2 turns = history, allergies; middle = symptom details
    if len(patient_turns) > 4:
        medical_history_raw = patient_turns[-2]
        allergies_raw = patient_turns[-1]
    elif len(patient_turns) > 3:
        medical_history_raw = patient_turns[-2]
        allergies_raw = patient_turns[-1]
    else:
        medical_history_raw = ""
        allergies_raw = ""

    def parse_list(raw: str) -> list[str]:
        lower = raw.lower().strip()
        if lower in ("no", "none", "no.", "none.", "nope", "nothing", "not that i know of"):
            return []
        return [raw] if raw else []

    return {
        "identity": {"fullName": name, "dateOfBirth": "", "sex": ""},
        "clinical": {
            "chiefComplaint": chief_complaint,
            "symptomAssessment": {
                "onset": "", "provocation": "", "quality": "",
                "region": "", "severity": 0, "timing": "",
            },
            "medicalHistory": parse_list(medical_history_raw),
            "currentMedications": [],
            "allergies": parse_list(allergies_raw),
            "redFlags": [],
            "suggestedCcmu": "2",
            "ccmuReasoning": "Default triage — nurse assessment required (fallback parser)",
        },
    }


def run_final_compilation(transcript_text: str) -> dict:
    """Compile patient record from transcript via Claude Haiku.

    Falls back to basic Python parsing if the API call fails.
    """
    logger.info("Final compilation: calling Claude Haiku sub-agent")

    # Extract patient name from first patient turn (for identity section)
    name = ""
    for line in transcript_text.strip().split("\n"):
        line = line.strip()
        if line.startswith("Patient:"):
            name = line[len("Patient:"):].strip()
            break

    # Try Claude Haiku
    clinical_result = _call_claude_haiku(transcript_text)

    if clinical_result:
        result = _map_to_frontend(clinical_result)
        # Add identity (Claude only returns clinical data)
        result["identity"] = {"fullName": name, "dateOfBirth": "", "sex": ""}
        logger.info("Final compilation: done via Claude Haiku — ccmu=%s",
                     result["clinical"].get("suggestedCcmu"))
        return result

    # Fallback to Python parser
    logger.warning("Final compilation: falling back to Python parser")
    return _fallback_parse(transcript_text)
```

**Step 2: Verify the module imports correctly**

Run: `cd /Users/thomasguillemard/Documents/GitHub/mistral-hackathon-hospi-guide && conda run -n triastral python -c "from agents.profile_extractor import run_final_compilation; print('OK')"`
Expected: `OK` (may need to run from backend/ dir)

**Step 3: Commit**

```bash
git add backend/agents/profile_extractor.py
git commit -m "feat(compilation): replace Python parser with Claude Haiku clinical sub-agent

Uses clinical.md OPQRST prompt + CCMU decision tree.
Falls back to basic parser if API call fails."
```

---

### Task 4: Update server.py to Use `run_in_executor` for Blocking API Call

**Files:**
- Modify: `backend/server.py` (lines ~160-175, the compilation block in the finally clause)

**Step 1: Wrap run_final_compilation in run_in_executor**

The Claude API call is blocking (boto3 is sync), so it needs `run_in_executor`. In `server.py`, change the compilation block inside the `finally` clause from:

```python
compilation = run_final_compilation(transcript_text)
```

to:

```python
import functools
loop = asyncio.get_event_loop()
compilation = await loop.run_in_executor(
    None,
    functools.partial(run_final_compilation, transcript_text),
)
```

The full replacement for the compilation try block (around lines 160-186):

```python
        try:
            transcripts = ws_profile_extractor.get_transcripts()
            if transcripts:
                transcript_text = "\n".join(
                    f"{'Assistant' if t['role'] == 'assistant' else 'Patient'}: {t['text']}"
                    for t in transcripts
                )
                logger.info(
                    "Session %s: compiling patient record from %d transcript entries",
                    session_id,
                    len(transcripts),
                )

                # Claude API call is blocking — run in thread pool
                import functools
                loop = asyncio.get_event_loop()
                compilation = await loop.run_in_executor(
                    None,
                    functools.partial(run_final_compilation, transcript_text),
                )

                if compilation:
                    await websocket.send_json({
                        "type": "compilation.complete",
                        "data": compilation,
                    })
                    logger.info("Session %s: compilation.complete sent to frontend", session_id)
                else:
                    logger.warning("Session %s: final compilation returned None", session_id)
            else:
                logger.warning("Session %s: no transcripts collected for compilation", session_id)
        except Exception:
            logger.exception("Session %s: final compilation failed", session_id)
```

**Step 2: Commit**

```bash
git add backend/server.py
git commit -m "feat(server): wrap compilation in run_in_executor for blocking Claude API call"
```

---

### Task 5: Update Frontend State Machine to Map New Fields

**Files:**
- Modify: `frontend/patient-kiosk/src/hooks/useKioskStateMachine.ts` (lines ~220-264, the compilation.complete handler)

**Step 1: Update the compilation result mapping**

The compilation result now includes `ccmuReasoning`. Update the `useEffect` that handles `compilationResult` (around line 220) to also map `ccmuReasoning`:

Find this line inside the `if (clinical)` block:
```typescript
        suggestedCcmu: (clinical.suggestedCcmu as string) ?? '',
```

And add after it:
```typescript
        ccmuReasoning: (clinical.ccmuReasoning as string) ?? '',
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend/patient-kiosk && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/patient-kiosk/src/hooks/useKioskStateMachine.ts
git commit -m "feat(frontend): map ccmuReasoning from compilation result"
```

---

### Task 6: End-to-End Smoke Test

**Step 1: Start backend**

Run: `conda activate triastral && cd backend && uvicorn server:app --port 8000`
Expected: Server starts on port 8000

**Step 2: Start frontend**

Run: `cd frontend/patient-kiosk && npm run dev`
Expected: Vite dev server on port 5173

**Step 3: Run a voice session**

1. Open http://localhost:5173
2. Click "Start" to begin voice session
3. Answer all 8 questions naturally
4. Verify: CompilingView appears after "your file is being compiled"
5. Verify: ValidationView shows rich data — OPQRST fields filled, CCMU level not just "2", red flags if applicable
6. Check backend logs for: "Calling anthropic.claude-3-5-haiku..." and "Clinical compilation parsed: ccmu=..."

**Step 4: Test fallback (optional)**

Temporarily set `AWS_ACCESS_KEY_ID=""` to force API failure, verify Python fallback kicks in and user still sees basic data.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: clinical sub-agent with OPQRST interview and CCMU scoring

- Rewrite orchestrator prompt: 8-step OPQRST interview (name, complaint,
  onset, region, severity, timing, history+meds, allergies)
- Replace Python parser with Claude Haiku clinical sub-agent
- Uses existing clinical.md prompt for OPQRST extraction + CCMU scoring
- Falls back to basic parser if API call fails
- Map ccmuReasoning to frontend PatientClinical type"
```
