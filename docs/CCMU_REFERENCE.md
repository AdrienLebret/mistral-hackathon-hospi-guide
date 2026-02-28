# CCMU Classification Reference — Triastral

## Overview

The **CCMU** (Classification Clinique des Malades aux Urgences) is the standard triage classification system used across French emergency departments. It was developed to quickly categorize patients by the severity of their clinical condition and the urgency of required care.

Triastral uses this classification as the core output of its triage recommendation system.

---

## Classification Levels

### CCMU 1 — Stable, No Action Required
**Color Code**: 🟢 Green  
**Priority**: Low  
**Description**: Patient's condition is stable. No diagnostic or therapeutic action is needed in the emergency department.

**Typical cases**: Minor wounds not requiring sutures, prescription renewals, administrative visits, stable chronic conditions seeking routine advice.

**Action**: Patient can be redirected to outpatient care or general practitioner. Low priority in the queue.

---

### CCMU 2 — Stable, Requires Decision
**Color Code**: 🟡 Yellow  
**Priority**: Medium  
**Description**: Patient's condition is stable, but requires a diagnostic or therapeutic decision that justifies an emergency department visit.

**Typical cases**: Suspected fractures without deformity, moderate infections, non-severe allergic reactions, urinary tract infections, moderate pain requiring investigation.

**Action**: Standard triage queue. Patient requires examination and likely investigations (imaging, blood work).

---

### CCMU 3 — Unstable, No Life Threat
**Color Code**: 🟠 Orange  
**Priority**: High  
**Description**: Patient's functional prognosis may be engaged (risk of complications or worsening) but there is no immediate life-threatening risk.

**Typical cases**: Asthma exacerbation, diabetic decompensation without ketoacidosis, acute abdominal pain, significant trauma without shock, deep wounds requiring sutures.

**Action**: Priority triage. Patient needs relatively prompt medical attention and monitoring.

---

### CCMU 4 — Life-Threatening Prognosis
**Color Code**: 🔴 Red  
**Priority**: Critical  
**Description**: Patient's vital prognosis is engaged. The condition is serious and could deteriorate to life-threatening without timely intervention.

**Typical cases**: Suspected acute coronary syndrome, stroke symptoms, severe sepsis, significant hemorrhage with hemodynamic stability, severe trauma.

**Action**: Urgent triage. Patient requires immediate medical evaluation and likely emergency treatment.

---

### CCMU 5 — Immediate Life Threat
**Color Code**: 🔴⚡ Red Emergency  
**Priority**: Emergency — Immediate intervention required  
**Description**: Patient's vital prognosis is immediately engaged. Without immediate intervention, death is likely.

**Typical cases**: Cardiac arrest, respiratory failure, massive hemorrhage with shock, anaphylactic shock, severe polytrauma, status epilepticus.

**Action**: Bypass queue entirely. Immediate resuscitation room / SAUV (Salle d'Accueil des Urgences Vitales). Emergency team activated.

---

### CCMU P — Psychiatric Emergency
**Color Code**: 🟣 Purple  
**Priority**: Specialized pathway  
**Description**: Patient presenting with a primary psychiatric emergency requiring specialized psychiatric evaluation.

**Typical cases**: Acute psychotic episode, severe suicidal ideation with plan, acute agitation, severe panic attack, dissociative crisis.

**Action**: Dedicated psychiatric triage pathway. Prioritize safety of patient and staff.

---

### CCMU D — Deceased on Arrival
**Color Code**: ⚫ Black  
**Priority**: Specific protocol  
**Description**: Patient is deceased upon arrival at the emergency department.

**Action**: Follow institutional protocol for deceased patients. No triage needed.

---

## Decision Support Logic

The Triastral system uses the following logic to suggest a CCMU level:

```
IF red_flags contains life-threatening indicators:
    IF immediate death risk → CCMU 5
    ELSE → CCMU 4

ELSE IF psychiatric_indicators present:
    → CCMU P

ELSE IF vital_signs_abnormal OR functional_prognosis_engaged:
    → CCMU 3

ELSE IF requires_diagnostic_or_treatment:
    → CCMU 2

ELSE:
    → CCMU 1
```

### Red Flag Indicators (auto-escalation to CCMU 4-5)
- Chest pain with dyspnea and/or diaphoresis
- Sudden neurological deficit (speech, motor, vision)
- Severe respiratory distress (SpO2 < 90% if measured)
- Signs of shock (pale, sweaty, tachycardic, hypotensive)
- Active severe hemorrhage
- Altered consciousness (GCS < 15 if assessed)
- Severe allergic reaction with airway involvement
- "Worst headache of my life" (thunderclap headache)
- Significant mechanism of injury (high-speed trauma, falls > 3m)

---

## Important Notes

1. **The AI suggestion is advisory only.** The coordinating nurse has full authority to override the CCMU level.
2. **The system errs on the side of caution.** When in doubt between two levels, it recommends the higher severity.
3. **CCMU 5 triggers an immediate alert** on the nurse dashboard, regardless of queue position.
4. **CCMU P cases** are flagged for the psychiatric team in addition to the coordinating nurse.
