# Triastral — Product Overview

Triastral is an AI-powered voice kiosk for French emergency department triage. Patients speak to a voice agent at intake, and within minutes a structured triage document with a CCMU classification recommendation is generated for the coordinating nurse.

## Core Workflow
1. Patient speaks to a voice agent (French) at a kiosk
2. The orchestrator collects symptoms, medical history, medications, allergies
3. A clinical agent analyzes the data using the OPQRST framework and suggests a CCMU level
4. A DataGouv agent enriches the case with public health data from data.gouv.fr
5. A structured triage document (JSON) is compiled for the nurse dashboard

## Domain Context
- CCMU (Classification Clinique des Malades aux Urgences) is the French ER triage standard
- Levels: 1 (stable, no action) → 5 (immediate life threat), P (psychiatric), D (deceased)
- The system is advisory only — the nurse has final authority over triage decisions

## Critical Information Boundary
- Patient-facing: factual recaps, reassurance, logistical next steps only
- Nurse-facing: full triage document with CCMU, red flags, clinical assessment, DataGouv context
- CCMU levels, red flags, and clinical reasoning are NEVER communicated to the patient

## Language
- All patient-facing conversation and clinical prompts are in French
- DataGouv agent prompt is in English
- Code comments and docstrings are in English

## Origin
Hackathon project (Mistral AI × AWS × ElevenLabs × Data.gouv MCP, March 2026).
