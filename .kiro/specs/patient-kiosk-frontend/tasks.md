# Implementation Plan: Patient Kiosk Frontend

## Overview

Incremental build of the Triastral patient kiosk: starting with shared types and the FastAPI WebSocket bridge, then audio services, state machine, UI components, and finally wiring everything together. Backend is Python (FastAPI + hypothesis), frontend is TypeScript/Next.js (fast-check + vitest).

## Tasks

- [x] 1. Define shared types and event protocol
  - [x] 1.1 Create frontend type definitions (`types/kiosk.ts`, `types/patient.ts`, `types/events.ts`)
    - Define `KioskPhase`, `AvatarState`, `ConversationMessage`, `KioskError`, `TicketData`
    - Define `TriageDocument`, `PatientSummary`
    - Define all WebSocket event interfaces (`SessionStartEvent`, `SessionEndEvent`, `AudioDataEvent`, `TextOutputEvent`, `ToolUseEvent`, `ToolResultEvent`, `ErrorEvent`, `TextInputEvent`)
    - _Requirements: 2.1, 5.5, 5.6, 7.1, 8.1, 10.1, 11.1, 12.1, 12.3_

  - [x] 1.2 Create event protocol parser (`lib/eventProtocol.ts`)
    - Implement `parseServerEvent(data: string): WSEvent` to parse incoming JSON frames
    - Implement `serializeTextInput(content: string): string` to serialize outgoing text events
    - _Requirements: 12.1, 12.3, 12.4_

  - [ ]* 1.3 Write property test for client text event serialization
    - **Property 9: Client text events serialize with required fields**
    - **Validates: Requirements 12.3**

- [x] 2. Implement information boundary filter
  - [x] 2.1 Create `lib/informationBoundary.ts`
    - Implement `extractPatientSummary(triageDocument: TriageDocument): PatientSummary`
    - Extract only `chiefComplaint`, `declaredSymptoms`, `medicalHistory`, `medications`, `allergies`
    - Never access or return `recommended_ccmu`, `ccmu_reasoning`, `red_flags`, `opqrst`, `is_urgent`
    - Handle empty/missing fields gracefully (return empty arrays/strings)
    - _Requirements: 7.1, 7.2, 10.1, 10.2, 10.3_

  - [ ]* 2.2 Write property test for information boundary
    - **Property 3: Information boundary — extractPatientSummary never leaks restricted fields**
    - **Validates: Requirements 7.1, 7.2, 10.1, 10.2**

- [x] 3. Implement kiosk state machine
  - [x] 3.1 Create `hooks/useKioskStateMachine.ts`
    - Implement `kioskReducer` with all `KioskAction` types
    - Enforce phase transitions: `welcome→conversation`, `conversation→validation`, `validation→ticket`, `validation→conversation`, `ticket→welcome`
    - Invalid transitions leave phase unchanged
    - Map avatar states: `AGENT_SPEAKING→talking`, `PATIENT_SPEAKING→listening`, `IDLE→idle`, `TOOL_RUNNING→talking`, welcome→`waving`, ticket→`happy`
    - Apply information boundary filter on `SESSION_END` to produce `patientSummary`
    - `RESET` returns clean initial state
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.2, 5.3, 5.4, 5.7, 6.3, 7.4, 8.4, 8.5_

  - [ ]* 3.2 Write property test for state machine phase transitions
    - **Property 1: State machine phase transitions are deterministic and correct**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 7.4**

  - [ ]* 3.3 Write property test for avatar state derivation
    - **Property 2: Avatar state is correctly derived from kiosk actions**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.6, 5.7, 6.3, 8.4**

  - [ ]* 3.4 Write property test for state machine reset
    - **Property 11: State machine reset produces clean initial state**
    - **Validates: Requirements 2.5, 8.5**

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement audio services
  - [x] 5.1 Create `components/audio/AudioCaptureService.ts`
    - Request mic with `{ channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true }`
    - Implement AudioWorklet-based capture with ScriptProcessorNode fallback
    - Convert Float32 → Int16 PCM
    - Buffer into 3200-sample chunks (200ms) via `RollingBuffer`
    - Call `onChunk` callback with each filled buffer
    - Implement `start(onChunk)` and `stop()` methods with proper resource cleanup
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 5.2 Write property test for Float32-to-Int16 PCM conversion
    - **Property 5: Float32-to-Int16 PCM conversion is reversible**
    - **Validates: Requirements 3.2, 4.1**

  - [ ]* 5.3 Write property test for audio chunking
    - **Property 6: Audio chunking produces correct-size buffers**
    - **Validates: Requirements 3.3**

  - [x] 5.4 Create `components/audio/AudioPlaybackService.ts`
    - Create AudioContext at 24kHz sample rate
    - Decode incoming Int16 PCM → Float32 → AudioBuffer
    - Schedule buffers via `source.start(nextStartTime)` for gapless playback
    - Implement `stop()` for barge-in: cancel all scheduled `AudioBufferSourceNode` instances
    - Implement `dispose()` for full cleanup
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 5.5 Write property test for gapless playback scheduling
    - **Property 7: Audio playback scheduling is gapless**
    - **Validates: Requirements 4.2**

  - [ ]* 5.6 Write property test for barge-in
    - **Property 8: Barge-in clears all scheduled audio**
    - **Validates: Requirements 4.3**

- [x] 6. Implement WebSocket hook
  - [x] 6.1 Create `hooks/useWebSocket.ts`
    - Manage WebSocket lifecycle (connect, disconnect, reconnect=none)
    - Send binary frames for audio, JSON frames for text
    - Parse incoming messages: binary → audio playback, text → event protocol parser
    - Dispatch parsed events via callback
    - Implement 30s timeout for initial `sessionStart` event
    - Handle `onclose`/`onerror` with `KioskError` dispatch
    - _Requirements: 1.1, 11.1, 11.2, 12.2, 12.3_

- [x] 7. Implement FastAPI API layer
  - [x] 7.1 Create `backend/api/__init__.py` and `backend/api/routes.py`
    - Set up FastAPI app with CORS middleware
    - Implement `GET /health` returning `{"status": "ok"}`
    - Implement `WebSocket /ws` endpoint delegating to ConnectionManager
    - _Requirements: 1.1, 1.9_

  - [x] 7.2 Create `backend/api/websocket.py` — ConnectionManager
    - Initialize BidiAgent session with Nova Sonic 2 model and tools (clinical_assessment, query_health_data, stop_conversation)
    - Forward incoming binary audio (PCM 16kHz) to BidiAgent
    - Background task: read BidiAgent audio output, send PCM 24kHz binary frames to browser
    - Background task: read BidiAgent events, format and send JSON events to browser
    - Handle tool execution and result forwarding
    - On `stop_conversation`: call `compile_triage_document()`, send `sessionEnd` event with triage document
    - On disconnect: cancel background tasks, release BidiAgent resources
    - All JSON events include `type` and `timestamp` (ISO 8601) fields
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 12.1, 12.4, 12.5_

  - [ ]* 7.3 Write property test for WebSocket event formatting (hypothesis)
    - **Property 4: Server WebSocket events have valid type and timestamp**
    - **Validates: Requirements 1.5, 1.6, 12.1, 12.4, 12.5**

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Set up Next.js project and Tailwind theme
  - [x] 9.1 Initialize Next.js 15 project in `frontend/`
    - Configure `next.config.ts`
    - Set up Tailwind CSS with Mistral palette: orange `#FF7000`, amber `#FFB800`, dark `#0F172A`, card `#1E293B`, card-hover `#334155`
    - Configure Inter font family
    - Install and configure Framer Motion
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 9.2 Create root layout (`app/layout.tsx`) and main page (`app/page.tsx`)
    - Root layout with font loading, Tailwind, full-screen kiosk styling
    - Main page renders current phase view based on state machine
    - _Requirements: 9.4_

- [x] 10. Implement UI components
  - [x] 10.1 Create `components/ProgressBar.tsx`
    - 4-phase progress indicator showing current phase
    - Mistral palette styling
    - _Requirements: 2.6_

  - [x] 10.2 Create `components/avatar/PixelArtAvatar.tsx`
    - Animated pixel art avatar with 5 states: `idle`, `waving`, `talking`, `listening`, `happy`
    - Framer Motion animations for state transitions
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 6.3, 8.4_

  - [x] 10.3 Create `components/SpeechBubble.tsx`
    - Message bubble with typewriter effect for agent messages
    - Distinct styling for agent vs patient messages
    - _Requirements: 5.5, 5.6_

  - [x] 10.4 Create `components/ErrorOverlay.tsx`
    - Semi-transparent overlay with French error message and action button
    - Map `KioskError` codes to French messages (no technical terms)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 10.5 Write property test for error messages
    - **Property 10: All error messages are French and non-technical**
    - **Validates: Requirements 11.4**

- [x] 11. Implement phase views
  - [x] 11.1 Create `views/WelcomeView.tsx`
    - Display "Triastral" branding, service description in French
    - "Commencer" button triggering `START_CONVERSATION`
    - Consent message about AI analysis
    - Avatar in `waving` state
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 11.2 Create `views/ConversationView.tsx`
    - Avatar centered with dynamic state (talking/listening/idle)
    - Speech bubbles for agent and patient messages
    - Processing indicator when tools are running
    - Wire audio capture and playback services
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 11.3 Create `views/ValidationView.tsx`
    - Display `PatientSummary` (chief complaint, symptoms, history, medications, allergies)
    - "Confirmer" button triggering `CONFIRM_VALIDATION`
    - "Corriger" button triggering `CORRECT_INFO`
    - Enforce information boundary — no CCMU, red flags, or clinical data shown
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 10.1, 10.2, 10.3_

  - [x] 11.4 Create `views/TicketView.tsx`
    - Generate and display QR code (using `qrcode.react` or similar)
    - Reassurance message in French
    - Display arrival time
    - Avatar in `happy` state
    - "Recommencer" button triggering `RESET`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 12. Wire everything together in main page
  - [x] 12.1 Integrate state machine, WebSocket hook, audio services, and views in `app/page.tsx`
    - Connect `useWebSocket` events to `useKioskStateMachine` dispatch
    - Start/stop `AudioCaptureService` on conversation phase enter/exit
    - Route `AudioPlaybackService` to WebSocket binary frames
    - Handle barge-in: stop playback when patient starts speaking
    - Render correct view based on current phase
    - Show `ProgressBar` and `ErrorOverlay` as persistent overlays
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.4, 4.3, 4.4, 11.1, 11.2, 11.3_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (fast-check for frontend, hypothesis for backend)
- Unit tests validate specific examples and edge cases
- Legacy references (`legacy/old-frontend/patient-kiosk/` and `legacy/code-example/sample-nova-sonic-agentic-chatbot/`) should be consulted during implementation for patterns and design cues
