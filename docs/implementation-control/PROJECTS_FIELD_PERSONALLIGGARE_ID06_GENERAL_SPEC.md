# PROJECTS_FIELD_PERSONALLIGGARE_ID06_GENERAL_SPEC

Status: Fullständig omskriven och bindande specifikation för generell projects/operations-kärna med vertikala packs för field, personalliggare, egenkontroll och ID06.

## Icke-förhandlingsbara regler

1. `projects` är generell verksamhetsmotor, inte byggmotor.
2. Konsultbolag, byråer, servicebolag, installation, drift, interna projekt, återkommande uppdrag och fältbolag ska alla kunna använda samma project core.
3. Work orders och service orders är valbara operationsobjekt; de är inte obligatoriska i every project.
4. Field, personalliggare, egenkontroll och ID06 ligger som vertikala packs ovanpå general core.
5. Time, attendance och ID06 är tre olika sanningar:
   - `time` = ersättnings- eller faktureringsgrundande arbete
   - `attendance` = lag- eller kontrollstyrd närvarologg
   - `id06` = identitets- och access/verifieringskedja
6. Project profitability måste fungera både med och utan field/order-objekt.
7. Offline/sync/conflict är backendförmågor, inte mobiltrick.

## General project core

## Object model

### Project

- `projectId`
- `companyId`
- `projectTypeCode`
- `name`
- `customerId` optional
- `contractModelCode`
- `profitabilityModelCode`
- `status`
- `startDate`
- `targetEndDate`
- `currencyCode`
- `dimensionSet`
- `industryPackCodes[]`

Supported `projectTypeCode`:

- `client_delivery`
- `retainer`
- `internal`
- `service_contract`
- `installation`
- `maintenance`
- `construction`
- `campaign`
- `support_program`

State: `draft -> active -> on_hold -> completed -> financially_closed -> archived`

### Engagement

An engagement is the commercial execution layer inside a project.

- `engagementId`
- `projectId`
- `engagementTypeCode`
- `billingModelCode`
- `priceBasis`
- `serviceWindow`
- `status`

State: `draft -> active -> completed -> closed`

### WorkModel

Defines how work is represented in the project.

- `workModelId`
- `projectId`
- `workModelCode`
- `requiresOperationalCase`
- `requiresDispatch`
- `requiresFieldEvidence`
- `requiresCustomerSignature`
- `requiresAttendancePack`
- `requiresId06Pack`

Supported `workModelCode`:

- `time_only`
- `milestone_only`
- `retainer_capacity`
- `subscription_service`
- `service_order`
- `work_order`
- `construction_stage`
- `internal_delivery`

### WorkPackage

- `workPackageId`
- `projectId`
- `engagementId`
- `name`
- `scopeCode`
- `budgetRef`
- `status`
- `plannedStart`
- `plannedEnd`

State: `draft -> approved -> in_progress -> completed -> closed`

### DeliveryMilestone

- `deliveryMilestoneId`
- `projectId`
- `engagementId`
- `label`
- `billingTriggerCode`
- `plannedDate`
- `actualDate`
- `status`

State: `planned -> reached -> invoiced -> closed`

### WorkLog

- `workLogId`
- `projectId`
- `engagementId`
- `workPackageId` optional
- `employmentId`
- `sourceTypeCode` (`time_entry`, `field_completion`, `manual_adjustment`)
- `workDate`
- `hours`
- `quantity`
- `billableFlag`
- `costAllocatableFlag`
- `status`

State: `draft -> approved -> costed -> billed | consumed`

### CostAllocation

- `costAllocationId`
- `projectId`
- `sourceTypeCode`
- `sourceObjectRef`
- `costClassCode`
- `amount`
- `currency`
- `dimensionSet`
- `status`

Supported `costClassCode`:

- `direct_labor`
- `subcontractor`
- `material`
- `equipment`
- `travel`
- `overhead`
- `adjustment`

State: `proposed -> approved -> posted | corrected`

### RevenuePlan

- `revenuePlanId`
- `projectId`
- `billingModelCode`
- `plannedRevenue`
- `recognitionBasisCode`
- `status`

State: `draft -> approved -> active -> superseded`

### ProfitabilitySnapshot

- `profitabilitySnapshotId`
- `projectId`
- `periodKey`
- `recognizedRevenue`
- `invoicedRevenue`
- `collectedRevenue`
- `directLaborCost`
- `subcontractorCost`
- `materialCost`
- `equipmentCost`
- `travelCost`
- `overheadCost`
- `husAdjustmentAmount`
- `wipAmount`
- `marginAmount`
- `marginPercent`
- `status`

State: `draft -> materialized -> superseded`

### ProjectDeviation

- `projectDeviationId`
- `projectId`
- `deviationTypeCode`
- `severity`
- `message`
- `status`

State: `open -> acknowledged -> resolved | waived`

### ProjectEvidenceBundle

- `projectEvidenceBundleId`
- `projectId`
- `evidenceRefs[]`
- `scopeCode`
- `status`

State: `open -> frozen -> archived`

## Source of truth

- Project commercial truth: `Project`, `Engagement`, `RevenuePlan`
- Work execution truth: `WorkLog` or operational cases depending on work model
- Profitability truth: `ProfitabilitySnapshot` as read-model derived from cost/revenue events
- Field truth: operational cases and field evidence
- Attendance truth: personalliggare pack
- ID06 truth: ID06 pack
- None of the vertical packs may redefine project commercial model

## When work orders/service orders are required

### Work orders are required when all are true

- onsite or dispatch-driven work exists
- task completion needs route/assignment lifecycle
- material withdrawals or customer signature are part of execution

### Service orders are required when

- recurring or ad hoc service jobs must be scheduled, assigned and closed operationally
- service asset/customer site context matters

### Work orders/service orders are not required when

- project is time-only consulting
- project is bureau/capacity/retainer
- project is internal delivery
- project is milestone-only without dispatch

## Generic work model rules

### time_only

- uses `WorkLog`
- no operational case required
- profitability from payroll/time allocation + invoices

### milestone_only

- uses `DeliveryMilestone`
- may have optional work packages
- no operational case required

### retainer_capacity

- uses `Engagement` + `WorkLog`
- billing follows subscription or capacity terms
- profitability tracks delivered vs contracted capacity

### subscription_service

- recurring commitments with service window
- operational case optional
- useful for managed service and support programs

### service_order

- operational case required
- dispatch optional or required by service window
- ideal for service, maintenance, repair, installation follow-up

### work_order

- operational case required
- dispatch and field evidence typically required
- ideal for field execution, installation and construction site tasks

### construction_stage

- combines work packages, field pack, change control, HUS or personalliggare where relevant
- still uses same core project objects

## Project profitability model

### Formula

`recognizedRevenue - directLaborCost - subcontractorCost - materialCost - equipmentCost - travelCost - overheadCost +/- husAdjustmentAmount +/- approvedAdjustments`

### Required revenue sources

- invoices
- milestone recognitions
- retainer period recognition
- approved manual adjustment with audit

### Required cost sources

- payroll cost allocations
- AP lines allocated to project
- material usage
- subcontractor purchase allocations
- travel claims allocated to project
- overhead allocations from approved rulepack

### Required output dimensions

- project
- engagement
- work package optional
- customer optional
- business unit
- cost center
- service line

## Commands

### Project core

- `createProject`
- `activateProject`
- `createEngagement`
- `approveRevenuePlan`
- `createWorkModel`
- `createWorkPackage`
- `approveWorkPackage`
- `recordWorkLog`
- `approveWorkLog`
- `approveCostAllocation`
- `materializeProfitabilitySnapshot`
- `recordProjectDeviation`
- `closeProjectFinancially`

### Operational case layer

- `createOperationalCase`
- `assignDispatch`
- `acceptDispatch`
- `startOperationalCase`
- `recordMaterialUsage`
- `captureFieldEvidence`
- `captureCustomerSignature`
- `completeOperationalCase`
- `markOperationalCaseInvoiceReady`

## Events

### Project core

- `project.created`
- `project.activated`
- `project.engagement.created`
- `project.work_model.created`
- `project.work_package.approved`
- `project.work_log.approved`
- `project.cost_allocation.approved`
- `project.profitability.materialized`
- `project.deviation.opened`
- `project.financially_closed`

### Operational layer

- `operations.case.created`
- `operations.dispatch.assigned`
- `operations.dispatch.accepted`
- `operations.case.started`
- `operations.material.recorded`
- `operations.evidence.captured`
- `operations.signature.captured`
- `operations.case.completed`
- `operations.case.invoice_ready`

## Vertical packs

## Field pack

### Purpose

Adds dispatch, routeable operational cases, material capture, evidence capture, signature and offline sync to the general core.

### Field objects

- `OperationalCase`
- `DispatchAssignment`
- `MaterialReservation`
- `MaterialUsage`
- `FieldEvidence`
- `SignatureRecord`
- `SyncEnvelope`
- `ConflictRecord`

### OperationalCase

- `operationalCaseId`
- `projectId`
- `engagementId`
- `caseTypeCode` (`service_order`, `work_order`, `inspection`, `installation_visit`, `maintenance_visit`)
- `customerSiteRef`
- `assetRef` optional
- `status`
- `invoiceReadyFlag`

State: `draft -> planned -> dispatched -> in_progress -> completed -> invoice_ready -> closed`

### DispatchAssignment

State: `created -> accepted -> en_route -> on_site -> completed | failed | cancelled`

### MaterialUsage

State: `draft -> captured -> approved -> costed -> billed | corrected`

### FieldEvidence

State: `captured -> approved -> linked -> archived`

### SignatureRecord

State: `pending -> captured -> verified -> rejected`

### Offline/sync/conflict

Every mobile mutation must carry:

- `clientMutationId`
- `deviceId`
- `expectedObjectVersion`
- `clientTimestamp`
- `surfaceCode`

Server response must be one of:

- `accepted`
- `rejected`
- `conflicted`
- `superseded`

Rules:

1. No server-side last-write-wins for regulated, costed or invoice-ready objects.
2. Conflict creates `ConflictRecord`.
3. Invoice-ready is blocked while any linked conflict is open.
4. Sync receipt is mandatory before field action is considered durable.

## Personalliggare pack

### Purpose

Adds workplace, attendance obligations, corrections and exports without forcing all projects to be construction projects.

### Pack objects

- `Workplace`
- `WorkplaceRegistration`
- `AttendanceIdentitySnapshot`
- `EmployerSnapshot`
- `AttendanceEvent`
- `AttendanceCorrection`
- `AttendanceExport`
- `KioskDevice`
- `IndustryPackActivation`

### Workplace

- `workplaceId`
- `projectId` optional
- `workplaceTypeCode`
- `industryPackCode`
- `name`
- `address`
- `responsiblePartyRef`
- `status`

Supported `workplaceTypeCode`:

- `customer_site`
- `construction_site`
- `service_site`
- `internal_facility`
- `temporary_site`

State: `draft -> active -> inactive -> archived`

### AttendanceEvent

- `attendanceEventId`
- `workplaceId`
- `personRef`
- `employerSnapshotId`
- `eventTypeCode`
- `occurredAt`
- `sourceChannelCode`
- `deviceTrustRef`
- `status`

State: `recorded -> exported | corrected | rejected`

Rules:

1. Attendance event is append-only.
2. Correction creates new `AttendanceCorrection` plus corrected successor event.
3. Attendance is not payroll time and not billing time.
4. Industry pack controls threshold, registration and export semantics.

## Industry packs

### General rule

An industry pack may add:

- threshold rules
- registration requirements
- export format
- mandatory identity fields
- mandatory evidence
- pack-specific blockers

### Construction pack

Adds:

- threshold based on official construction rules
- pre-start registration requirement
- builder/main contractor snapshots
- electronic attendance export chain

### Other future packs

May add service-sector or other regulated attendance obligations without changing project core.

## ID06 pack

### Purpose

Adds identity graph, card validation, employer linkage and workplace binding for cases where ID06 is required or commercially valuable.

### ID06 objects

- `Id06CompanyVerification`
- `Id06PersonVerification`
- `Id06CardStatus`
- `Id06EmployerLink`
- `Id06WorkplaceBinding`
- `Id06AttendanceMirror`
- `Id06EvidenceBundle`

### Identity graph rules

1. Person identity, employer identity and workplace binding are distinct nodes.
2. ID06 validation never rewrites attendance history.
3. ID06 result may block access-dependent action but not destroy already recorded audit evidence.
4. ID06 card status and employer link are stored with effective dates.

### ID06 state examples

- `Id06CompanyVerification`: `requested -> verified | failed | expired`
- `Id06PersonVerification`: `requested -> verified | failed | expired`
- `Id06CardStatus`: `unknown -> active | inactive | blocked | expired`
- `Id06WorkplaceBinding`: `pending -> active -> suspended -> revoked`

## Egenkontroll pack

### Purpose

Adds checklist, evidence and signoff to operational execution and project quality.

### Objects

- `ChecklistTemplate`
- `ChecklistInstance`
- `ChecklistResponse`
- `ChecklistSignoff`

Rules:

- checklist evidence is versioned
- signoff may gate invoice-ready or project milestone
- checklist pack does not own project profitability or payroll

## Coupling rules

### Projects to payroll

- payroll never reads field objects directly
- payroll cost allocation consumes approved `WorkLog` and approved allocation facts
- attendance events never create payroll pay automatically

### Projects to AR and billing

- invoice suggestions may consume:
  - approved milestones
  - approved work logs
  - invoice-ready operational cases
- field completion alone does not issue invoice automatically

### Projects to AP

- AP lines may allocate material/subcontractor/equipment cost to project
- AP import approval is required before cost hits profitability

### Projects to HUS

- HUS is optional overlay for eligible AR invoices
- project core never assumes HUS
- HUS decisions affect profitability only through approved adjustment event

### Projects to compliance/export/evidence

- personalliggare export consumes attendance pack
- ID06 verification consumes ID06 pack
- evidence bundle may aggregate project, field, checklist and submission receipts

## Permission boundaries

### Project manager

May manage project core, engagements, budgets, profitability and non-regulated closures.

### Operations coordinator

May manage operational cases and dispatch.

### Field operator

May execute assigned field tasks, evidence capture and sync.

### Personalliggare operator

May manage workplaces, attendance corrections and exports in granted scope.

### ID06 coordinator

May run verification and manage workplace bindings.

None of these roles may post to ledger or submit regulated filings unless separately granted.

## API contracts

### Project core routes

- `POST /v1/projects`
- `GET /v1/projects`
- `GET /v1/projects/:projectId`
- `POST /v1/projects/:projectId/activate`
- `POST /v1/projects/:projectId/engagements`
- `POST /v1/projects/:projectId/work-models`
- `POST /v1/projects/:projectId/work-packages`
- `POST /v1/projects/:projectId/profitability/materialize`

### Operational routes

- `POST /v1/operations/cases`
- `GET /v1/operations/cases`
- `POST /v1/operations/cases/:operationalCaseId/dispatch`
- `POST /v1/operations/cases/:operationalCaseId/start`
- `POST /v1/operations/cases/:operationalCaseId/materials`
- `POST /v1/operations/cases/:operationalCaseId/evidence`
- `POST /v1/operations/cases/:operationalCaseId/signature`
- `POST /v1/operations/cases/:operationalCaseId/complete`

### Workplace/personalliggare routes

- `POST /v1/workplaces`
- `GET /v1/workplaces`
- `POST /v1/workplaces/:workplaceId/registrations`
- `POST /v1/workplaces/:workplaceId/attendance-events`
- `POST /v1/workplaces/:workplaceId/attendance-events/:attendanceEventId/correct`
- `POST /v1/workplaces/:workplaceId/exports`

### ID06 routes

- `POST /v1/id06/companies/verify`
- `POST /v1/id06/persons/verify`
- `POST /v1/id06/cards/validate`
- `POST /v1/id06/workplaces/:workplaceId/bindings`

## What is required to beat field/build competitors without making the whole product construction-centric

1. General project core must work without work orders.
2. Field pack must be optional but first-class.
3. Construction pack must add strong personalliggare, ID06 and evidence features without polluting general project semantics.
4. Profitability must combine payroll, AP, materials, HUS and billing in one model.
5. Offline/sync/conflict must be backend-first and auditable.
6. Multi-contractor reality must be modelled through workplace, employer snapshots and ID06 identity graph, not by forcing every project to be a construction site.

## Golden scenarios

Minimum:

1. Consulting project with only time and milestones.
2. Retainer/service program with recurring capacity.
3. Field service order with dispatch and signature.
4. Construction workplace with personalliggare and ID06.
5. Project profitability after payroll, AP, field and HUS adjustments.

## Exit gate

- [ ] Projects is a genuine general core.
- [ ] Work orders/service orders are optional operational packs, not universal assumptions.
- [ ] Field, personalliggare, egenkontroll and ID06 are layered packs.
- [ ] Profitability works for consulting, service, internal and field companies.
- [ ] Construction strength is preserved without making the entire product construction-centric.