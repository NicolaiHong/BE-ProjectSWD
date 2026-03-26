# Backend Implementation (ai-idea-api)

## Goal
Implement API-centric workflow with minimal changes.

## Core rules
- Use `api_id` as main unit
- Support 2 modes: PREVIEW, FULL_SOURCE
- Do NOT generate whole swagger
- Do NOT over-engineer

## Required changes

### 1. generation_sessions
Add:
- api_id (uuid)
- mode (PREVIEW | FULL_SOURCE)

### 2. apis
Add:
- workflow_state

States:
CONFIGURED
UI_GENERATED
CODE_GENERATED
READY_TO_DEPLOY
DEPLOYING
DEPLOYED
FAILED

### 3. deployments
Add:
- generation_session_id

---

## Generation flow

### PREVIEW
Input:
- api_id

Do:
- extract only API scope
- call AI
- return preview (HTML)

Do NOT:
- save files
- deploy

---

### FULL_SOURCE
Input:
- api_id

Do:
- generate real source
- store in generated_codes

---

## State transitions

CONFIGURED → when config ready  
UI_GENERATED → preview success  
CODE_GENERATED → full code success  
READY_TO_DEPLOY → user action  
DEPLOYING → deploy start  
DEPLOYED / FAILED → deploy result  

---

## Constraints
- No new architecture layer
- No workflow engine
- Reuse existing services
