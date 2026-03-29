> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: MCP-009
- Title: Master Document Manifest
- Status: Binding control baseline
- Owner: Product architecture, compliance architecture and documentation governance
- Version: 1.0.0
- Effective from: 2026-03-23
- Supersedes: No prior master document manifest
- Approved by: User directive in this control phase
- Last reviewed: 2026-03-23
- Related master docs:
  - docs/master-control/master-rebuild-control.md
  - docs/master-control/master-gap-register.md
  - docs/master-control/master-code-impact-map.md
  - docs/master-control/master-domain-map.md
  - docs/master-control/master-rulepack-register.md
  - docs/master-control/master-ui-reset-spec.md
  - docs/master-control/master-golden-scenario-catalog.md
  - docs/master-control/master-policy-matrix.md
  - docs/master-control/master-build-sequence.md
- Related domains:
  - all product domains and shared control layers
- Related code areas:
  - docs/*
  - packages/*
  - apps/*
  - tests/*
- Related future documents:
  - all entries listed in this manifest

# Purpose

Detta dokument är den bindande manifestlistan för alla framtida dokument som måste skrivas, ersättas eller uppdateras för att hela omtaget ska kunna byggas utan kontextförlust.

Manifestet skiljer uttryckligen mellan:

- framtida ADR:er
- framtida compliance docs
- framtida domain/product specs
- framtida policies
- framtida UI specs
- framtida runbooks
- framtida test plans
- befintliga filer som måste ersättas i fulltext

# Manifest rules

## Writing priority codes

- **W1** = måste skrivas innan eller samtidigt som första implementation i området
- **W2** = måste skrivas före stabil domänimplementation eller större UI-arbete
- **W3** = måste skrivas före pilot, men efter att domänkontrakt är låst
- **W4** = måste skrivas före bred aktivering eller extern exponering

## Build priority codes

- **B1** = blockerar tidig kärnarkitektur
- **B2** = blockerar central domänmotor
- **B3** = blockerar UI- eller operatörsyta
- **B4** = blockerar pilot och drift
- **B5** = blockerar extern aktivering eller skarp release av visst område

## New or replace

- **New** = ny fil
- **Replace** = befintlig fil ska ersättas i fulltext
- **Split-replace** = befintlig fil ska ersättas av flera mer precisa dokument

# Full future document inventory

## Future ADRs

| Path | Document type | New or replace | Purpose | Master docs it depends on | Domains it governs | Code areas it governs | Writing priority | Build priority |
|---|---|---|---|---|---|---|---|---|
| `docs/adr/ADR-0022-accounting-method-and-fiscal-year-architecture.md` | ADR | New | Låsa nya bounded contexts för accounting method och fiscal year | MCP-001, MCP-003, MCP-004, MCP-005 | accounting method, fiscal year, ledger, VAT, annual | domain-accounting-method, domain-fiscal-year, domain-ledger | W1 | B1 |
| `docs/adr/ADR-0023-review-center-notification-and-activity-separation.md` | ADR | New | Låsa separation mellan review, work items, notifications och activity | MCP-001, MCP-003, MCP-004, MCP-006 | core, review center, notifications, activity | domain-core, domain-review-center, domain-notifications, domain-activity | W1 | B1 |
| `docs/adr/ADR-0024-document-person-payroll-chain-architecture.md` | ADR | New | Låsa dokument -> person -> payroll -> AGI -> ledger-kedjan | MCP-001, MCP-003, MCP-004, MCP-007 | documents, classification, benefits, payroll | document-engine, domain-document-classification, domain-payroll, domain-benefits | W1 | B1 |
| `docs/adr/ADR-0025-tax-account-and-offset-architecture.md` | ADR | New | Låsa tax account som egen subledger och offset-motor | MCP-001, MCP-003, MCP-004, MCP-005 | tax account, banking, reporting, close | domain-tax-account, domain-banking, domain-reporting | W1 | B1 |
| `docs/adr/ADR-0026-payroll-migration-balances-and-agreements-architecture.md` | ADR | New | Låsa balances, agreements och payroll migration som egna motorer | MCP-001, MCP-003, MCP-004, MCP-005 | payroll, HR, time, balances, agreements | domain-payroll, domain-balances, domain-collective-agreements, domain-hr, domain-time | W1 | B1 |
| `docs/adr/ADR-0027-import-case-and-multi-document-linkage-architecture.md` | ADR | New | Låsa import-case och multi-document linkage | MCP-001, MCP-003, MCP-004, MCP-007 | AP, VAT, documents, import | domain-import-cases, domain-ap, domain-vat, document-engine | W1 | B2 |
| `docs/adr/ADR-0028-personalliggare-industry-pack-and-identity-graph-architecture.md` | ADR | New | Låsa breddad personalliggaremodell | MCP-001, MCP-003, MCP-004 | personalliggare, field, HR | domain-personalliggare, domain-field, domain-hr | W2 | B2 |
| `docs/adr/ADR-0029-ui-reset-and-surface-strategy-refresh.md` | ADR | New | Formellt ersätta gammal UI-riktning och låsa nya surface boundaries | MCP-001, MCP-003, MCP-006 | public web, desktop, mobile, backoffice | apps/public-web, apps/desktop-web, apps/field-mobile, apps/backoffice | W1 | B1 |
| `docs/adr/ADR-0030-legal-form-and-annual-filing-architecture.md` | ADR | New | Låsa legal-form engine och annual filing separation | MCP-001, MCP-003, MCP-004, MCP-007 | legal form, annual reporting, close | domain-annual-reporting, domain-reporting, domain-fiscal-year | W2 | B2 |

## Future core control and planning docs

| Path | Document type | New or replace | Purpose | Master docs it depends on | Domains it governs | Code areas it governs | Writing priority | Build priority |
|---|---|---|---|---|---|---|---|---|
| `docs/MASTER_BUILD_PLAN.md` | Master plan | Replace | Synka huvudplanens fasordning, exit gates och leveransordning med MCP-001 till MCP-010 | MCP-001 through MCP-010 | all phases, all domains, all surfaces | docs, delivery control, implementation sequencing | W1 | B1 |

## Future compliance docs

| Path | Document type | New or replace | Purpose | Master docs it depends on | Domains it governs | Code areas it governs | Writing priority | Build priority |
|---|---|---|---|---|---|---|---|---|
| `docs/compliance/se/accounting-method-engine.md` | Compliance | New | Full motor för kontantmetod/faktureringsmetod | MCP-001, MCP-002, MCP-005, MCP-007 | accounting method, ledger, AR, AP, VAT | domain-accounting-method, ledger, AR, AP, VAT | W1 | B1 |
| `docs/compliance/se/fiscal-year-and-period-engine.md` | Compliance | New | Full motor för brutet räkenskapsår och periodgenerering | MCP-001, MCP-002, MCP-005, MCP-007 | fiscal year, ledger, reporting, annual | domain-fiscal-year, ledger, reporting, annual | W1 | B1 |
| `docs/compliance/se/legal-form-and-declaration-engine.md` | Compliance | New | AB, EF, HB, KB, ekonomisk förening och deklarationspaket | MCP-001, MCP-002, MCP-004, MCP-007 | annual reporting, reporting, ledger | domain-annual-reporting, domain-reporting, ledger | W2 | B2 |
| `docs/compliance/se/person-linked-document-classification-engine.md` | Compliance | New | Dokument -> person -> behandling -> payroll/AGI/ledger | MCP-001, MCP-002, MCP-004, MCP-007 | documents, classification, benefits, payroll | document-engine, domain-document-classification, benefits, payroll | W1 | B2 |
| `docs/compliance/se/import-case-engine.md` | Compliance | New | Import-case med tull, frakt, spedition och importmoms | MCP-002, MCP-003, MCP-004, MCP-007 | import cases, AP, VAT | domain-import-cases, AP, VAT | W1 | B2 |
| `docs/compliance/se/payroll-migration-and-balances-engine.md` | Compliance | New | Lönemigrering, YTD och generisk saldohantering | MCP-002, MCP-003, MCP-005, MCP-007 | payroll, balances, HR, time | payroll, balances, HR, time | W1 | B2 |
| `docs/compliance/se/collective-agreements-engine.md` | Compliance | New | Versionerad avtalsmotor | MCP-002, MCP-003, MCP-005, MCP-007 | agreements, payroll, time | domain-collective-agreements, payroll, time | W1 | B2 |
| `docs/compliance/se/tax-account-and-offset-engine.md` | Compliance | New | Skattekonto och kvittningsmotor | MCP-002, MCP-003, MCP-005, MCP-007 | tax account, banking, close | domain-tax-account, banking, reporting, close | W1 | B2 |
| `docs/compliance/se/hus-invoice-and-claim-gates.md` | Compliance | New | HUS invoice/payment/claim/recovery-gates | MCP-002, MCP-005, MCP-007 | HUS, AR, integrations | HUS, AR, integrations | W1 | B2 |
| `docs/compliance/se/invoice-legal-field-rules-engine.md` | Compliance | New | Scenarioobligatoriska fakturafält och issue blockers | MCP-002, MCP-005, MCP-007 | AR, VAT, HUS | AR, VAT, HUS | W1 | B2 |
| `docs/compliance/se/document-inbox-and-ocr-engine.md` | Compliance | Replace | Uppdatera intake, OCR, archive, classification handoff och review-center integration | MCP-001, MCP-003, MCP-004, MCP-007 | documents, OCR, archive, review | document-engine, documents, review-center, worker | W2 | B2 |
| `docs/compliance/se/accounting-foundation.md` | Compliance | Replace | Uppdatera foundation med accounting method, fiscal year, tax account, series flexibility | MCP-001, MCP-003, MCP-004 | ledger | ledger, fiscal year, accounting method | W2 | B2 |
| `docs/compliance/se/vat-engine.md` | Compliance | Replace | Hårda moms mot import case, reverse charge, credit note mirror och review boundaries | MCP-001, MCP-005, MCP-007 | VAT | VAT, AR, AP | W2 | B2 |
| `docs/compliance/se/ar-customer-invoicing-engine.md` | Compliance | Replace | Hårdare invoice rules, quote/order/project/HUS integration | MCP-003, MCP-004, MCP-007 | AR | AR, VAT, HUS | W2 | B2 |
| `docs/compliance/se/ap-supplier-invoice-engine.md` | Compliance | Replace | Import case, person-linked docs och stronger AP ops | MCP-003, MCP-004, MCP-007 | AP | AP, documents, VAT, import cases | W2 | B2 |
| `docs/compliance/se/payroll-engine.md` | Compliance | Replace | Integrera balances, agreements, migration och project cost allocation | MCP-003, MCP-004, MCP-005, MCP-007 | payroll | payroll, balances, agreements | W2 | B2 |
| `docs/compliance/se/benefits-engine.md` | Compliance | Replace | Integrera document-driven benefits, wellness crossover, net deduction relation | MCP-003, MCP-004, MCP-005, MCP-007 | benefits | benefits, payroll, documents | W2 | B2 |
| `docs/compliance/se/personalliggare-engine.md` | Compliance | Replace | Bredda till industry packs, workplace abstraction och device trust | MCP-003, MCP-004, MCP-007 | personalliggare | personalliggare, field, mobile | W2 | B2 |
| `docs/compliance/se/rot-rut-engine.md` | Compliance | Replace | Synka HUS-regler med nya claim-gates och UI blockers | MCP-003, MCP-005, MCP-007 | HUS | HUS, AR, integrations | W2 | B2 |
| `docs/compliance/se/annual-reporting-engine.md` | Compliance | Replace | Legal-form-aware close, filing och declaration packaging | MCP-003, MCP-004, MCP-007 | annual reporting | annual reporting, reporting, integrations | W2 | B2 |
| `docs/compliance/se/bank-and-payments-engine.md` | Compliance | Replace | Integrera tax account, returns, payout recovery och ops | MCP-003, MCP-004 | banking | banking, integrations, tax account | W2 | B2 |
| `docs/compliance/se/project-billing-and-revenue-recognition-engine.md` | Compliance | Replace | Knyt quotes, projects, billing, HUS and actuals | MCP-003, MCP-004, MCP-007 | projects, AR, HUS | projects, AR, HUS | W3 | B3 |

## Future domain and product specs

| Path | Document type | New or replace | Purpose | Master docs it depends on | Domains it governs | Code areas it governs | Writing priority | Build priority |
|---|---|---|---|---|---|---|---|---|
| `docs/domain/review-center.md` | Domain spec | New | Full domain and UI contract for review center | MCP-003, MCP-004, MCP-006 | review center | domain-review-center, desktop-web | W1 | B2 |
| `docs/domain/notification-center.md` | Domain spec | New | Notifieringsmodell och UI-kontrakt | MCP-003, MCP-004, MCP-006 | notifications | domain-notifications, desktop-web, mobile | W2 | B3 |
| `docs/domain/activity-feed.md` | Domain spec | New | Activity feed som separat bounded context | MCP-003, MCP-004, MCP-006 | activity | domain-activity, desktop-web, backoffice | W2 | B3 |
| `docs/domain/personalliggare-industry-packs.md` | Domain spec | New | Branschpaket, workplace abstraction och identity graph | MCP-003, MCP-004, MCP-007 | personalliggare | personalliggare, field, mobile | W2 | B2 |
| `docs/domain/egenkontroll.md` | Domain spec | New | Mallar, checklistor, sign-off och avvikelser | MCP-003, MCP-004, MCP-006 | egenkontroll | domain-egenkontroll, projects, field | W2 | B3 |
| `docs/domain/kalkyl.md` | Domain spec | New | Estimate engine, versions and links to quote/project | MCP-003, MCP-004, MCP-006 | kalkyl | domain-kalkyl, projects, AR | W2 | B3 |
| `docs/domain/projects-workspace.md` | Domain spec | New | Full projektarbetsyta och relationer till field, HUS, payroll | MCP-003, MCP-004, MCP-006 | projects | projects, field, desktop-web | W2 | B3 |
| `docs/domain/payroll-workbench-and-ops.md` | Domain spec | New | Payroll workbench, exceptions, AGI ops, migration cockpit | MCP-003, MCP-004, MCP-006 | payroll | payroll, desktop-web, backoffice | W2 | B3 |
| `docs/domain/tax-account-reconciliation-and-settlement.md` | Domain spec | New | Tax account ops and close integration | MCP-003, MCP-004 | tax account, close | tax-account, reporting, backoffice | W2 | B3 |
| `docs/domain/async-jobs-retry-replay-and-dead-letter.md` | Domain spec | Replace | Uppdatera jobmodell till persistent runtime med attempts, replay, dead-letter och ops-ägarskap | MCP-003, MCP-004, MCP-008 | worker, jobs, replay, ops | worker, domain-core, integrations, backoffice | W2 | B1 |
| `docs/domain/submission-receipts-and-action-queue.md` | Domain spec | Replace | Uppdatera submissionplattformen till gemensam teknisk och affärsmässig receipt chain | MCP-003, MCP-004, MCP-007 | submissions, receipts, action queues | integrations, payroll, VAT, HUS, annual-reporting | W2 | B2 |
| `docs/domain/offline-sync-and-conflict-resolution.md` | Domain spec | Replace | Uppdatera offline policy för field-mobile, personalliggare och conflict repair | MCP-003, MCP-004, MCP-006, MCP-007 | mobile, field, personalliggare, sync | field-mobile, personalliggare, backoffice | W2 | B3 |
| `docs/domain/audit-review-support-and-admin-backoffice.md` | Domain spec | Replace | Ersätt med ny backoffice- och supportmodell, audit explorer, replay och ops-gränser | MCP-003, MCP-004, MCP-006, MCP-008 | backoffice, support, audit, ops | backoffice, auth-core, domain-core, integrations | W2 | B2 |
| `docs/domain/saved-views-dashboards-and-personalization.md` | Domain spec | Replace | Uppdatera saved views, dashboards och personalization till ny desktop IA och workbench-modell | MCP-004, MCP-006 | desktop personalization, dashboards, saved views | desktop-web, search, ui-desktop | W3 | B3 |
| `docs/domain/search-indexing-and-global-search.md` | Domain spec | Replace | Uppdatera search med object profiles, saved views och permission trimming | MCP-003, MCP-004, MCP-006 | search | search registry, desktop-web | W3 | B3 |
| `docs/domain/work-items-deadlines-notifications.md` | Domain spec | Split-replace | Ersätt överlastat dokument med review-center, notification-center och activity-feed | MCP-003, MCP-004, MCP-006 | core, review, notifications, activity | domain-core, review-center, notifications, activity | W2 | B2 |
| `docs/domain/projects-budget-wip-and-profitability.md` | Domain spec | Replace | Uppdatera till full projects workspace och payroll actuals | MCP-003, MCP-004, MCP-006 | projects | projects, payroll, reporting | W3 | B3 |
| `docs/domain/field-work-order-service-order-and-material-flow.md` | Domain spec | Replace | Uppdatera till ny mobile, egenkontroller, personalliggare och project context | MCP-003, MCP-004, MCP-006 | field | field, mobile, personalliggare | W3 | B3 |

## Future policies

| Path | Document type | New or replace | Purpose | Master docs it depends on | Domains it governs | Code areas it governs | Writing priority | Build priority |
|---|---|---|---|---|---|---|---|---|
| `docs/policies/ai-decision-boundary-policy.md` | Policy | New | Förhindra AI-autonomi i reglerade beslut | MCP-001, MCP-005, MCP-008 | rule-engine, documents, review | rule-engine, document-engine, API | W1 | B1 |
| `docs/policies/module-activation-and-tenant-setup-policy.md` | Policy | New | Styra tenant setup och modulkombinationer | MCP-001, MCP-003, MCP-008 | org-auth, onboarding, feature flags | org-auth, backoffice, API | W1 | B1 |
| `docs/policies/document-review-and-economic-decision-policy.md` | Policy | New | Styra dokumentreview och ekonomiska beslut | MCP-001, MCP-004, MCP-008 | documents, AP, benefits, payroll | documents, classification, review center | W1 | B2 |
| `docs/policies/capitalization-policy.md` | Policy | New | Tillgång vs kostnad, naturligt samband, useful life | MCP-002, MCP-007, MCP-008 | AP, ledger, assets | classification, AP, ledger | W2 | B2 |
| `docs/policies/invoice-issuance-and-credit-policy.md` | Policy | New | Fakturaissue, credits, legal blockers | MCP-005, MCP-007, MCP-008 | AR, VAT, HUS | AR, VAT, HUS, integrations | W1 | B2 |
| `docs/policies/signoff-and-segregation-of-duties-policy.md` | Policy | New | Signoff-klasser och SoD | MCP-001, MCP-004, MCP-008 | auth, close, payroll, HUS, annual | auth-core, org-auth, domain-core, payroll, annual | W1 | B1 |
| `docs/policies/personalliggare-correction-policy.md` | Policy | New | Append-only corrections och kiosk/offline rules | MCP-004, MCP-007, MCP-008 | personalliggare | personalliggare, mobile, backoffice | W2 | B2 |
| `docs/policies/payroll-migration-policy.md` | Policy | New | Import, diff, cutover och rollback för lön | MCP-003, MCP-007, MCP-008 | payroll, HR, balances | payroll, migration cockpit | W1 | B2 |
| `docs/policies/hus-signing-and-submission-policy.md` | Policy | New | HUS claim readiness, sign and submit | MCP-003, MCP-007, MCP-008 | HUS, AR, integrations | HUS, AR, integrations | W1 | B2 |
| `docs/policies/close-correction-and-reopen-policy.md` | Policy | New | Lock, reopen, correction and override | MCP-003, MCP-007, MCP-008 | close, ledger, annual | close, ledger, backoffice | W1 | B2 |
| `docs/policies/emergency-disable-policy.md` | Policy | New | Kill switches och incidentavstängning | MCP-001, MCP-008 | feature flags, ops, integrations | feature flags, backoffice, worker | W1 | B1 |
| `docs/policies/rulepack-release-and-rollback-policy.md` | Policy | New | Publicering, rollback och replay av rulepacks | MCP-005, MCP-008 | rule-engine and all rulepack consumers | rule-engine, tests, backoffice | W1 | B1 |
| `docs/policies/support-access-and-impersonation-policy.md` | Policy | Replace | Uppdatera supportåtkomst för ny backoffice-modell | MCP-003, MCP-008 | backoffice, auth | auth-core, backoffice | W2 | B3 |
| `docs/policies/security-admin-and-incident-policy.md` | Policy | Replace | Anpassa säkerhets- och incidentstyrning till ny ops-modell | MCP-003, MCP-008 | auth, backoffice, worker | auth-core, core resilience, backoffice | W2 | B3 |
| `docs/policies/benefits-pension-travel-company-policy.md` | Policy | Replace | Synka bolagspolicy med nya rulepacks och payroll bridge | MCP-005, MCP-008 | benefits, travel, pension | benefits, travel, pension, payroll | W2 | B3 |
| `docs/policies/access-attestation-and-signoff-policy.md` | Policy | Replace | Ersätts i fulltext av ny SoD-policy | MCP-008 | auth, approvals, signoff | auth-core, org-auth, domain-core | W2 | B1 |
| `docs/policies/accounting-close-correction-and-lock-policy.md` | Policy | Replace | Ersätts av ny close correction and reopen policy | MCP-008 | close, ledger, annual | close, ledger, backoffice | W2 | B2 |
| `docs/policies/feature-flag-and-emergency-disable-policy.md` | Policy | Replace | Ersätts av module activation policy plus emergency disable policy | MCP-008 | feature flags, tenant setup | backoffice, org-auth, core | W2 | B1 |

## Future UI specs

| Path | Document type | New or replace | Purpose | Master docs it depends on | Domains it governs | Code areas it governs | Writing priority | Build priority |
|---|---|---|---|---|---|---|---|---|
| `docs/ui/ENTERPRISE_UI_RESET.md` | UI spec | New | Full narrative and design reset authority | MCP-006 | all surfaces | public-web, desktop-web, mobile, backoffice | W1 | B1 |
| `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md` | UI spec | New | Tokens, typography, table system, object profile anatomy | MCP-006 | all surfaces | ui-core, ui-desktop, ui-mobile | W1 | B3 |
| `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md` | UI spec | New | Final IA, route tree and workbench layout | MCP-006 | desktop surface | apps/desktop-web, ui-desktop | W1 | B3 |
| `docs/ui/FIELD_MOBILE_SPEC.md` | UI spec | New | Mobile responsibilities, offline, conflict states and tabs | MCP-006 | field-mobile | apps/field-mobile, ui-mobile | W2 | B3 |
| `docs/ui/PUBLIC_SITE_AND_AUTH_SPEC.md` | UI spec | New | Public site, auth, onboarding and challenge center | MCP-006 | public web and auth | apps/public-web, auth entry, onboarding | W1 | B3 |
| `docs/ui/BACKOFFICE_OPERATIONS_SPEC.md` | UI spec | New | Support and ops surface contracts | MCP-006 | backoffice | apps/backoffice | W2 | B3 |
| `docs/ui/WORKBENCH_CATALOG.md` | UI spec | New | Detailed workbench inventory and responsibilities | MCP-006 | desktop workbenches | desktop-web, ui-desktop | W2 | B3 |
| `docs/ui/ENTERPRISE_UI_PLAN.md` | UI spec | Replace | Den gamla planen ska ersättas i fulltext eller avpubliceras till historical appendix | MCP-006 | historical only | docs/ui | W1 | B1 |

## Future runbooks

| Path | Document type | New or replace | Purpose | Master docs it depends on | Domains it governs | Code areas it governs | Writing priority | Build priority |
|---|---|---|---|---|---|---|---|---|
| `docs/runbooks/payroll-migration-cutover.md` | Runbook | New | Praktiskt cutover-flöde för lönemigrering | MCP-003, MCP-007, MCP-008 | payroll, migration | payroll, balances, migration cockpit | W1 | B2 |
| `docs/runbooks/fiscal-year-change-runbook.md` | Runbook | New | Ändring av räkenskapsår och periodkalender | MCP-003, MCP-007 | fiscal year, ledger, reporting | fiscal-year, ledger, reporting | W2 | B2 |
| `docs/runbooks/hus-submission-replay-and-recovery.md` | Runbook | New | HUS retry, partial approval and recovery operations | MCP-003, MCP-007, MCP-008 | HUS, integrations | HUS, integrations, backoffice | W2 | B2 |
| `docs/runbooks/tax-account-reconciliation.md` | Runbook | New | Drift- och kontrollflöde för skattekonto | MCP-003, MCP-007 | tax account, close | tax-account, banking, reporting | W2 | B2 |
| `docs/runbooks/personalliggare-kiosk-device-trust.md` | Runbook | New | Device trust, kiosk onboarding and offline recovery | MCP-003, MCP-007, MCP-008 | personalliggare, mobile | personalliggare, mobile, backoffice | W2 | B2 |
| `docs/runbooks/annual-close-and-filing-by-legal-form.md` | Runbook | New | Årsslut och filing per företagsform | MCP-003, MCP-007 | annual, close, reporting | annual-reporting, close, reporting | W2 | B2 |
| `docs/runbooks/document-person-payroll-incident-and-repair.md` | Runbook | New | Incidentflöde för dokument med person/lönepåverkan | MCP-003, MCP-007, MCP-008 | documents, classification, payroll | documents, review center, payroll, backoffice | W2 | B3 |
| `docs/runbooks/rulepack-release-rollback-and-hotfix.md` | Runbook | New | Operativ release- och rollback-process för rulepacks | MCP-005, MCP-008 | rule-engine and consumers | rule-engine, backoffice, tests | W1 | B1 |
| `docs/runbooks/review-center-operations.md` | Runbook | New | Queue ownership, escalation and decision ops | MCP-003, MCP-004, MCP-006 | review center | review-center, desktop-web, backoffice | W2 | B3 |
| `docs/runbooks/async-job-retry-replay-and-dead-letter.md` | Runbook | Replace | Uppdatera worker- och replaydrift till persistent jobs, dead-letter och operatörsstöd | MCP-003, MCP-008 | jobs, replay, worker ops | worker, backoffice, integrations | W2 | B1 |
| `docs/runbooks/backup-restore-and-disaster-recovery.md` | Runbook | Replace | Uppdatera restore, replay och disaster recovery mot ny persistent runtime | MCP-003, MCP-008 | runtime, persistence, recovery | core, db, worker, backoffice | W2 | B1 |
| `docs/runbooks/incident-response-and-production-hotfix.md` | Runbook | Replace | Uppdatera incidentflöden för ny ops-, backoffice- och emergency-disable-modell | MCP-003, MCP-008 | incidents, security, ops | backoffice, feature flags, worker, core resilience | W2 | B1 |
| `docs/runbooks/mobile-offline-conflict-repair.md` | Runbook | Replace | Anpassa till ny mobile/personalliggare/field conflict model | MCP-006, MCP-007 | mobile, field, personalliggare | field-mobile, personalliggare, backoffice | W2 | B3 |

## Future test plans

| Path | Document type | New or replace | Purpose | Master docs it depends on | Domains it governs | Code areas it governs | Writing priority | Build priority |
|---|---|---|---|---|---|---|---|---|
| `docs/test-plans/document-person-payroll-agi-tests.md` | Test plan | New | Golden tests för dokument -> person -> payroll -> AGI | MCP-007 | documents, payroll, benefits | document-engine, classification, payroll | W1 | B2 |
| `docs/test-plans/accounting-method-tests.md` | Test plan | New | Kontantmetod/faktureringsmetod och year-end timing | MCP-005, MCP-007 | accounting method, ledger, VAT | accounting-method, ledger, VAT | W1 | B1 |
| `docs/test-plans/fiscal-year-and-broken-year-tests.md` | Test plan | New | Brutet år, short year, period generation and locks | MCP-005, MCP-007 | fiscal year, reporting, annual | fiscal-year, ledger, reporting | W1 | B1 |
| `docs/test-plans/payroll-migration-and-balance-tests.md` | Test plan | New | Lönemigrering, balances, YTD and cutover | MCP-005, MCP-007 | payroll, balances, migration | payroll, balances, migration cockpit | W1 | B2 |
| `docs/test-plans/personalliggare-industry-tests.md` | Test plan | New | Industry packs, kiosks, offline, corrections | MCP-007 | personalliggare | personalliggare, mobile, backoffice | W2 | B2 |
| `docs/test-plans/hus-edge-case-tests.md` | Test plan | New | Accepted, partial, recovery, mandatory fields | MCP-007 | HUS, AR, integrations | HUS, AR, integrations | W1 | B2 |
| `docs/test-plans/ui-role-workbench-tests.md` | Test plan | New | Desktop role flows, workbenches and blockers | MCP-006, MCP-007 | desktop surface | desktop-web, ui-desktop | W2 | B3 |
| `docs/test-plans/mobile-offline-conflict-tests.md` | Test plan | New | Offline sync, repair and device trust | MCP-006, MCP-007 | field-mobile, personalliggare | field-mobile, personalliggare | W2 | B3 |
| `docs/test-plans/rulepack-effective-dating-tests.md` | Test plan | New | Effective dates, historical pinning and rollback | MCP-005 | rule-engine and all rule consumers | rule-engine, consumer domains | W1 | B1 |
| `docs/test-plans/annual-reporting-by-legal-form-tests.md` | Test plan | New | AB, EF, HB, KB and economic association | MCP-007 | annual reporting | annual-reporting, reporting | W2 | B2 |
| `docs/test-plans/tax-account-offset-tests.md` | Test plan | New | Import, match, offset and reconciliation | MCP-007 | tax account, banking, close | tax-account, banking, reporting | W2 | B2 |
| `docs/test-plans/project-payroll-cost-allocation-tests.md` | Test plan | New | Payroll cost into projects | MCP-007 | projects, payroll | projects, payroll | W2 | B3 |
| `docs/test-plans/document-classification-ai-boundary-tests.md` | Test plan | New | Auto-suggest boundaries and mandatory review | MCP-005, MCP-007, MCP-008 | documents, AI, review | rule-engine, documents, review-center | W1 | B2 |
| `docs/test-plans/master-test-strategy.md` | Test plan | Replace | Uppdatera teststrategin med nya bounded contexts och golden catalog | MCP-003, MCP-007 | all | tests/* | W2 | B1 |
| `docs/test-plans/master-verification-gates.md` | Test plan | Replace | Uppdatera verification gates mot nya exit criteria | MCP-001 through MCP-010 | all | tests/*, CI | W2 | B1 |
| `docs/test-plans/golden-data-catalog.md` | Test plan | Replace | Synka med nya golden scenarios och rulepack vectors | MCP-005, MCP-007 | all regulated domains | tests/golden/* | W2 | B1 |

# Replacement map for existing docs

## Existing files that must be replaced in full

- `docs/MASTER_BUILD_PLAN.md`
- `docs/ui/ENTERPRISE_UI_PLAN.md`
- `docs/compliance/se/document-inbox-and-ocr-engine.md`
- `docs/compliance/se/accounting-foundation.md`
- `docs/compliance/se/vat-engine.md`
- `docs/compliance/se/ar-customer-invoicing-engine.md`
- `docs/compliance/se/ap-supplier-invoice-engine.md`
- `docs/compliance/se/payroll-engine.md`
- `docs/compliance/se/benefits-engine.md`
- `docs/compliance/se/personalliggare-engine.md`
- `docs/compliance/se/rot-rut-engine.md`
- `docs/compliance/se/annual-reporting-engine.md`
- `docs/compliance/se/bank-and-payments-engine.md`
- `docs/domain/async-jobs-retry-replay-and-dead-letter.md`
- `docs/domain/submission-receipts-and-action-queue.md`
- `docs/domain/offline-sync-and-conflict-resolution.md`
- `docs/domain/audit-review-support-and-admin-backoffice.md`
- `docs/domain/saved-views-dashboards-and-personalization.md`
- `docs/domain/work-items-deadlines-notifications.md`
- `docs/domain/projects-budget-wip-and-profitability.md`
- `docs/domain/field-work-order-service-order-and-material-flow.md`
- `docs/domain/search-indexing-and-global-search.md`
- `docs/policies/access-attestation-and-signoff-policy.md`
- `docs/policies/accounting-close-correction-and-lock-policy.md`
- `docs/policies/feature-flag-and-emergency-disable-policy.md`
- `docs/policies/support-access-and-impersonation-policy.md`
- `docs/policies/security-admin-and-incident-policy.md`
- `docs/policies/benefits-pension-travel-company-policy.md`
- `docs/runbooks/async-job-retry-replay-and-dead-letter.md`
- `docs/runbooks/backup-restore-and-disaster-recovery.md`
- `docs/runbooks/incident-response-and-production-hotfix.md`
- `docs/runbooks/mobile-offline-conflict-repair.md`
- `docs/test-plans/master-test-strategy.md`
- `docs/test-plans/master-verification-gates.md`
- `docs/test-plans/golden-data-catalog.md`

## Existing file that must be split and replaced by multiple more precise docs

- `docs/domain/work-items-deadlines-notifications.md`  
  Replaced by:
  - `docs/domain/review-center.md`
  - `docs/domain/notification-center.md`
  - `docs/domain/activity-feed.md`
  - plus retained work-item responsibilities in updated domain-core specs

# Superseded shorthand writing order (non-binding)

Detta avsnitt behålls endast som historisk batchsammanfattning. Den bindande och kompletta skrivordningen finns längre ned i detta dokument under `# Future writing order`.

## Order block 1 — must exist before core engine build starts

1. ADR-0022
2. ADR-0023
3. ADR-0024
4. ADR-0029
5. AI decision boundary policy
6. module activation and tenant setup policy
7. signoff and segregation of duties policy
8. accounting-method-engine
9. fiscal-year-and-period-engine
10. person-linked-document-classification-engine
11. rulepack-release-and-rollback-policy
12. ENTERPRISE_UI_RESET
13. PUBLIC_SITE_AND_AUTH_SPEC
14. DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC

## Order block 2 — must exist before core domain expansions stabilize

15. ADR-0025
16. ADR-0026
17. ADR-0027
18. tax-account-and-offset-engine
19. payroll-migration-and-balances-engine
20. collective-agreements-engine
21. review-center domain spec
22. invoice-legal-field-rules-engine
23. document-review-and-economic-decision-policy
24. payroll-migration-policy
25. close-correction-and-reopen-policy
26. accounting-method-tests
27. fiscal-year-and-broken-year-tests
28. rulepack-effective-dating-tests
29. document-person-payroll-agi-tests

## Order block 3 — must exist before advanced operational modules and UI workbenches finalize

30. import-case-engine
31. hus-invoice-and-claim-gates
32. personalliggare-industry-packs
33. egenkontroll
34. kalkyl
35. projects-workspace
36. payroll-workbench-and-ops
37. DESKTOP_INFORMATION_ARCHITECTURE
38. WORKBENCH_CATALOG
39. FIELD_MOBILE_SPEC
40. BACKOFFICE_OPERATIONS_SPEC
41. HUS signing and submission policy
42. personalliggare correction policy
43. ui-role-workbench-tests
44. mobile-offline-conflict-tests
45. hus-edge-case-tests
46. project-payroll-cost-allocation-tests

## Order block 4 — must exist before final close, annual and pilot readiness

47. ADR-0030
48. legal-form-and-declaration-engine
49. annual-reporting-engine replacement
50. annual-close-and-filing-by-legal-form runbook
51. tax-account-reconciliation runbook
52. annual-reporting-by-legal-form-tests
53. tax-account-offset-tests
54. support access and impersonation policy replacement
55. security admin and incident policy replacement
56. emergency-disable-policy
57. master-test-strategy replacement
58. master-verification-gates replacement
59. golden-data-catalog replacement

# Future writing order

All inventory entries above ska antingen listas uttryckligen i blocken nedan eller ersättas i det block där deras efterträdare fryses. Ingen inventariepost får hoppas över.

## Order block 1 — control baseline and early architecture locks

Måste finnas innan faktisk kärnimplementation startar:

1. `docs/MASTER_BUILD_PLAN.md` replacement
2. `docs/adr/ADR-0022-accounting-method-and-fiscal-year-architecture.md`
3. `docs/adr/ADR-0023-review-center-notification-and-activity-separation.md`
4. `docs/adr/ADR-0024-document-person-payroll-chain-architecture.md`
5. `docs/adr/ADR-0025-tax-account-and-offset-architecture.md`
6. `docs/adr/ADR-0026-payroll-migration-balances-and-agreements-architecture.md`
7. `docs/adr/ADR-0029-ui-reset-and-surface-strategy-refresh.md`
8. `docs/policies/ai-decision-boundary-policy.md`
9. `docs/policies/module-activation-and-tenant-setup-policy.md`
10. `docs/policies/signoff-and-segregation-of-duties-policy.md`
11. `docs/policies/rulepack-release-and-rollback-policy.md`
12. `docs/policies/emergency-disable-policy.md`
13. `docs/compliance/se/accounting-method-engine.md`
14. `docs/compliance/se/fiscal-year-and-period-engine.md`
15. `docs/compliance/se/person-linked-document-classification-engine.md`
16. `docs/compliance/se/tax-account-and-offset-engine.md`
17. `docs/compliance/se/payroll-migration-and-balances-engine.md`
18. `docs/compliance/se/collective-agreements-engine.md`
19. `docs/domain/async-jobs-retry-replay-and-dead-letter.md`
20. `docs/runbooks/async-job-retry-replay-and-dead-letter.md`
21. `docs/runbooks/backup-restore-and-disaster-recovery.md`
22. `docs/runbooks/incident-response-and-production-hotfix.md`
23. `docs/test-plans/accounting-method-tests.md`
24. `docs/test-plans/fiscal-year-and-broken-year-tests.md`
25. `docs/test-plans/rulepack-effective-dating-tests.md`
26. `docs/ui/ENTERPRISE_UI_RESET.md`

## Order block 2 — shared domain foundations and cross-domain control

Måste finnas innan kärnexpansioner stabiliseras:

27. `docs/adr/ADR-0027-import-case-and-multi-document-linkage-architecture.md`
28. `docs/compliance/se/import-case-engine.md`
29. `docs/compliance/se/document-inbox-and-ocr-engine.md`
30. `docs/compliance/se/accounting-foundation.md`
31. `docs/compliance/se/vat-engine.md`
32. `docs/compliance/se/bank-and-payments-engine.md`
33. `docs/domain/review-center.md`
34. `docs/domain/submission-receipts-and-action-queue.md`
35. `docs/domain/audit-review-support-and-admin-backoffice.md`
36. `docs/policies/document-review-and-economic-decision-policy.md`
37. `docs/policies/payroll-migration-policy.md`
38. `docs/policies/close-correction-and-reopen-policy.md`
39. `docs/policies/invoice-issuance-and-credit-policy.md`
40. `docs/policies/capitalization-policy.md`
41. `docs/runbooks/rulepack-release-rollback-and-hotfix.md`
42. `docs/test-plans/document-person-payroll-agi-tests.md`
43. `docs/test-plans/document-classification-ai-boundary-tests.md`
44. `docs/ui/PUBLIC_SITE_AND_AUTH_SPEC.md`
45. `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md`

## Order block 3 — finance, payroll, HUS and compliance operations

Måste finnas innan avancerade finansiella och personrelaterade arbetsytor slutlåses:

46. `docs/adr/ADR-0028-personalliggare-industry-pack-and-identity-graph-architecture.md`
47. `docs/compliance/se/invoice-legal-field-rules-engine.md`
48. `docs/compliance/se/ar-customer-invoicing-engine.md`
49. `docs/compliance/se/ap-supplier-invoice-engine.md`
50. `docs/compliance/se/payroll-engine.md`
51. `docs/compliance/se/benefits-engine.md`
52. `docs/compliance/se/hus-invoice-and-claim-gates.md`
53. `docs/compliance/se/personalliggare-engine.md`
54. `docs/compliance/se/rot-rut-engine.md`
55. `docs/domain/notification-center.md`
56. `docs/domain/activity-feed.md`
57. `docs/domain/personalliggare-industry-packs.md`
58. `docs/domain/payroll-workbench-and-ops.md`
59. `docs/domain/tax-account-reconciliation-and-settlement.md`
60. `docs/policies/hus-signing-and-submission-policy.md`
61. `docs/policies/personalliggare-correction-policy.md`
62. `docs/policies/support-access-and-impersonation-policy.md`
63. `docs/policies/security-admin-and-incident-policy.md`
64. `docs/policies/benefits-pension-travel-company-policy.md`
65. `docs/runbooks/payroll-migration-cutover.md`
66. `docs/runbooks/document-person-payroll-incident-and-repair.md`
67. `docs/runbooks/tax-account-reconciliation.md`
68. `docs/runbooks/review-center-operations.md`
69. `docs/runbooks/personalliggare-kiosk-device-trust.md`
70. `docs/test-plans/payroll-migration-and-balance-tests.md`
71. `docs/test-plans/tax-account-offset-tests.md`
72. `docs/test-plans/personalliggare-industry-tests.md`

## Order block 4 — operational modules and surface contracts

Måste finnas innan workbenches, mobile och backoffice slutlåses:

73. `docs/domain/egenkontroll.md`
74. `docs/domain/kalkyl.md`
75. `docs/domain/projects-workspace.md`
76. `docs/domain/projects-budget-wip-and-profitability.md`
77. `docs/domain/field-work-order-service-order-and-material-flow.md`
78. `docs/domain/offline-sync-and-conflict-resolution.md`
79. `docs/domain/saved-views-dashboards-and-personalization.md`
80. `docs/domain/search-indexing-and-global-search.md`
81. `docs/compliance/se/project-billing-and-revenue-recognition-engine.md`
82. `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`
83. `docs/ui/FIELD_MOBILE_SPEC.md`
84. `docs/ui/BACKOFFICE_OPERATIONS_SPEC.md`
85. `docs/ui/WORKBENCH_CATALOG.md`
86. `docs/runbooks/hus-submission-replay-and-recovery.md`
87. `docs/runbooks/mobile-offline-conflict-repair.md`
88. `docs/test-plans/hus-edge-case-tests.md`
89. `docs/test-plans/project-payroll-cost-allocation-tests.md`
90. `docs/test-plans/ui-role-workbench-tests.md`
91. `docs/test-plans/mobile-offline-conflict-tests.md`

## Order block 5 — annual, pilot readiness and legacy retirement

Måste finnas innan slutlig close, annual och pilot readiness:

92. `docs/adr/ADR-0030-legal-form-and-annual-filing-architecture.md`
93. `docs/compliance/se/legal-form-and-declaration-engine.md`
94. `docs/compliance/se/annual-reporting-engine.md`
95. `docs/runbooks/fiscal-year-change-runbook.md`
96. `docs/runbooks/annual-close-and-filing-by-legal-form.md`
97. `docs/test-plans/annual-reporting-by-legal-form-tests.md`
98. `docs/test-plans/master-test-strategy.md`
99. `docs/test-plans/master-verification-gates.md`
100. `docs/test-plans/golden-data-catalog.md`

## Legacy replacement execution rules

Följande replacement- och split-replace-poster får inte skrivas om förrän deras efterträdare ovan är frysta, men de måste fortfarande levereras innan området får markeras klart:

1. `docs/policies/access-attestation-and-signoff-policy.md` ersätts i block 1 när `docs/policies/signoff-and-segregation-of-duties-policy.md` är fryst.
2. `docs/policies/accounting-close-correction-and-lock-policy.md` ersätts i block 2 när `docs/policies/close-correction-and-reopen-policy.md` är fryst.
3. `docs/policies/feature-flag-and-emergency-disable-policy.md` ersätts i block 1 när `docs/policies/module-activation-and-tenant-setup-policy.md` och `docs/policies/emergency-disable-policy.md` är frysta.
4. `docs/domain/work-items-deadlines-notifications.md` split-replace verkställs i block 3 när `docs/domain/review-center.md`, `docs/domain/notification-center.md` och `docs/domain/activity-feed.md` är frysta.
5. `docs/ui/ENTERPRISE_UI_PLAN.md` ersätts eller avpubliceras i block 4 när `docs/ui/ENTERPRISE_UI_RESET.md`, `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`, `docs/ui/FIELD_MOBILE_SPEC.md` och `docs/ui/BACKOFFICE_OPERATIONS_SPEC.md` är frysta.

# Exit gate

Detta manifest är uppfyllt först när följande gäller:

- alla dokument som identifierats i master-control-paketet finns i manifestet
- varje dokument har typ, purpose, beroenden, domäner, kodområden, writing priority och build priority
- replacement map är fullständig för kända befintliga filer som inte längre räcker
- future writing order är konkret och stödjer build-sekvensen
- inga senare dokument får införas utan att antingen läggas till i detta manifest eller uttryckligen ersätta en befintlig manifestpost

