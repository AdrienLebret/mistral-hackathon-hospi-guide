# Data Model — HospiGuide

## Overview

HospiGuide uses three separate DynamoDB tables to enforce data isolation between administrative, clinical, and operational data.

---

## Table 1: Admin Data (`hospi-guide-admin`)

Stores non-sensitive patient administrative information.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `patient_id` | String (PK) | ✅ | Unique patient identifier (format: `PAT-YYYYMMDD-NNN`) |
| `session_timestamp` | String (SK) | ✅ | ISO 8601 timestamp of session creation |
| `full_name` | String | ✅ | Patient full name |
| `date_of_birth` | String | ✅ | ISO 8601 date |
| `gender` | String | ✅ | M / F / Other |
| `address` | String | ❌ | Full address |
| `phone` | String | ✅ | Phone number |
| `insurance_type` | String | ❌ | "carte_vitale", "cmu", "ame", "private", "none" |
| `insurance_number` | String | ❌ | Carte Vitale or policy number |
| `mutuelle` | String | ❌ | Mutuelle provider name |
| `mutuelle_number` | String | ❌ | Mutuelle policy number |
| `emergency_contact_name` | String | ❌ | Emergency contact full name |
| `emergency_contact_relation` | String | ❌ | Relationship to patient |
| `emergency_contact_phone` | String | ❌ | Emergency contact phone |
| `attending_physician` | String | ❌ | Médecin traitant name |
| `data_complete` | Boolean | ✅ | Whether all required fields are present |
| `missing_fields` | List\<String\> | ✅ | List of missing field names |
| `created_at` | String | ✅ | ISO 8601 |
| `updated_at` | String | ✅ | ISO 8601 |

**Encryption**: Standard DynamoDB encryption at rest  
**Access**: Lambda functions with `hospi-admin-access` IAM role

---

## Table 2: Clinical Data (`hospi-guide-clinical`)

Stores sensitive clinical patient information. **Encrypted with AWS KMS customer-managed key.**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `patient_id` | String (PK) | ✅ | Matches admin table |
| `session_timestamp` | String (SK) | ✅ | Matches admin table |
| `chief_complaint` | String | ✅ | Primary reason for visit |
| `symptom_assessment` | Map | ✅ | OPQRST structured assessment |
| `symptom_assessment.onset` | String | | When symptoms started |
| `symptom_assessment.provocation` | String | | Aggravating factors |
| `symptom_assessment.palliation` | String | | Alleviating factors |
| `symptom_assessment.quality` | String | | Description of sensation |
| `symptom_assessment.region` | String | | Location |
| `symptom_assessment.radiation` | String | | Spread pattern |
| `symptom_assessment.severity` | Number | | 0-10 scale |
| `symptom_assessment.timing` | String | | Constant/intermittent |
| `associated_symptoms` | List\<String\> | ❌ | Related symptoms |
| `medical_history` | List\<String\> | ❌ | Chronic conditions |
| `surgical_history` | List\<String\> | ❌ | Past surgeries |
| `current_medications` | List\<String\> | ❌ | Active medications |
| `allergies` | List\<String\> | ❌ | Known allergies |
| `red_flags` | List\<String\> | ✅ | Detected red flag indicators |
| `preliminary_assessment` | String | ✅ | Agent 1's clinical summary |
| `datagouv_context` | Map | ❌ | Agent 2's enrichment data |
| `datagouv_context.prevalence` | String | | Pathology prevalence context |
| `datagouv_context.comorbidity_flags` | String | | Comorbidity context |
| `datagouv_context.medication_notes` | String | | Interaction check results |
| `datagouv_context.data_sources` | List\<String\> | | Source dataset citations |
| `suggested_ccmu` | String | ✅ | AI-recommended CCMU level |
| `ccmu_reasoning` | String | ✅ | Explanation for the CCMU suggestion |
| `final_ccmu` | String | ❌ | Nurse-validated CCMU level |
| `transcript_summary` | String | ✅ | Condensed conversation summary |
| `full_transcript` | String | ❌ | Full voice conversation transcript |
| `triage_document_json` | String | ✅ | Complete triage document as JSON |
| `created_at` | String | ✅ | ISO 8601 |
| `updated_at` | String | ✅ | ISO 8601 |

**Encryption**: AWS KMS customer-managed key (`hospi-guide-clinical-key`)  
**Access**: Lambda functions with `hospi-clinical-access` IAM role (separate from admin)

---

## Table 3: Queue (`hospi-guide-queue`)

Stores real-time patient queue state.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `facility_id` | String (PK) | ✅ | Hospital/facility identifier |
| `patient_id` | String (SK) | ✅ | Matches admin + clinical tables |
| `ccmu_level` | String | ✅ | Current CCMU level (AI or nurse-validated) |
| `ccmu_sort_key` | Number | ✅ | Numeric priority (5=highest, 1=lowest) for sorting |
| `status` | String | ✅ | `waiting` / `called` / `in_triage` / `completed` / `cancelled` |
| `chief_complaint_short` | String | ✅ | One-line summary for queue display |
| `patient_name` | String | ✅ | For nurse dashboard display |
| `arrival_time` | String | ✅ | ISO 8601 |
| `called_time` | String | ❌ | When patient was called (ISO 8601) |
| `completed_time` | String | ❌ | When triage was completed (ISO 8601) |
| `qr_token` | String | ✅ | Unique token for QR code URL |
| `qr_code_url` | String | ✅ | URL encoded in the QR code |
| `created_at` | String | ✅ | ISO 8601 |
| `updated_at` | String | ✅ | ISO 8601 |
| `ttl` | Number | ✅ | DynamoDB TTL — auto-delete after 24h |

**GSI 1**: `facility-status-index`
- PK: `facility_id` / SK: `status`
- Use: Get all waiting patients for a facility

**GSI 2**: `qr-token-index`
- PK: `qr_token`
- Use: Patient looks up their queue position via QR code

---

## Entity Relationships

```
┌──────────────────┐     patient_id      ┌──────────────────┐
│  Admin Table     │ ◄──────────────────► │  Clinical Table  │
│  (standard enc)  │                      │  (KMS encrypted) │
└────────┬─────────┘                      └────────┬─────────┘
         │                                          │
         │  patient_id                    patient_id │
         │                                          │
         └────────────────┬─────────────────────────┘
                          │
                          ▼
                ┌──────────────────┐
                │   Queue Table    │
                │  (operational)   │
                └──────────────────┘
```

---

## QR Code URL Format

```
https://hospi-guide.example.com/queue/{qr_token}
```

This URL returns a simple page showing:
- Patient's current queue position
- Estimated wait time
- Status: "Waiting" / "You've been called — please proceed to Triage Room X"
