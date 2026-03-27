> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: DOM-002
- Title: Review Center
- Status: Binding
- Owner: Product architecture and operations architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated review-center document
- Approved by: User directive, ADR-0023 and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-policy-matrix.md`
- Related domains:
  - review center
  - work items
  - notifications
  - activity
- Related code areas:
  - `packages/domain-review-center/*`
  - `packages/domain-core/*`
  - `apps/desktop-web/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/policies/document-review-and-economic-decision-policy.md`
  - `docs/ui/WORKBENCH_CATALOG.md`

# Purpose

Definiera review center som det gemensamma bounded contextet för blockerande beslutsfall som kräver mänsklig granskning innan pengarisk, complianceutfall eller kritiska dataförändringar får gå vidare.

# Scope

Omfattar:

- review items
- queues
- ownership
- SLA
- decisions
- escalation
- related-object context

Omfattar inte:

- generella notifications
- activity feed
- vanliga to do-uppgifter utan reviewbeslut

# Roles

- operator
- reviewer
- queue owner
- domain approver
- backoffice escalator

# Source of truth

`review-center` är source of truth för review item-status, assignment, decision och escalation. Källdomänen fortsätter vara source of truth för sakobjektet.

# Object model

## ReviewItem

Fält:

- `review_item_id`
- `review_type`
- `source_domain`
- `source_object_id`
- `risk_class`
- `queue_id`
- `status`
- `required_decision_type`
- `created_at`
- `sla_due_at`

## ReviewDecision

Fält:

- `review_decision_id`
- `review_item_id`
- `decision_code`
- `decided_by`
- `decided_at`
- `reason_code`
- `note`

## ReviewAssignment

Fält:

- `review_assignment_id`
- `review_item_id`
- `assigned_user_id`
- `assigned_team_id`
- `assigned_at`

# State machines

## ReviewItem

- `open`
- `claimed`
- `in_review`
- `waiting_input`
- `approved`
- `rejected`
- `escalated`
- `closed`

# Commands

- `create_review_item`
- `claim_review_item`
- `reassign_review_item`
- `request_more_input`
- `approve_review_item`
- `reject_review_item`
- `escalate_review_item`
- `close_review_item`

# Events

- `review_item_created`
- `review_item_claimed`
- `review_item_approved`
- `review_item_rejected`
- `review_item_escalated`
- `review_item_closed`

# Cross-domain dependencies

- documents skapar review items för låg confidence eller personpåverkan
- VAT skapar review items för osäkra momsfall
- import cases skapar review items för ofullständiga case
- payroll och HUS kan skapa review items för högrisk- eller blockerade fall

# Forbidden couplings

- källdomän får inte själv markera review item som avgjord utan review-center-kommandon
- UI får inte skapa egna oauktoriserade reviewstatusar

# Search ownership

Search får indexera review items men äger inte deras status eller beslut.

# UI ownership

Desktop-web äger operatörsarbetsytan för review center. Backoffice får läsa och eskalera men inte ersätta ordinarie reviewflöde.

# Permissions

- review actions styrs av queue, risk class och SoD-policy
- högriskgodkännanden kan kräva dual signoff eller domänägare

# Failure and conflict handling

- dubbla claims ska nekas eller återföras kontrollerat
- decision på redan stängt item ska nekas
- source-object mutation utan nytt review outcome ska flaggas

# Notifications/activity/work-item interaction

- work-item kan bära ansvar och deadline för review item
- notification får signalera nytt eller försenat reviewfall
- activity loggar reviewhistoriken

# API implications

- read/write API för review queues, items, decisions och assignments
- bulk actions kräver särskilda policykontroller

# Worker/job implications where relevant

- SLA monitors och reminder-jobs körs i worker
- auto-close av föråldrade items får bara ske där policy tillåter

# Projection/read-model requirements

- queue projections
- per-user worklist
- aging/SLA dashboards

# Test implications

- claim/reassign conflicts
- review decisions
- escalation
- high-risk signoff rules

# Exit gate

- [ ] review center finns som eget bounded context
- [ ] queues, decisions och assignments ägs inte längre av splittrade lokala köer
- [ ] desktop-workbench kan byggas ovanpå stabil domänmodell

