# DOMAIN_24_IMPLEMENTATION_LIBRARY

## mål

Fas 24 ska bygga den multi-company- och intercompany-kärna som gör att plattformen kan bära flera bolag, interna flöden, treasury och ägarstyrning utan att reduceras till bara flera isolerade tenants.

## bindande tvärdomänsunderlag

- `KONCERN_INTERCOMPANY_OCH_SHARED_SERVICES_BINDANDE_SANNING.md` är obligatorisk canonical source för group hierarchy, intercompany counterparties, settlements, shared-service allocations, treasury visibility och elimination inputs i denna domän.
- `FAKTURAFLODET_BINDANDE_SANNING.md`, `LEVFAKTURAFLODET_BINDANDE_SANNING.md`, `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md` och `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` är obligatoriska canonical sources för seller- och buyertruth som intercompany bygger ovanpa.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` är obligatorisk canonical source för governance receipts, approvals och elimination evidence i denna domän.

## Fas 24

### Delfas 24.1 group hierarchy / multi-company root / route truth

- bygg:
  - `CompanyGroup`
  - `GroupMembership`
  - `IntercompanyPolicy`
  - `GroupGovernanceReceipt`
- state machines:
  - `CompanyGroup: draft -> active | suspended | archived`
- commands:
  - `createCompanyGroup`
  - `addCompanyToGroup`
  - `publishIntercompanyPolicy`
- invariants:
  - bolagsgrupp måste vara first-class och inte härledas löst från tenantlistor
  - canonical route family är `/v1/group/*`
- tester:
  - group hierarchy tests
  - route truth suite

### Delfas 24.2 intercompany counterparties / policy hardening

- bygg:
  - `IntercompanyCounterparty`
  - `IntercompanyAgreement`
  - `IntercompanyPricingPolicy`
  - `IntercompanyApprovalProfile`
- commands:
  - `registerIntercompanyCounterparty`
  - `createIntercompanyAgreement`
  - `approveIntercompanyPricingPolicy`
- invariants:
  - interna relationer måste ha policy, godkännande och prissättningsregel
  - inga cross-company writes utan explicit counterparty relation
- tester:
  - counterparty policy tests
  - approval profile tests

### Delfas 24.3 intercompany order / invoice / settlement hardening

- bygg:
  - `IntercompanyOrder`
  - `IntercompanyInvoice`
  - `IntercompanySettlement`
  - `IntercompanyMismatchCase`
- commands:
  - `createIntercompanyOrder`
  - `issueIntercompanyInvoice`
  - `settleIntercompanyBalance`
  - `openIntercompanyMismatchCase`
- invariants:
  - order, invoice och settlement måste kunna länkas till varandra deterministiskt
  - mismatch måste vara first-class och blockerande för close där policy kräver det
- tester:
  - intercompany lifecycle tests
  - mismatch handling tests

### Delfas 24.4 treasury / cash position / payment governance hardening

- bygg:
  - `TreasuryAccount`
  - `CashPositionSnapshot`
  - `IntercompanyLoan`
  - `TreasuryTransferDecision`
- commands:
  - `materializeCashPositionSnapshot`
  - `createIntercompanyLoan`
  - `approveTreasuryTransfer`
- invariants:
  - treasury actions måste vara explicit owner- och approval-styrda
  - cash position måste vara first-class snapshot, inte bara rapportfråga
- tester:
  - cash position tests
  - treasury approval tests

### Delfas 24.5 shared services / allocation / elimination input hardening

- bygg:
  - `SharedServiceAllocationPlan`
  - `AllocationExecutionReceipt`
  - `EliminationInput`
  - `ConsolidationBridgeRef`
- commands:
  - `createSharedServiceAllocationPlan`
  - `executeAllocationPlan`
  - `recordEliminationInput`
- invariants:
  - allocations måste bära bas, owner, period och evidence
  - elimination inputs får inte vara fria anteckningar
- tester:
  - allocation lineage tests
  - elimination input completeness tests

### Delfas 24.6 owner governance / board / dividend bridge hardening

- bygg:
  - `BoardResolution`
  - `OwnerDecision`
  - `DividendGovernanceBridge`
  - `HoldingStructureSnapshot`
- commands:
  - `recordBoardResolution`
  - `recordOwnerDecision`
  - `linkDividendDecisionToGovernance`
- invariants:
  - owner distribution-domänen bär payout och KU31 men inte hela owner/governance root
  - board/stamma lineage måste vara first-class där utdelning eller ägarbeslut kräver det
- tester:
  - owner-governance linkage tests
  - dividend bridge tests

### Delfas 24.7 auth / search / reporting boundary hardening

- bygg:
  - `GroupRoleGrant`
  - `CrossCompanySearchGrant`
  - `GroupReportingBoundary`
  - `CompanyScopeReceipt`
- commands:
  - `grantGroupRole`
  - `grantCrossCompanySearch`
  - `materializeGroupReportingBoundary`
- invariants:
  - cross-company read och write måste vara explicit godkända
  - reporting aggregation är inte samma sak som sök- eller mutationsrätt
- tester:
  - cross-company grant tests
  - reporting boundary tests

### Delfas 24.8 doc / runbook / legacy purge

- bygg:
  - `GroupDocTruthDecision`
  - `GroupLegacyArchiveReceipt`
  - `GroupRunbookExecution`
- dokumentbeslut:
  - harden: `docs/runbooks/owner-distributions-and-ku31.md`
  - create: `docs/runbooks/intercompany-operations.md`
  - create: `docs/runbooks/treasury-operations.md`
  - create: `docs/runbooks/shared-service-allocations.md`
- invariants:
  - owner-distribution-doc får inte fortsätta bära group/intercompany-sanning
- tester:
  - docs truth lint
  - runbook existence lint
