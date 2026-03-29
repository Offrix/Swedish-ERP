> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# PERMISSION_AND_ACTION_CLASS_MATRIX

Status: Bindande server-side permission- och actionmatris för desktop, field mobile, backoffice, public/auth, public API och partner API.

## Global enforcement rules

1. Alla beslut om åtkomst fattas server-side.
2. UI, search och cached read-models får aldrig själva vara auktorisering.
3. Varje action tilldelas:
   - `actionClass`
   - `requiredTrustLevel`
   - `requiredRoleFamilies`
   - `allowedSurfaces`
   - `scopeRequirement`
   - `stepUpRequirement`
   - `dualControlRequirement`
   - `auditClass`
   - `receiptRequirement`
4. Support och backoffice får inte använda vanliga tenantroller som genväg.
5. Break-glass är egen trustnivå och egen auditklass.
6. Samma person får inte både initiera och ensam godkänna högriskaction när SoD krävs.

## Trust levels

- `TL0_PUBLIC` — oautentiserad
- `TL1_AUTHENTICATED` — vanlig inloggning
- `TL2_STRONG_AUTH` — stark auth med MFA/passkey/BankID enligt policy
- `TL3_PRIVILEGED` — stark auth + privileged role
- `TL4_DUAL_CONTROL` — privileged role + andra godkännare krävs
- `TL5_BREAK_GLASS` — tidsbegränsad incidentaccess med separat approval chain

## Role families

### Tenant roles

- `tenantAdmin`
- `financeOperator`
- `financeApprover`
- `payrollOperator`
- `payrollApprover`
- `complianceOfficer`
- `projectManager`
- `operationsCoordinator`
- `fieldOperator`
- `personalliggareOperator`
- `id06Coordinator`
- `documentReviewer`
- `bureauOperator`

### Support and backoffice roles

- `supportOperator`
- `supportLead`
- `backofficeAdmin`
- `securityAdmin`
- `incidentOperator`
- `auditOperator`

### External principals

- `publicApiClient`
- `partnerConnectionPrincipal`

## Scope families

- `tenantScope`
- `companyScope`
- `teamScope`
- `queueScope`
- `objectScope`
- `selfScope`
- `supportCaseScope`
- `incidentScope`

## Action classes

### AC-READ-GENERAL

- Required trust level: `TL1_AUTHENTICATED`
- Allowed roles: all tenant roles, support roles in approved scope
- Allowed surfaces: desktop, field mobile, backoffice
- Typical actions:
  - read lists
  - open permitted profiles
  - read notifications
- Audit class: `read_general` only when policy requires
- Receipt requirement: none

### AC-READ-SENSITIVE

- Required trust level: `TL2_STRONG_AUTH`
- Allowed roles: finance, payroll, compliance, support in approved support case
- Allowed surfaces: desktop, backoffice
- Typical actions:
  - read payroll details
  - read benefits with personal data
  - read tax account
- Audit class: `read_sensitive`
- Receipt requirement: none

### AC-EDIT-NONREGULATED

- Required trust level: `TL2_STRONG_AUTH`
- Allowed roles:
  - tenantAdmin
  - financeOperator
  - projectManager
  - operationsCoordinator
- Allowed surfaces: desktop
- Typical actions:
  - create project
  - edit non-posted work objects
  - edit draft setup
- Audit class: `change_nonregulated`
- Receipt requirement: mutation receipt

### AC-EDIT-REGULATED-DRAFT

- Required trust level: `TL2_STRONG_AUTH`
- Allowed roles:
  - financeOperator
  - payrollOperator
  - complianceOfficer
- Allowed surfaces: desktop
- Typical actions:
  - edit draft VAT return
  - edit draft HUS claim before lock
  - edit draft annual package
  - edit draft pay run inputs
- Audit class: `change_regulated_draft`
- Receipt requirement: mutation receipt

### AC-APPROVE-FINANCIAL

- Required trust level: `TL3_PRIVILEGED`
- Allowed roles:
  - financeApprover
  - payrollApprover
  - complianceOfficer
- Allowed surfaces: desktop
- Step-up requirement: yes
- Dual control requirement: object creator cannot self-approve when SoD flagged
- Typical actions:
  - approve AP import case
  - approve pay run
  - approve HUS lock
  - approve module activation
- Audit class: `approval_financial`
- Receipt requirement: approval receipt

### AC-POST-TO-LEDGER

- Required trust level: `TL3_PRIVILEGED`
- Allowed roles:
  - financeApprover
  - payrollApprover for payroll posting preview approval only
- Allowed surfaces: desktop
- Step-up requirement: yes
- Dual control requirement: yes for manual journals, reversals, corrections
- Audit class: `ledger_posting`
- Receipt requirement: journal receipt

### AC-SUBMIT-REGULATED

- Required trust level: `TL4_DUAL_CONTROL`
- Allowed roles:
  - complianceOfficer
  - financeApprover
  - payrollApprover
- Allowed surfaces: desktop, backoffice for repair-only
- Step-up requirement: mandatory
- Dual control requirement: mandatory
- Typical actions:
  - submit AGI
  - submit VAT
  - submit HUS
  - submit annual report
  - submit declaration package
- Audit class: `regulated_submission`
- Receipt requirement: submission receipt + technical receipt tracking

### AC-CORRECT-LOCKED

- Required trust level: `TL4_DUAL_CONTROL`
- Allowed roles:
  - financeApprover
  - payrollApprover
  - complianceOfficer
- Allowed surfaces: desktop, backoffice
- Step-up requirement: mandatory
- Dual control requirement: mandatory
- Typical actions:
  - reverse journal in locked period by approved chain
  - issue AGI correction
  - create HUS correction or recovery
  - reopen close package
- Audit class: `regulated_correction`
- Receipt requirement: correction receipt

### AC-SECURITY-ADMIN

- Required trust level: `TL4_DUAL_CONTROL`
- Allowed roles:
  - securityAdmin
  - backofficeAdmin for non-identity-specific parts only
- Allowed surfaces: backoffice
- Step-up requirement: mandatory
- Dual control requirement: mandatory for secret rotation, break-glass approval, impersonation approval
- Audit class: `security_admin`
- Receipt requirement: security action receipt

### AC-SUPPORT-IMPERSONATION

- Required trust level: `TL4_DUAL_CONTROL`
- Allowed roles:
  - supportOperator for request
  - supportLead or securityAdmin for approval
- Allowed surfaces: backoffice
- Step-up requirement: mandatory
- Dual control requirement: mandatory
- Audit class: `support_impersonation`
- Receipt requirement: impersonation session receipt

### AC-BREAK-GLASS

- Required trust level: `TL5_BREAK_GLASS`
- Allowed roles:
  - incidentOperator request
  - securityAdmin + second approver approve
- Allowed surfaces: backoffice
- Audit class: `break_glass`
- Receipt requirement: break-glass activation receipt and closure receipt

### AC-REPLAY-HIGH-RISK

- Required trust level: `TL4_DUAL_CONTROL`
- Allowed roles:
  - backofficeAdmin
  - incidentOperator
  - supportLead only within approved support case
- Allowed surfaces: backoffice
- Step-up requirement: mandatory
- Dual control requirement: mandatory when replay touches regulated submissions, bank exports or external notifications
- Audit class: `replay_high_risk`
- Receipt requirement: replay plan receipt and replay execution receipt

### AC-EXTERNAL-CLIENT

- Required trust level: token-based
- Allowed roles: `publicApiClient`
- Allowed surfaces: public API only
- Scope requirement: granted OAuth scopes + company match + mode match
- Audit class: `external_client_access`
- Receipt requirement: standard request receipt only on mutating control-plane calls

### AC-PARTNER-INGRESS

- Required trust level: signed partner principal
- Allowed roles: `partnerConnectionPrincipal`
- Allowed surfaces: partner ingress only
- Scope requirement: connection binding + provider mode + signature verification
- Audit class: `partner_ingress`
- Receipt requirement: ingress receipt

## Action-to-role mapping

### Tenant admin

Allowed action classes:

- `AC-READ-GENERAL`
- `AC-READ-SENSITIVE`
- `AC-EDIT-NONREGULATED`
- `AC-EDIT-REGULATED-DRAFT`
- `AC-APPROVE-FINANCIAL` only for setup/module activation, not for payroll/VAT/HUS/AGI submissions unless also granted domain approver role

### Finance operator

Allowed action classes:

- `AC-READ-GENERAL`
- `AC-READ-SENSITIVE`
- `AC-EDIT-NONREGULATED`
- `AC-EDIT-REGULATED-DRAFT`

Denied classes:

- `AC-POST-TO-LEDGER`
- `AC-SUBMIT-REGULATED`
- `AC-CORRECT-LOCKED`

### Finance approver

Allowed action classes:

- all finance operator classes
- `AC-APPROVE-FINANCIAL`
- `AC-POST-TO-LEDGER`
- `AC-CORRECT-LOCKED` for finance-owned objects
- `AC-SUBMIT-REGULATED` for VAT/HUS/annual packages when compliance policy permits

### Payroll operator

Allowed action classes:

- `AC-READ-GENERAL`
- `AC-READ-SENSITIVE`
- `AC-EDIT-NONREGULATED`
- `AC-EDIT-REGULATED-DRAFT`

Denied:

- final AGI submit
- final pay run approval
- locked correction

### Payroll approver

Allowed:

- payroll operator classes
- `AC-APPROVE-FINANCIAL` for pay runs
- `AC-POST-TO-LEDGER` for payroll posting approval
- `AC-SUBMIT-REGULATED` for AGI
- `AC-CORRECT-LOCKED` for payroll correction

### Compliance officer

Allowed:

- `AC-READ-SENSITIVE`
- `AC-EDIT-REGULATED-DRAFT`
- `AC-APPROVE-FINANCIAL`
- `AC-SUBMIT-REGULATED`
- `AC-CORRECT-LOCKED`

Denied:

- support impersonation
- break-glass

### Project manager

Allowed:

- `AC-READ-GENERAL`
- `AC-EDIT-NONREGULATED`
- `AC-APPROVE-FINANCIAL` only for project budgets and operational closures, never for regulated submissions

### Operations coordinator

Allowed:

- `AC-READ-GENERAL`
- `AC-EDIT-NONREGULATED`
- field dispatch, work order lifecycle, sync conflict resolution

### Field operator

Allowed surfaces: field mobile
Allowed actions:
- read own assigned work
- start/complete own assignments
- capture materials, photos, signatures
- submit sync envelopes
Denied:
- approval, posting, submissions, backoffice actions

### Personalliggare operator

Allowed:
- workplace registration maintenance
- attendance correction request
- export initiation where policy permits
Denied:
- support actions
- payroll approval

### ID06 coordinator

Allowed:
- company/person/card verification
- workplace bindings
Denied:
- modify attendance history directly

### Support operator

Allowed:
- `AC-READ-GENERAL` and `AC-READ-SENSITIVE` only within approved support case scope
- request impersonation
- execute low-risk diagnostics in approved support case

Denied:
- direct customer data broad search
- regulated submissions
- posting
- break-glass approval

### Support lead

Allowed:
- all support operator rights
- approve support actions
- approve limited impersonation
- request replay plans

Denied:
- secret rotation
- break-glass alone

### Backoffice admin

Allowed:
- `AC-READ-SENSITIVE`
- `AC-REPLAY-HIGH-RISK`
- selected `AC-SECURITY-ADMIN` non-identity actions with separate security approval

### Security admin

Allowed:
- `AC-SECURITY-ADMIN`
- approve impersonation
- approve break-glass
- rotate secrets
- attestation actions

### Public API client

Allowed only routes and scopes granted in token.
Denied everything else.

### Partner connection principal

Allowed only ingress routes bound to the partner connection and mode.

## Surface restrictions

### Desktop

May host:

- finance
- payroll
- projects
- review
- compliance
- annual reporting

May not host:

- break-glass approval
- raw support impersonation approval without backoffice context

### Field mobile

May host only:

- assigned operational work
- evidence capture
- personalliggare actions approved for field
- ID06 action prompts bound to field workflow

May not host:

- posting
- approvals
- regulated submissions
- support/backoffice actions

### Backoffice

May host:

- support cases
- impersonation
- break-glass
- replay/dead-letter
- feature flags
- security access review

May not host:

- routine customer operations unless through explicit scoped impersonation or approved admin action

### Public/auth surface

May host:

- login
- factor enrollment
- invitation acceptance
- passwordless/passkey flows
- SSO handoff
- BankID handoff

May not host:

- tenant data search
- financial object access

### Public API

May host:

- scoped external reads
- webhook management
- client management by tenant admin

May not host:

- arbitrary object mutation beyond documented control-plane

### Partner API

May host:

- connection operations
- signed ingress
- contract tests
- partner callback handling

May not host:

- broad tenant browsing
- human workflow surfaces

## Step-up mapping

### Mandatory step-up

- module activation of payroll, HUS, annual reporting, personalliggare, ID06
- journal reverse or correct
- pay run approve
- AGI submit
- VAT submit
- HUS submit
- annual report submit
- impersonation start
- break-glass activation
- secret rotation
- replay of regulated submission or payment export

### Step-up not required

- read general lists
- save draft notes
- claim work item
- upload document

## Dual control rules

1. Creator of regulated draft cannot be sole approver.
2. Requester of support impersonation cannot approve the request.
3. Requester of break-glass cannot be one of the two approvers.
4. User who generates migration diff report cannot alone sign off cutover.
5. User who approves pay run cannot alone approve AGI submit for same run when policy flag `strictPayrollSod` is enabled.

## Action denial reasons

Canonical denial reason codes:

- `auth.required`
- `strong_auth.required`
- `scope.denied`
- `role.denied`
- `queue.denied`
- `object.denied`
- `sod.denied`
- `step_up.required`
- `dual_control.required`
- `support_case.required`
- `break_glass.expired`
- `tenant_mode.denied`
- `provider_mode.denied`
- `locked_state.denied`
- `review_pending.denied`

## Audit class mapping

- read sensitive -> `read_sensitive`
- nonregulated change -> `change_nonregulated`
- regulated draft -> `change_regulated_draft`
- financial approval -> `approval_financial`
- ledger post -> `ledger_posting`
- regulated submit -> `regulated_submission`
- correction -> `regulated_correction`
- security admin -> `security_admin`
- impersonation -> `support_impersonation`
- break-glass -> `break_glass`
- replay -> `replay_high_risk`

## Receipt requirement mapping

- no receipt: read-only actions unless policy requires
- mutation receipt: all successful writes
- approval receipt: approvals, signoffs, overrides
- submission receipt: all regulated submissions
- security receipt: impersonation, break-glass, secret rotation
- replay receipt: plan and execution receipts

## Server-side enforcement algorithm

For every request:

1. Resolve principal and surface.
2. Resolve `actionCode`.
3. Resolve `actionClass`.
4. Check trust level.
5. Check allowed role family.
6. Check surface eligibility.
7. Check scope eligibility.
8. Check object state blockers.
9. Check SoD and dual control.
10. Execute or deny with canonical denial reason.

## Exit gate

- [ ] Every server action maps to one action class.
- [ ] Trust levels, SoD and step-up are explicit.
- [ ] Surface restrictions are locked.
- [ ] Public API and partner API use the same denial and audit semantics.
- [ ] Implementation can enforce permissions without product-side guessing.
