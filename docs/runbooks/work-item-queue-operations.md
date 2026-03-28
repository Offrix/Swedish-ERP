# Work Item Queue Operations

## Scope

This runbook covers operational work-item queues exposed through:

- `GET /v1/work-items`
- `GET /v1/work-items/queues`
- `POST /v1/work-items/:workItemId/claim`
- `POST /v1/work-items/:workItemId/assign`
- `POST /v1/work-items/:workItemId/escalate`
- `POST /v1/work-items/:workItemId/dual-approve`
- `POST /v1/work-items/:workItemId/resolve`

## Queue access model

- Queue-managed visibility is always enforced server-side.
- If a queue has explicit object grants of type `operational_queue`, that queue becomes grant-managed.
- Grant-managed queues are closed-world:
  - direct assignee can see the item
  - explicitly granted company users can see the item
  - team fallback alone is not enough
- If a queue has no explicit grants, visibility falls back to owner team and direct assignee.

## Operator actions

### Claim

- Claim moves the item to `acknowledged` unless already acknowledged.
- Claim stamps:
  - `ownerCompanyUserId`
  - `claimedByCompanyUserId`
  - `claimedAt`

### Assign

- Assignment requires either `ownerCompanyUserId` or `ownerTeamId`.
- Assignment resets active claim ownership and reopens the item to `open`.
- For grant-managed queues:
  - assigning to a company user requires an explicit queue grant
  - assigning to a different team is blocked unless the queue is not grant-managed

### Escalate

- Escalation moves the item to `escalated`.
- Escalation increments `escalationCount`.
- Escalation stores:
  - `lastEscalatedAt`
  - `lastEscalationReasonCode`
  - `metadataJson.latestEscalationNote` when supplied

### Dual control

- `blockerScope=dual_control` or `metadataJson.dualControlRequired=true` creates a dual-control gate.
- Dual-control items cannot be resolved until a separate actor approves them.
- The same company user cannot:
  - hold the active execution ownership
  - approve the dual-control gate
  - resolve the same item

### Resolve

- Resolve is blocked for dual-control items until `dualControlStatus=approved`.
- Resolve stores:
  - `resolutionCode`
  - `completionNote`
  - `resolvedAt`
  - `resolvedByCompanyUserId`

## Queue summary interpretation

`GET /v1/work-items/queues` returns per-queue operator summaries:

- `queueGrantManaged`
- `queueGrantCompanyUserIds`
- `openCount`
- `acknowledgedCount`
- `escalatedCount`
- `blockedCount`
- `waitingExternalCount`
- `unresolvedCount`
- `overdueCount`
- `dualControlBlockedCount`
- `claimedCount`
- `assignedCount`
- `totalEscalationCount`
- `oldestOpenAgeMinutes`
- `oldestOpenAgeHours`
- `slaDueAt`

## Verification

Run:

```powershell
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\unit\phase17-operational-work-item-visibility.test.mjs
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\integration\phase17-backoffice-ops-api.test.mjs
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\integration\api-route-metadata.test.mjs
```

Expected:

- explicit queue grants override pure team fallback
- grant-managed queues are visible in `/v1/work-items/queues`
- assignment rejects ungranted targets on grant-managed queues
- escalation updates queue metrics
- dual-control approval requires a different actor than the executor
