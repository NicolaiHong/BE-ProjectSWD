# Backend CLI Fix Plan

## Goal

Fix the backend deployment workflow/state issues and make the backend contract consistent for deployment failure handling.

---

## Current observed issues

### Issue A: invalid workflow state

Backend logs show:

- `POST /api/apis/:apiId/deployments` returns `201`
- then `PATCH /api/apis/:apiId/workflow-state` fails with:
  `Invalid workflow_state. Must be one of: CONFIGURED, UI_GENERATED, CODE_GENERATED, READY_TO_DEPLOY, DEPLOYING, DEPLOYED, FAILED`

This means the backend only accepts these workflow states:

- `CONFIGURED`
- `UI_GENERATED`
- `CODE_GENERATED`
- `READY_TO_DEPLOY`
- `DEPLOYING`
- `DEPLOYED`
- `FAILED`

But the caller is sending a different value.

### Issue B: deployment flow and workflow state are being mixed

`workflow_state` for the API/project is being confused with deployment-attempt status.

These must stay separate.

---

## Required behavior

### Workflow state (project/API level)

Allowed values:

- `CONFIGURED`
- `UI_GENERATED`
- `CODE_GENERATED`
- `READY_TO_DEPLOY`
- `DEPLOYING`
- `DEPLOYED`
- `FAILED`

### Deployment status (per deployment attempt)

This should be tracked separately in the deployment record, for example:

- `PENDING`
- `IN_PROGRESS`
- `SUCCESS`
- `FAILED`

### Correct state transitions

When deployment starts:

- create deployment record
- set `workflow_state = DEPLOYING`

When deployment succeeds:

- set deployment record status to success
- set `workflow_state = DEPLOYED`

When deployment fails:

- set deployment record status to failed
- set `workflow_state = FAILED`

Do **not** use unsupported workflow state values such as:

- `DEPLOY_FAILED`
- `ERROR`
- `BUILD_FAILED`
- `SUCCESS`
- `READY`

unless the backend enum is intentionally changed everywhere.

---

## Tasks

1. Inspect the backend route handling for:
   - `PATCH /api/apis/:apiId/workflow-state`
   - deployment creation
   - deployment update / retry / status flows

2. Find the backend enum/type/source of truth for `workflow_state`

3. Verify whether backend validation is correct and whether any backend service is also sending/assuming invalid workflow state values

4. Ensure backend uses the correct canonical workflow state values only:
   - `DEPLOYING`
   - `DEPLOYED`
   - `FAILED`

5. Keep deployment record status separate from API workflow state

6. If shared types/constants exist, centralize workflow state values there

7. Improve backend error messaging if invalid workflow state is received

---

## What to inspect

- `src/controllers/api.controller.ts`
- `src/controllers/deployment.controller.ts`
- `src/services/api.service.ts`
- `src/services/deployment.service.ts`
- workflow state enum/type definitions
- deployment status enum/type definitions
- DTO validation for workflow-state patch
- any shared constants used by both frontend/backend

---

## Expected output

1. Root cause of the invalid workflow state error
2. Exact invalid value being sent or assumed
3. Files to change
4. Exact code patch
5. Corrected workflow state / deployment status model
6. Verification steps

---

## Constraints

- Do not invent new workflow state values unless intentionally updating backend schema, validation, and all consumers
- Keep backward compatibility where possible
- Do not blur workflow state and deployment attempt status
- Do not stop at analysis only; produce the actual patch

---

## Acceptance criteria

- Backend accepts only canonical workflow states
- Deployment failure maps to `workflow_state = FAILED`
- Deployment success maps to `workflow_state = DEPLOYED`
- Deployment start maps to `workflow_state = DEPLOYING`
- Deployment attempt status remains separate from workflow state
- Invalid workflow state errors are eliminated for normal deployment flows
