# General Availability Decision

## Purpose

Operational runbook for the final release gate after pilots, parity, advantage release and UI contract freeze are complete.

## Preconditions

- At least one completed pilot execution exists for every required segment:
  - `finance_payroll_ab`
  - `service_project_company`
  - `hus_business`
  - `construction_service_id06`
  - `enterprise_sso_customer`
- Accepted pilot cohorts exist for every required segment.
- Green parity scorecards exist for:
  - `finance_platform`
  - `crm_project_service`
  - `field_vertical`
- A released `AdvantageReleaseBundle` exists.
- A frozen `UiContractFreezeRecord` exists and points to the released advantage bundle.

## Checklist Categories

Every final gate record must carry exactly these checklist items:

- `technical`
- `regulated`
- `support`
- `migration`
- `security`
- `parity`
- `advantage`
- `trial_sales_readiness`

Each item must have:

- explicit `green`, `amber` or `red` status
- operator note when not green
- evidence refs pointing to validation artifacts

`na` is not allowed in the final go-live gate.

## Approval Rule

General availability is allowed only when:

- all linked pilot executions are `completed`
- all linked pilot cohorts are `accepted`
- no required segment is missing
- all required parity categories are green
- the linked advantage bundle is `released`
- the linked UI contract freeze is `frozen`
- every final checklist item is green

Otherwise the gate must still be recorded, but it remains `blocked`.

## Evidence

Every gate must export evidence containing:

- go-live gate manifest
- checklist evidence refs
- related refs to company, pilots, cohorts, parity scorecards, released advantage bundle and frozen UI contract snapshot

## API

- `POST /v1/release/go-live-gates`
- `GET /v1/release/go-live-gates`
- `GET /v1/release/go-live-gates/:goLiveGateRecordId`
- `GET /v1/release/go-live-gates/:goLiveGateRecordId/evidence`
