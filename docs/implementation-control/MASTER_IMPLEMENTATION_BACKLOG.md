# MASTER_IMPLEMENTATION_BACKLOG

Status: Bindande konkret backlog för allt som måste byggas före UI.

Supersession notice: Detta dokument är nu historiskt inputmaterial. Vid konflikt gäller `GO_LIVE_ROADMAP.md` och `PHASE_IMPLEMENTATION_BIBLE.md`.

Varje post nedan är implementationsgrundande. Ingen post får markeras klar utan kod, tester, runbooks och audit/replay-beteende.

## 1. Runtime bootstrap honesty

- Area: Platform runtime
- Capability: Ärlig bootstrap och environment separation
- Why it matters: Systemet får inte bygga vidare på falsk runtime eller optional dependency-fällor.
- Exact missing logic or runtime: clean memory path, lazy adapter loading, prod safety gates.
- Required bounded context or extension: `domain-core`, composition root.
- Required APIs/events/webhooks: startup diagnostics, `runtime.profile.selected`.
- Required rulepacks: none.
- Required tests: bootstrap smoke, environment safety tests.
- Required runbooks: local bootstrap, staging bootstrap.
- Required audit/replay behavior: startup audit event.
- Priority: P0
- Dependency order: 1
- What blocks UI: all backend contracts become unreliable.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 2. Persistent jobs, outbox and replay

- Area: Async runtime
- Capability: Persistent jobs, attempts, replay, dead-letter
- Why it matters: Nästan alla kritiska kedjor kräver worker.
- Exact missing logic or runtime: real handlers, attempt chains, retry classes.
- Required bounded context or extension: `domain-core`, `integrations`, `worker`.
- Required APIs/events/webhooks: jobs API, replay API, dead-letter API.
- Required rulepacks: retry policies.
- Required tests: retry, replay, poison message, idempotency.
- Required runbooks: replay, dead-letter, outage handling.
- Required audit/replay behavior: attempt audit and replay approvals.
- Priority: P0
- Dependency order: 2
- What blocks UI: async action contracts.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 3. Audit, evidence and restore drills

- Area: Governance/runtime
- Capability: Immutable audit chain and restore
- Why it matters: Reglerade flöden utan audit är oanvändbara.
- Exact missing logic or runtime: evidence pack, restore drill, emergency disable.
- Required bounded context or extension: `domain-core`, evidence store.
- Required APIs/events/webhooks: audit explorer, restore drill routes.
- Required rulepacks: none.
- Required tests: audit completeness, restore drills.
- Required runbooks: incident, restore, emergency disable.
- Required audit/replay behavior: audit write must be blocking for regulated mutations.
- Priority: P0
- Dependency order: 3
- What blocks UI: audit panels and object profiles.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: enterprise/compliance parity.
- What blocks competitor advantage: yes.

## 4. Canonical envelopes and error contracts

- Area: API platform
- Capability: Standard command/event/error envelopes
- Why it matters: Stabil utvecklingsbarhet och partner-API.
- Exact missing logic or runtime: global error contract, idempotency, optimistic concurrency.
- Required bounded context or extension: platform/API layer.
- Required APIs/events/webhooks: all mutating routes.
- Required rulepacks: none.
- Required tests: contract snapshots, idempotency.
- Required runbooks: API deprecation/versioning.
- Required audit/replay behavior: duplicate requests must return same operation receipt.
- Priority: P0
- Dependency order: 4
- What blocks UI: action contracts and predictable errors.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 5. Strong auth broker and identity linking

- Area: Auth
- Capability: Passkeys, TOTP, BankID, SSO federation
- Why it matters: Trust boundary for payroll, filings, support and enterprise.
- Exact missing logic or runtime: real providers, step-up, identity linking.
- Required bounded context or extension: `auth-core`, `domain-org-auth`.
- Required APIs/events/webhooks: auth challenges, federation routes, signature routes.
- Required rulepacks: trust TTL policies.
- Required tests: passkey, BankID, federation, step-up.
- Required runbooks: auth onboarding, provider outage.
- Required audit/replay behavior: session revision and challenge audit.
- Priority: P0
- Dependency order: 5
- What blocks UI: auth and action eligibility.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 6. Scope resolution and backoffice boundaries

- Area: Identity/operations
- Capability: Queue grants, object grants, impersonation, break-glass
- Why it matters: Support/backoffice must be safe and separate.
- Exact missing logic or runtime: support scope model, allowlists, access reviews.
- Required bounded context or extension: `domain-org-auth`, backoffice.
- Required APIs/events/webhooks: backoffice routes.
- Required rulepacks: SoD policies.
- Required tests: impersonation, break-glass, access review.
- Required runbooks: support access, incident access.
- Required audit/replay behavior: every support action ticket-bound.
- Priority: P0
- Dependency order: 6
- What blocks UI: backoffice and ordinary surface separation.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: partial.
- What blocks competitor advantage: yes.

## 7. Rulepack registry and historical pinning

- Area: Rule engine
- Capability: Effective dating and historical replay
- Why it matters: Swedish regulated logic changes over time.
- Exact missing logic or runtime: version pinning, tenant overrides, rollback.
- Required bounded context or extension: `rule-engine`, registry package.
- Required APIs/events/webhooks: rulepack publish, rollback, activation.
- Required rulepacks: all regulated packs.
- Required tests: historical replay, rollback, tenant isolation.
- Required runbooks: rulepack publish/rollback.
- Required audit/replay behavior: every evaluation stores rulepack version.
- Priority: P0
- Dependency order: 7
- What blocks UI: object profile explanation and reproducibility.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 8. Accounting method engine

- Area: Accounting
- Capability: Kontantmetod/faktureringsmetod with change requests
- Why it matters: Swedish bookkeeping timing and VAT timing.
- Exact missing logic or runtime: eligibility, effective dating, year-end catch-up.
- Required bounded context or extension: `domain-accounting-method`.
- Required APIs/events/webhooks: profiles, change-requests, catch-up runs.
- Required rulepacks: `SE-ACCOUNTING-METHOD`.
- Required tests: eligibility, year-end catch-up.
- Required runbooks: method change.
- Required audit/replay behavior: history immutable.
- Priority: P0
- Dependency order: 8
- What blocks UI: close and VAT readiness.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: no.

## 9. Fiscal year and legal form engine

- Area: Accounting/compliance
- Capability: Fiscal periods, broken year, legal-form obligations
- Why it matters: Close, declarations and annual filing depend on this.
- Exact missing logic or runtime: legal-form eligibility, period generation, reporting obligation profiles.
- Required bounded context or extension: `domain-fiscal-year`, `domain-legal-form`.
- Required APIs/events/webhooks: profiles, periods, obligations.
- Required rulepacks: `SE-FISCAL-YEAR`.
- Required tests: broken year, short year, legal form mapping.
- Required runbooks: fiscal year change.
- Required audit/replay behavior: history immutable.
- Priority: P0
- Dependency order: 9
- What blocks UI: annual workbenches and close.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: no.

## 10. Ledger posting, correction and close engine

- Area: Ledger
- Capability: Posting intents, voucher series, locks, reopen, reversal
- Why it matters: Single bookkeeping truth.
- Exact missing logic or runtime: posting recipes, correction impact analysis, configurable series.
- Required bounded context or extension: `domain-ledger`.
- Required APIs/events/webhooks: journals, reopen requests, manual journals.
- Required rulepacks: posting recipes, close blockers.
- Required tests: double-entry, reversal, reopen.
- Required runbooks: close and reopen.
- Required audit/replay behavior: full provenance.
- Priority: P0
- Dependency order: 10
- What blocks UI: finance object profiles.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 11. VAT decision and declaration engine

- Area: VAT
- Capability: Full VAT treatment and declaration versions
- Why it matters: Must-have in Sweden.
- Exact missing logic or runtime: decision ownership, declaration mapping, correction.
- Required bounded context or extension: `domain-vat`.
- Required APIs/events/webhooks: VAT decisions, declarations, submit.
- Required rulepacks: VAT core, reverse-charge, OSS/IOSS as applicable.
- Required tests: reverse charge, import/export, correction.
- Required runbooks: VAT filing and correction.
- Required audit/replay behavior: versioned declarations and receipts.
- Priority: P0
- Dependency order: 11
- What blocks UI: VAT workspace.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 12. AR issue gates and credit-note chain

- Area: AR
- Capability: Quote/order/invoice issue with legal blockers
- Why it matters: Lead-to-cash and VAT/HUS depend on correct issue path.
- Exact missing logic or runtime: quote immutability, legal field rules, receivable states.
- Required bounded context or extension: `domain-ar`.
- Required APIs/events/webhooks: quotes, invoices, payment links, Peppol send.
- Required rulepacks: invoice legal fields, HUS gating.
- Required tests: issue gates, credit notes.
- Required runbooks: invoice correction.
- Required audit/replay behavior: issue chain immutable.
- Priority: P0
- Dependency order: 12
- What blocks UI: AR workbench.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: no.

## 13. AP import and payment-readiness chain

- Area: AP
- Capability: Supplier invoice posting from import/document classification
- Why it matters: Procure-to-pay.
- Exact missing logic or runtime: import cases, payment readiness, dispute states.
- Required bounded context or extension: `domain-ap`, `domain-import-cases`.
- Required APIs/events/webhooks: import-cases, supplier invoices, payment readiness.
- Required rulepacks: classification boundaries, capitalization.
- Required tests: import totals, AP payment readiness.
- Required runbooks: AP incident repair.
- Required audit/replay behavior: import and approval history.
- Priority: P0
- Dependency order: 13
- What blocks UI: AP workbench.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: no.

## 14. Banking statements and payment orders

- Area: Banking
- Capability: Statement import, payment orders, returns, payouts
- Why it matters: Settlements and cash truth.
- Exact missing logic or runtime: connections, orders, returns, reconciliation.
- Required bounded context or extension: `domain-banking`, integrations.
- Required APIs/events/webhooks: bank connections, statements, payments.
- Required rulepacks: bank matching heuristics if deterministic.
- Required tests: statement dedupe, payment returns, settlement.
- Required runbooks: bank outage and recovery.
- Required audit/replay behavior: attempt chains and receipts.
- Priority: P0
- Dependency order: 14
- What blocks UI: banking workbench.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 15. Tax account subledger and offset engine

- Area: Tax account
- Capability: Import, match, offset, discrepancy, close blocker
- Why it matters: Strong Swedish differentiator.
- Exact missing logic or runtime: event import, offset rules, discrepancy workflow.
- Required bounded context or extension: `domain-tax-account`.
- Required APIs/events/webhooks: events, offsets, reconciliations.
- Required rulepacks: `SE-TAX-ACCOUNT-MAPPING`.
- Required tests: partial offset, discrepancy.
- Required runbooks: tax account reconciliation.
- Required audit/replay behavior: classification and adjustment audit.
- Priority: P0
- Dependency order: 15
- What blocks UI: tax account workspace.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: partial.
- What blocks competitor advantage: yes.

## 16. Document archive and OCR

- Area: Documents
- Capability: Immutable documents and OCR lineage
- Why it matters: Document-driven automation and evidence.
- Exact missing logic or runtime: real OCR execution, snapshots, evidence refs.
- Required bounded context or extension: `domain-documents`, document-engine.
- Required APIs/events/webhooks: ingest, OCR, archive download.
- Required rulepacks: OCR provider config.
- Required tests: OCR replay, archive integrity.
- Required runbooks: document ingestion failures.
- Required audit/replay behavior: original + OCR immutable.
- Priority: P0
- Dependency order: 16
- What blocks UI: document object profiles.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: no.

## 17. Document classification and review center

- Area: Documents/review
- Capability: Treatment lines, person linking, downstream intents, review
- Why it matters: Documents must safely flow to AP, payroll, benefits and HUS.
- Exact missing logic or runtime: explicit review boundaries, canonical review model.
- Required bounded context or extension: `domain-document-classification`, `domain-review-center`.
- Required APIs/events/webhooks: classification cases, review queues.
- Required rulepacks: `SE-DOCUMENT-CLASSIFICATION-BOUNDARIES`.
- Required tests: low confidence, person-linked documents.
- Required runbooks: document/payroll incident.
- Required audit/replay behavior: no overwrite of machine proposals or decisions.
- Priority: P0
- Dependency order: 17
- What blocks UI: review workbenches and object profiles.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 18. Generic balances engine

- Area: Payroll foundation
- Capability: Balance types, accrual, carry-forward, expiry
- Why it matters: Semester, comp, flex and other banks require shared engine.
- Exact missing logic or runtime: generic balance accounts and transactions.
- Required bounded context or extension: `domain-balances`.
- Required APIs/events/webhooks: balances routes.
- Required rulepacks: `TENANT-BALANCES`.
- Required tests: accrual, expiry, carry-forward.
- Required runbooks: balance corrections.
- Required audit/replay behavior: balance transactions append-only.
- Priority: P0
- Dependency order: 18
- What blocks UI: people/payroll workbenches.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: no.

## 19. Collective agreement extraction and rulepacks

- Area: Payroll foundation
- Capability: Upload, extract, review, compile, activate agreements
- Why it matters: Correct Swedish payroll.
- Exact missing logic or runtime: canonical output model and rulepack compile chain.
- Required bounded context or extension: `domain-collective-agreements`.
- Required APIs/events/webhooks: documents, extraction runs, assignments.
- Required rulepacks: `TENANT-COLLECTIVE-AGREEMENT`.
- Required tests: OB/overtime/rounding/retro scenarios.
- Required runbooks: agreement activation.
- Required audit/replay behavior: versioned and tenant-audited.
- Priority: P0
- Dependency order: 19
- What blocks UI: payroll configuration profiles.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 20. Payroll tax, AGI and core calculation engine

- Area: Payroll
- Capability: Production-grade pay run and AGI
- Why it matters: Must-have.
- Exact missing logic or runtime: tax decision engine, AGI versions, correction chain.
- Required bounded context or extension: `domain-payroll`, `domain-hr`, `domain-time`.
- Required APIs/events/webhooks: pay runs, AGI periods, corrections.
- Required rulepacks: `SE-AGI-CORE`, `SE-EMPLOYER-CONTRIBUTIONS`, official tax tables.
- Required tests: ordinary salary, SINK, engångsskatt, retro.
- Required runbooks: payroll submission and correction.
- Required audit/replay behavior: calculation fingerprints and immutable versions.
- Priority: P0
- Dependency order: 20
- What blocks UI: payroll workbench.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 21. Benefits, travel, pension and salary exchange

- Area: Payroll-adjacent
- Capability: Förmåner, traktamente, mileage, pension, salary exchange
- Why it matters: Correct total compensation chain.
- Exact missing logic or runtime: valued benefit decisions, travel decisions, pension instructions.
- Required bounded context or extension: `domain-benefits`, `domain-travel`, `domain-pension`.
- Required APIs/events/webhooks: benefit events, travel decisions, pension instructions.
- Required rulepacks: benefit thresholds, travel/mileage, pension/salary exchange.
- Required tests: tax-free vs taxable benefits, travel splits, salary exchange.
- Required runbooks: benefit correction.
- Required audit/replay behavior: evidence for valuations.
- Priority: P0
- Dependency order: 21
- What blocks UI: payroll-adjacent panels.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: no.

## 22. Garnishment and Kronofogden motor

- Area: Payroll regulated
- Capability: Löneutmätning
- Why it matters: Critical legal payroll feature.
- Exact missing logic or runtime: decision snapshots, protected amount, remittance chain.
- Required bounded context or extension: payroll extension.
- Required APIs/events/webhooks: garnishment routes, remittance routes.
- Required rulepacks: `SE-KFM-PROTECTED-AMOUNT`.
- Required tests: protected amount, bonus, retro, pause.
- Required runbooks: garnishment corrections.
- Required audit/replay behavior: decision-to-remittance evidence.
- Priority: P0
- Dependency order: 22
- What blocks UI: payroll exception/object profiles.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: partial but critical for premium payroll.
- What blocks competitor advantage: yes.

## 23. Generic regulated submissions engine

- Area: Integrations/compliance
- Capability: Submission envelopes, receipts, replay, dead-letter
- Why it matters: AGI, VAT, HUS and annual filing all depend on it.
- Exact missing logic or runtime: shared submission chain and receipts.
- Required bounded context or extension: `domain-integrations`.
- Required APIs/events/webhooks: submissions routes, evidence pack routes.
- Required rulepacks: retry policies.
- Required tests: technical vs business receipts, replay, dead-letter.
- Required runbooks: submission operations.
- Required audit/replay behavior: evidence pack and reconciliation.
- Priority: P0
- Dependency order: 23
- What blocks UI: submission monitor and receipts panels.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 24. HUS/ROT/RUT end-to-end chain

- Area: HUS
- Capability: Eligibility, claim versions, XML, receipts, recovery
- Why it matters: Swedish service/construction parity and advantage.
- Exact missing logic or runtime: locked claim versions, XML serializer, decision import, recovery.
- Required bounded context or extension: `domain-hus`, integrations.
- Required APIs/events/webhooks: HUS cases, claims, XML, submissions, decisions.
- Required rulepacks: `SE-HUS-CORE`.
- Required tests: accepted, partial, rejected, recovery.
- Required runbooks: HUS submission replay and recovery.
- Required audit/replay behavior: payload hash and version chain.
- Priority: P0
- Dependency order: 24
- What blocks UI: HUS workbench.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 25. Generic projects core and profitability

- Area: Projects
- Capability: Generic project engine, budget, forecast, profitability
- Why it matters: Product must not become construction-only.
- Exact missing logic or runtime: generic core separated from vertical packs.
- Required bounded context or extension: `domain-projects`.
- Required APIs/events/webhooks: projects, budgets, snapshots.
- Required rulepacks: project cost allocation policies.
- Required tests: profitability, cost allocations.
- Required runbooks: project close.
- Required audit/replay behavior: snapshot provenance.
- Priority: P0
- Dependency order: 25
- What blocks UI: project control workspace.
- What blocks enterprise readiness: partial.
- What blocks competitor parity: yes for service/project companies.
- What blocks competitor advantage: yes.

## 26. Field runtime, offline sync and evidence

- Area: Field
- Capability: Work orders, service orders, dispatch, materials, signatures, photos, sync conflicts
- Why it matters: Match/beat field competitors.
- Exact missing logic or runtime: offline envelopes, conflict model, evidence chain.
- Required bounded context or extension: `domain-field`.
- Required APIs/events/webhooks: work orders, sync, conflicts.
- Required rulepacks: field action policies.
- Required tests: sync conflict, material costing.
- Required runbooks: field offline recovery.
- Required audit/replay behavior: device-sourced mutations with receipts.
- Priority: P0
- Dependency order: 26
- What blocks UI: field mobile and desktop support.
- What blocks enterprise readiness: partial.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 27. Personalliggare generalized workplace model

- Area: Compliance/field
- Capability: General workplace, industry packs, corrections, exports
- Why it matters: Swedish compliance and construction parity.
- Exact missing logic or runtime: broader workplace abstraction, exports, snapshots.
- Required bounded context or extension: `domain-personalliggare`.
- Required APIs/events/webhooks: workplaces, attendance, exports.
- Required rulepacks: `SE-PERSONALLIGGARE-CORE`.
- Required tests: threshold, registration, correction, export.
- Required runbooks: kiosk/device trust.
- Required audit/replay behavior: immutable attendance chain.
- Priority: P0
- Dependency order: 27
- What blocks UI: compliance object profiles.
- What blocks enterprise readiness: partial.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 28. ID06 domain

- Area: Construction/identity
- Capability: Card validation, company binding, workplace assignments, work passes
- Why it matters: Required to be credible in construction.
- Exact missing logic or runtime: separat domän i stället för indirekt modellering via andra domäner.
- Required bounded context or extension: new `domain-id06`.
- Required APIs/events/webhooks: card validation, assignments, work passes, exports.
- Required rulepacks: ID06 validation policies.
- Required tests: card, binding, work-pass, export.
- Required runbooks: ID06 incidents.
- Required audit/replay behavior: validation evidence and work-pass chain.
- Priority: P0
- Dependency order: 28
- What blocks UI: construction and attendance workbenches.
- What blocks enterprise readiness: no.
- What blocks competitor parity: yes in construction/field.
- What blocks competitor advantage: yes.

## 29. Search, reporting and object profiles

- Area: Read models
- Capability: Search registry, reporting projections, object profiles
- Why it matters: UI readiness and operator productivity.
- Exact missing logic or runtime: projection contracts, permission-trimmed search.
- Required bounded context or extension: `domain-reporting`, `domain-search`.
- Required APIs/events/webhooks: search, report snapshots, object profiles.
- Required rulepacks: saved view policies where needed.
- Required tests: projection rebuild, permission trimming.
- Required runbooks: search rebuild.
- Required audit/replay behavior: stale projection markers.
- Priority: P0
- Dependency order: 29
- What blocks UI: yes, central blocker.
- What blocks enterprise readiness: partial.
- What blocks competitor parity: partial.
- What blocks competitor advantage: yes.

## 30. Workbench contracts

- Area: Read models/operations
- Capability: List/filter/sort/search/drilldown, counters, bulk actions
- Why it matters: UI must not reinvent backend semantics.
- Exact missing logic or runtime: workbench-specific resources for finance, payroll, projects, ops.
- Required bounded context or extension: across domains.
- Required APIs/events/webhooks: workbench list routes and action contracts.
- Required rulepacks: none.
- Required tests: saved view, counter accuracy, action eligibility.
- Required runbooks: none.
- Required audit/replay behavior: bulk action audit.
- Priority: P0
- Dependency order: 30
- What blocks UI: yes.
- What blocks enterprise readiness: no.
- What blocks competitor parity: partial.
- What blocks competitor advantage: yes.

## 31. Public API, partner API and real webhooks

- Area: Platform
- Capability: External surface with true deliveries
- Why it matters: Integrator and partner ecosystem.
- Exact missing logic or runtime: real webhook delivery, partner operations, replay.
- Required bounded context or extension: `domain-integrations`, public API layer.
- Required APIs/events/webhooks: subscriptions, deliveries, partner operations.
- Required rulepacks: webhook retry policies.
- Required tests: signature, replay, dead-letter, contract tests.
- Required runbooks: webhook incident.
- Required audit/replay behavior: attempt chain and response hashes.
- Priority: P0
- Dependency order: 31
- What blocks UI: no, but blocks external rollout.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 32. BankID and signing integrations

- Area: Identity/signing
- Capability: Strong identity and signing evidence
- Why it matters: Trust for filings and sensitive operations.
- Exact missing logic or runtime: real provider flows, evidence storage.
- Required bounded context or extension: auth/signing integration.
- Required APIs/events/webhooks: BankID challenge, signatures.
- Required rulepacks: action trust map.
- Required tests: provider integration, signature replay denial.
- Required runbooks: provider outage.
- Required audit/replay behavior: signed hash evidence.
- Priority: P0
- Dependency order: 32
- What blocks UI: auth/onboarding and action flows.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: no.

## 33. Peppol and e-invoicing

- Area: AR/AP integrations
- Capability: Outbound and inbound e-invoice
- Why it matters: Hygiene for Swedish/Nordic B2B.
- Exact missing logic or runtime: participant lookup, UBL transport, receipts.
- Required bounded context or extension: AR, AP, integrations.
- Required APIs/events/webhooks: send-peppol, inbound-peppol.
- Required rulepacks: document mapping policies.
- Required tests: schema validation, receipts.
- Required runbooks: e-invoice failure.
- Required audit/replay behavior: delivery receipts and hashes.
- Priority: P0
- Dependency order: 33
- What blocks UI: AP/AR flows partially.
- What blocks enterprise readiness: partial.
- What blocks competitor parity: yes.
- What blocks competitor advantage: no.

## 34. Payroll and accounting migration/cutover engine

- Area: Migration
- Capability: Mapping, diff, cutover, rollback readiness
- Why it matters: Go-live without migration is not credible.
- Exact missing logic or runtime: cutover cockpit, acceptance records, rollback plans.
- Required bounded context or extension: migration engine, payroll, accounting imports.
- Required APIs/events/webhooks: mapping sets, import batches, diff reports, cutover plans.
- Required rulepacks: migration validation.
- Required tests: source parity, rollback.
- Required runbooks: cutover.
- Required audit/replay behavior: signed diffs and acceptance.
- Priority: P0
- Dependency order: 34
- What blocks UI: migration cockpit contracts.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 35. Backoffice and support operations

- Area: Operations
- Capability: Support cases, impersonation, audit explorer, replay, incident tools
- Why it matters: Enterprise drift and support.
- Exact missing logic or runtime: separate backoffice bounded context and routes.
- Required bounded context or extension: backoffice app/backend.
- Required APIs/events/webhooks: support, impersonation, incidents, access reviews.
- Required rulepacks: support/SoD policies.
- Required tests: support scope, incident flows.
- Required runbooks: support/backoffice.
- Required audit/replay behavior: ticket-bound actions.
- Priority: P0
- Dependency order: 35
- What blocks UI: backoffice surface.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: partial.
- What blocks competitor advantage: yes.

## 36. Notifications, activity and work-item separation

- Area: Operations/read models
- Capability: Distinct centers for alerts, history and obligations
- Why it matters: Operator usability and correctness.
- Exact missing logic or runtime: separate storage, statuses, counters.
- Required bounded context or extension: `domain-notifications`, `domain-activity`, `domain-core`.
- Required APIs/events/webhooks: notification, activity, work item routes.
- Required rulepacks: dedupe policies.
- Required tests: separation, counters.
- Required runbooks: notification failures.
- Required audit/replay behavior: activity derived, work items persistent.
- Priority: P0
- Dependency order: 36
- What blocks UI: command center and workbench counters.
- What blocks enterprise readiness: no.
- What blocks competitor parity: no.
- What blocks competitor advantage: yes.

## 37. Annual package and declaration filing chain

- Area: Annual reporting
- Capability: Package build, signoff, filing, correction
- Why it matters: Close-to-filing completeness.
- Exact missing logic or runtime: package family selection, evidence pack, filing receipts.
- Required bounded context or extension: `domain-annual-reporting`.
- Required APIs/events/webhooks: packages, signoff, submit.
- Required rulepacks: legal form and close blockers.
- Required tests: AB, EF, HB/KB, corrections.
- Required runbooks: annual close and filing.
- Required audit/replay behavior: immutable package versions and receipts.
- Priority: P0
- Dependency order: 37
- What blocks UI: annual workspace.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 38. Payment links and PSP integration

- Area: Collections
- Capability: Payment links and customer online payment
- Why it matters: Strong SMB/service differentiator.
- Exact missing logic or runtime: PSP session, callbacks, refund chain.
- Required bounded context or extension: AR, banking, integrations.
- Required APIs/events/webhooks: payment links, PSP callbacks.
- Required rulepacks: surcharge/fee policies if needed.
- Required tests: paid/expired/refunded.
- Required runbooks: PSP outage.
- Required audit/replay behavior: provider event receipts.
- Priority: P1
- Dependency order: 38
- What blocks UI: optional.
- What blocks enterprise readiness: no.
- What blocks competitor parity: partial against modern SMB tools.
- What blocks competitor advantage: yes.

## 39. Cards/spend integration

- Area: Spend
- Capability: Card transactions linked to documents and payroll/AP
- Why it matters: Competes with Bokio/Wint-style flows.
- Exact missing logic or runtime: card transaction import and receipt linking.
- Required bounded context or extension: spend adapter + documents + travel/benefits.
- Required APIs/events/webhooks: spend import, link receipt.
- Required rulepacks: spend classification boundaries.
- Required tests: receipt matching, private spend.
- Required runbooks: spend incident repair.
- Required audit/replay behavior: issuer event dedupe.
- Priority: P1
- Dependency order: 39
- What blocks UI: no.
- What blocks enterprise readiness: no.
- What blocks competitor parity: partial.
- What blocks competitor advantage: yes.

## 40. BI/export ecosystem

- Area: Data access
- Capability: Versioned exports and schemas
- Why it matters: Enterprise data portability.
- Exact missing logic or runtime: export jobs, schema catalog, audit.
- Required bounded context or extension: reporting/export layer.
- Required APIs/events/webhooks: export jobs, schemas.
- Required rulepacks: none.
- Required tests: export schema stability, access scope.
- Required runbooks: export failures.
- Required audit/replay behavior: extraction receipts.
- Priority: P1
- Dependency order: 40
- What blocks UI: no.
- What blocks enterprise readiness: partial.
- What blocks competitor parity: partial.
- What blocks competitor advantage: yes.

## 41. CRM/e-commerce order integrations

- Area: Lead-to-cash
- Capability: External lead/order ingestion
- Why it matters: Broadens central-platform position.
- Exact missing logic or runtime: customer/order sync and mapping.
- Required bounded context or extension: AR, projects, integrations.
- Required APIs/events/webhooks: order imports, customer sync.
- Required rulepacks: customer mapping policies.
- Required tests: duplicate order handling.
- Required runbooks: sync failures.
- Required audit/replay behavior: cursor replay.
- Priority: P2
- Dependency order: 41
- What blocks UI: no.
- What blocks enterprise readiness: no.
- What blocks competitor parity: no.
- What blocks competitor advantage: yes.

## 42. Service/material/fleet-adjacent integrations

- Area: Operations ecosystem
- Capability: External schedule/material/fleet connectors
- Why it matters: Field and service advantage.
- Exact missing logic or runtime: external refs, sync cursors, conflict-aware updates.
- Required bounded context or extension: projects/field/integrations.
- Required APIs/events/webhooks: schedule sync, material sync.
- Required rulepacks: none.
- Required tests: sync collisions.
- Required runbooks: external schedule outage.
- Required audit/replay behavior: cursor and conflict logs.
- Priority: P2
- Dependency order: 42
- What blocks UI: no.
- What blocks enterprise readiness: no.
- What blocks competitor parity: no.
- What blocks competitor advantage: yes.

## 43. Final UI-readiness read model pass

- Area: Pre-UI gate
- Capability: Object profiles, workbench contracts, command contracts
- Why it matters: Prevents UI rework.
- Exact missing logic or runtime: all mandatory profiles and list contracts.
- Required bounded context or extension: cross-domain read models.
- Required APIs/events/webhooks: object profile, workbench, command bar contracts.
- Required rulepacks: none.
- Required tests: UI-readiness contract tests.
- Required runbooks: projection rebuild.
- Required audit/replay behavior: projection rebuild receipts.
- Priority: P0
- Dependency order: 43
- What blocks UI: yes, final blocker.
- What blocks enterprise readiness: no.
- What blocks competitor parity: partial.
- What blocks competitor advantage: yes.

## 44. Pilot parallel runs and variance handling

- Area: Go-live readiness
- Capability: Parallel runs for finance, payroll, HUS, personalliggare
- Why it matters: Final proof before rollout.
- Exact missing logic or runtime: variance capture and controlled fixes.
- Required bounded context or extension: operations/cutover.
- Required APIs/events/webhooks: variance cases, acceptance records.
- Required rulepacks: none.
- Required tests: end-to-end golden scenarios.
- Required runbooks: pilot variance handling.
- Required audit/replay behavior: variance evidence and replay traces.
- Priority: P0
- Dependency order: 44
- What blocks UI: start of real UI rollout.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.

## 45. Enterprise readiness signoff

- Area: Release control
- Capability: Final signoff across runtime, compliance and operations
- Why it matters: Stops premature launch.
- Exact missing logic or runtime: objective gates and evidence collection.
- Required bounded context or extension: release control.
- Required APIs/events/webhooks: readiness reports.
- Required rulepacks: none.
- Required tests: full suite green.
- Required runbooks: release signoff.
- Required audit/replay behavior: signoff evidence and immutable release record.
- Priority: P0
- Dependency order: 45
- What blocks UI: yes, if not green.
- What blocks enterprise readiness: yes.
- What blocks competitor parity: yes.
- What blocks competitor advantage: yes.
