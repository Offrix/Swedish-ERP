> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: MCP-003
- Title: Master Code Impact Map
- Status: Binding control baseline
- Owner: Engineering architecture, platform architecture and product architecture
- Version: 1.0.0
- Effective from: 2026-03-23
- Supersedes: No prior master code impact map
- Approved by: User directive in this control phase
- Last reviewed: 2026-03-23
- Related master docs:
  - docs/master-control/master-rebuild-control.md
  - docs/master-control/master-gap-register.md
  - docs/master-control/master-domain-map.md
  - docs/master-control/master-rulepack-register.md
  - docs/master-control/master-ui-reset-spec.md
  - docs/master-control/master-build-sequence.md
- Related domains:
  - auth and org
  - documents
  - ledger
  - VAT
  - AR
  - AP
  - banking
  - HR
  - time
  - payroll
  - benefits
  - travel
  - pension
  - projects
  - field
  - HUS
  - personalliggare
  - reporting
  - annual reporting
  - integrations
  - review center
  - tax account
  - accounting method
  - fiscal year
- Related code areas:
  - apps/api/src/*
  - apps/desktop-web/src/*
  - apps/field-mobile/src/*
  - apps/worker/src/*
  - packages/auth-core/*
  - packages/document-engine/*
  - packages/rule-engine/*
  - packages/domain-*
  - packages/db/migrations/*
  - packages/db/seeds/*
  - packages/ui-core/*
  - packages/ui-desktop/*
  - packages/ui-mobile/*
  - tests/*
- Related future documents:
  - docs/compliance/se/person-linked-document-classification-engine.md
  - docs/compliance/se/accounting-method-engine.md
  - docs/compliance/se/fiscal-year-and-period-engine.md
  - docs/compliance/se/payroll-migration-and-balances-engine.md
  - docs/compliance/se/collective-agreements-engine.md
  - docs/compliance/se/tax-account-and-offset-engine.md
  - docs/ui/ENTERPRISE_UI_RESET.md

# Purpose

Detta dokument översätter kontrollpaketets gap och domänstyrning till konkret kodpåverkan.

Det avgör:

- vilka existerande paket som ska återanvändas
- vilka existerande paket som ska byggas ut
- vilka existerande paket som ska skrivas om
- vilka nya bounded contexts som måste till
- vilka API-rutter som ska hårdas eller införas
- vilka migrationsområden som ska till
- vilka worker- och replayområden som måste skapas
- vilka UI-skal som ska kasseras eller byggas om
- vilka testytor som ska byggas ut

Detta dokument är inte en generell teknisk översikt. Det är den bindande kodändringskartan för Codex.

# How to read the map

## Åtgärdstyper

- **Reuse**: återanvänd i huvudsak oförändrat, med bara lokala anpassningar
- **Extend**: behåll nuvarande package eller filområde som kärna men bygg ut tydligt
- **Rewrite**: skriv om huvuddelen av lagret eller ytan men behåll eventuellt namn eller plats
- **New**: skapa nytt package, ny domän eller ny appyta
- **Split**: bryt ut ansvar som idag ligger för grovt i en större modul
- **Harden**: lägg till persistence, recovery, audit, replay, performance och operatörsstöd utan att ändra kärnsyfte

## Kodnivåer

- **App layer**: `apps/*`
- **Domain layer**: `packages/domain-*`
- **Cross-cutting engines**: `packages/auth-core`, `packages/document-engine`, `packages/rule-engine`, `packages/events`, `packages/integration-core`
- **Persistence layer**: `packages/db`
- **UI packages**: `packages/ui-*`
- **Verification layer**: `tests/*`

## Bindande tolkningsregel

När ett package redan finns men saknar full motor ska Codex inte skapa lokala specialfall i andra paket. Rätt åtgärd är att utöka eller bryta ut rätt bounded context.

# Cross-cutting code changes

## 1. Shared outbox, job and replay envelope

Följande måste införas eller hårdas tvärgående:

- persistent job records
- job type registry
- idempotency keys
- attempt history
- timeout handling
- dead-letter queues
- replay plans
- replay execution records
- operator notes
- correlation IDs
- domain event envelope
- submission envelope
- audit envelope

Berör:

- `apps/worker/src/worker.mjs`
- `apps/api/src/platform.mjs`
- `packages/domain-core/src/resilience.mjs`
- `packages/domain-integrations/src/index.mjs`
- `packages/db/migrations/*`
- `tests/integration/phase14-resilience-api.test.mjs`
- `tests/e2e/phase14-resilience-flow.test.mjs`

## 2. Shared rulepack runtime contract

Följande måste bli gemensam kontraktsnivå:

- rulepack metadata
- effective dating
- rulepack version identity
- historical evaluation pinning
- evaluation result schema
- test vector registration
- rollback semantics
- audit fields
- consumer contract between engine, UI and test

Berör:

- `packages/rule-engine/src/index.mjs`
- `packages/domain-vat/src/index.mjs`
- `packages/domain-payroll/src/index.mjs`
- `packages/domain-benefits/src/index.mjs`
- nya packages för accounting method, fiscal year, tax account, balances och collective agreements
- `packages/db/migrations/*`

## 3. Shared review decision envelope

Alla review-beslut ska återanvända samma kärnstruktur:

- review item ref
- owning domain
- decision type
- decision payload
- override reason
- actor
- timestamp
- evidence refs
- resulting command
- audit event ref

Berör:

- `packages/domain-core`
- `packages/document-engine`
- `packages/domain-vat`
- `packages/domain-payroll`
- `packages/domain-hus`
- `apps/api`
- `apps/desktop-web`

## 4. Shared immutable correction pattern

Alla domäner som har historiska, reglerade eller finansiella objekt ska följa samma rättelsemönster:

- original record bevaras
- correction record pekar bakåt
- reversal eller superseding record bär förändringen
- signed eller submitted state får aldrig skrivas över
- reopen och correction ska vara explicit

Berör:

- ledger
- VAT
- payroll AGI
- HUS
- annual reporting
- close
- personalliggare corrections
- submissions and receipts

# Package-by-package impact map

## App layer

| Code area | Current repo role | Required action | Exact change required | Why change is mandatory |
|---|---|---|---|---|
| `apps/api/src/server.mjs` | Entrypoint för API-server | Extend | Dela upp route registration per bounded context. Inför tydlig bootstrap för nya domäner: accounting method, fiscal year, document classification, import case, balances, collective agreements, tax account, review center. | Nuvarande server kan bära fler routes men saknar slutlig domänregistrering för de saknade motorerna. |
| `apps/api/src/platform.mjs` | Plattformsfacade som håller samman domäner | Rewrite | Gör om till explicit platform composition root. Varje domän ska injiceras med egna beroenden, inte växa i monolitisk plattformsklass. Lägg till service registry, outbox/replay hooks och search projection registry. | Nuvarande platform-lager riskerar att bli en allmän “allt-i-ett”-koordinator. |
| `apps/api/src/route-helpers.mjs` | Gemensamma hjälpfunktioner för routes | Extend | Lägg till helper-stöd för idempotency keys, conditional requests, review decision envelopes, pagination contracts, actor capture och support-mode restrictions. | Alla nya routes kräver enhetlig säkerhet, felmodell och audit. |
| `apps/api/src/phase13-routes.mjs` | Publikt API, webhooks, partner, automation | Split and Extend | Behåll public API- och partnerdelar, men bryt ut automation-routes till separat automation route-modul som uttryckligen läser AI decision boundary policy. | Phase13-filen blandar externa kontrakt med intern automationstyrning. |
| `apps/api/src/phase14-routes.mjs` | Backoffice, security, resilience, migration, feature flags | Split and Extend | Bryt ut till separata routefiler för backoffice, ops/resilience, migration och feature flags. Lägg till nya backoffice-routes för replay explorer, review queue operations och tax account reconciliation. | Nuvarande fil är för grov och kommer annars växa okontrollerat. |
| `apps/desktop-web/src/server.mjs` | Enkel desktop shell | Rewrite | Bygg om till full desktop surface med route tree för workbenches, global search, object profiles, review center, notification center och backoffice entry. | Nuvarande shell är inte tillräckligt som slutlig produkt. |
| `apps/field-mobile/src/server.mjs` | Enkel mobile shell | Rewrite | Bygg om till tydlig field-mobile app med offline queue, local envelope storage, sync resolution och task-oriented tabs. | Nuvarande mobile yta är bara en stomme. |
| `apps/worker/src/worker.mjs` | Heartbeat-/dummy-worker | Rewrite | Bygg verklig persistent job runtime med polling, claiming, retry classes, dead-letter, replay, scheduled jobs, metrics och poison-message handling. | Detta är ett av repo:ts mest falskt färdiga områden. |
| `apps/public-web` | Saknas | New | Skapa ny publik appyta för landningssida, produktsidor, security/trust, integrationssida, kontaktflöden och demo-entry. | Publik yta ska inte byggas som eftertanke i desktop-shell. |
| `apps/backoffice` | Saknas som separat app | New | Skapa ny operatörs- och supportyta med audit explorer, support cases, impersonation, access reviews, break glass, replay och tenant setup. | Backoffice måste vara separat från vanlig användaryta. |

## Cross-cutting and core packages

| Code area | Current repo role | Required action | Exact change required | Why change is mandatory |
|---|---|---|---|---|
| `packages/auth-core` | Rollmatris, TOTP, passkeys, auth helpers | Extend | Lägg till device trust primitives, session risk levels, step-up challenge state, stronger support impersonation restrictions och policy-aware MFA escalation. | Enterprise auth behöver mer än grundläggande sessioner och faktorer. |
| `packages/domain-org-auth` | Organisation, roller, onboarding, auth workflows | Extend | Lägg till tenant setup states, module activation dependency checks, company profile completeness gates, external signatory roles och support access scopes. | Domänen behöver bära både onboarding och långsiktig tenantstyrning. |
| `packages/domain-core/src/backoffice.mjs` | Support/access review/break-glass-bas | Extend | Gör detta till kärna för backoffice domain objects men flytta notiser och aktivitet till separata moduler under domain-core. | Backoffice ska inte ensam bära allt operativt kringarbete. |
| `packages/domain-core/src/close.mjs` | Close/workbench/blockers | Extend | Integrera fiscal year engine, legal-form engine, tax account reconciliation refs och stricter reopen control. | Close kan inte vara kalenderårstunn eller skattekontolös. |
| `packages/domain-core/src/migration.mjs` | Migration and cutover base | Extend | Lägg till payroll migration, balances migration, rulepack freeze snapshots och cutover dependencies per domain. | Nuvarande migration täcker inte de nya kärnbehoven. |
| `packages/domain-core/src/resilience.mjs` | Resilience concepts | Rewrite and Harden | Gör detta till central runtime module för job health, replay plans, restore drill registry, chaos scenario registry och incident hooks. | Detta måste bli verklig driftkärna, inte bara en konceptmodul. |
| `packages/events` | Event contracts | Extend | Definiera canonical event envelope, domain event names, replay event metadata och audit correlation contract. | Cross-domain flows kräver en gemensam events-bas. |
| `packages/integration-core` | Integrationsbas i TypeScript | Extend | Standardisera adapters, credentials, retries, transport policies, submission adapters och receipt normalization. | Externa integrationer måste ha gemensamt kontrakt. |
| `packages/document-engine` | Dokumentarkiv, inbox, OCR, review tasks | Extend | Lägg till person-linked classification hooks, import-case attachment hooks, evidence snapshots, stronger quarantine flows och domain projection contract. | Dokumentmotorn måste bli källan till mer än lagring och OCR. |
| `packages/rule-engine` | Rulepacks och automation | Rewrite and Extend | Dela rulepack registry och AI/automation engine tydligare. Lägg till evaluation ledger, effective dating, rollback support, golden vector catalog hooks och policy-enforced AI boundaries. | Nuvarande rule-engine är för smal för hela regelpaketssystemet. |

## Business domain packages to extend

| Code area | Current repo role | Required action | Exact change required | Why change is mandatory |
|---|---|---|---|---|
| `packages/domain-ledger` | Journaler, perioder, kontoplan, vouchers | Extend | Integrera accounting method, fiscal year, configurable series, tax account refs, stronger correction metadata och historical method pinning. | Ledger måste vara canonical men behöver fler motorer runt sig. |
| `packages/domain-vat` | VAT decisions, review queue, declarations | Extend | Integrera accounting method, import case, credit note mirror, unsupported-case queue, declaration blockers och stronger box validation. | Moms är stark men inte tillräckligt hård i edge cases. |
| `packages/domain-ar` | Customers, quotes, invoices, open items, collections | Extend | Inför invoice legal field gates, HUS-aware issuance, export/EU validation, stronger customer portal views, revision-locked quotes och project-billing links. | Fakturor måste blockeras före issue när fält saknas eller scenario är fel. |
| `packages/domain-ap` | Suppliers, PO, receipts, supplier invoices, matching | Extend | Integrera import cases, person-linked documents, better variance states, stronger payment readiness checks och fuller invoice-to-payment chain. | AP måste stödja verkliga svenska import- och personpåverkande fall. |
| `packages/domain-banking` | Bank accounts, payment proposals/orders | Extend | Lägg till tax account bridging, bank return failure states, payout recovery, idempotent bank export receipts och stronger matching evidence. | Pengarörelser måste bli säkra och reproducerbara. |
| `packages/domain-hr` | Employee master, leave signals | Extend | Lägg till stronger employment snapshots, worker categories, external contractor identity links och payroll migration anchors. | HR är idag bas men inte full person- och anställningskälla för alla flöden. |
| `packages/domain-time` | Time, balances, schedules | Extend and Partial Split | Flytta generell balances-motor till nytt package men behåll time entries och scheduling här. Lägg till payroll allocation refs och project split validation. | Tid får inte samtidigt äga alla balansregler. |
| `packages/domain-payroll` | Pay items, pay runs, AGI, postings, payouts | Extend | Integrera balances, collective agreements, payroll migration, project cost allocation, stronger AGI correction chain och review center hooks. | Lön är bred men saknar avgörande svenska driftmotorer. |
| `packages/domain-benefits` | Benefit catalog and events | Extend | Integrera person-linked document classification, annual threshold packs, payroll bridge, net deduction scenarios och richer audit evidence. | Förmåner måste bli del av dokument->person->lön-kedjan. |
| `packages/domain-travel` | Claims and allowances | Extend | Lägg till stronger rulepack usage, benefit bridge, project allocation, document links och payroll interaction states. | Resor och traktamente måste samspela med lön och projekt. |
| `packages/domain-pension` | Pension plans, events, salary exchange | Extend | Lägg till stronger payroll bridge, tax account effects, collective agreement interaction och explicit special payroll tax support. | Pension är reglerat och måste kunna följas till bokföring och skatt. |
| `packages/domain-projects` | Project master, budgets, snapshots, change orders | Major Extend | Lägg till memberships, workspace projections, materialized actuals, payroll cost ingestion, HUS links, egenkontroller, kalkyl links och fuller billing basis. | Projekt måste bli en riktig arbetsyta, inte bara en budgetmodell. |
| `packages/domain-field` | Work orders, dispatch, inventory, mobile today | Extend | Integrera project workspace, self-checks, signatures, offline sync metadata, personalliggare hooks och simplified expense capture. | Fältflöden måste bindas till projekt och quality/compliance. |
| `packages/domain-hus` | HUS case lifecycle, claims, payouts, recoveries | Extend | Lägg till invoice/payment/claim gating, buyer/property validation, partial approval normalization och customer debt transfer logic. | HUS får inte lämnas till halvautomatisk klassning. |
| `packages/domain-personalliggare` | Sites, registrations, attendance, kiosk, exports | Major Extend | Lägg till workplace abstraction, employer snapshot, contractor snapshot, identity graph, device trust, offline envelope intake och industry packs. | Modulen är för byggspecifik i nuvarande form. |
| `packages/domain-reporting` | Reports, snapshots, reconciliations, exports | Extend | Integrera fiscal year, tax account, legal-form awareness, saved views and cross-domain report lineage. | Reporting måste läsa nya motorer, inte hårdkodad periodlogik. |
| `packages/domain-annual-reporting` | Packages, versions, signatories, declarations | Major Extend | Lägg till legal-form engine integration, filing adapters, correction flows, evidence pack generation och year-end gating. | Årsslut och filing ser starkare ut än de är. |
| `packages/domain-integrations` | Public API, partner integrations, submissions | Extend | Standardisera submission ownership per domain, receipt normalization, action queues, adapter capabilities and technical vs business outcome separation. | Submission-kedjan måste bli gemensam och konsekvent. |

## New bounded contexts to add

| New bounded context | Proposed package | Purpose | Source of truth objects | Why new context is mandatory |
|---|---|---|---|---|
| Accounting Method | `packages/domain-accounting-method` | Modellera kontantmetod kontra faktureringsmetod och bokslutsuppbokningar | accounting method profile, method change request, year-end method adjustments | Detta ansvar får inte spridas mellan AR, AP, VAT och ledger. |
| Fiscal Year | `packages/domain-fiscal-year` | Modellera räkenskapsår, brutet år, periodgenerering och change control | fiscal year, period, period calendar, period lock relation, year change request | Kalenderårsantaganden måste brytas ut och centraliseras. |
| Document Classification | `packages/domain-document-classification` | Klassning av dokument med personkoppling, split, behandling, payroll impact | classification case, document split, person link, payroll impact intent, asset/import flags | Detta är den saknade länken mellan dokument och ekonomi/lön. |
| Import Cases | `packages/domain-import-cases` | Hålla ihop inköpsfaktura, tull, spedition, importmoms och efterföljande kostnader | import case, import leg, customs assessment, freight attachment, settlement status | Importer kan inte hanteras säkert i AP eller VAT var för sig. |
| Tax Account | `packages/domain-tax-account` | Skattekonto, kvittning, ränta, avgift, återbetalning och avvikelse | tax account event, offset record, reconciliation item, balance snapshot | Skattebilden måste få en egen subledger. |
| Payroll Balances | `packages/domain-balances` | Generisk bank- och saldohantering för semester, komp, flex och avtalssaldon | balance type, balance transaction, balance snapshot, carry-forward record | Saldohantering får inte vara hårdkodad i time eller payroll. |
| Collective Agreements | `packages/domain-collective-agreements` | Versionerade kollektivavtal och löneregler | agreement family, agreement version, agreement mapping, agreement rule set | Svensk lön kräver explicit avtalsmotor. |
| Review Center | `packages/domain-review-center` | Domänöverskridande review-item, beslut, SLA, queue ownership | review queue, review item, decision, escalation, assignment | Review ska inte gömmas i documents eller work items. |
| Activity | `packages/domain-activity` | Affärsaktivitet i mänsklig form, separat från audit och notiser | activity event, actor context, object context, visibility scope | Activity feed måste vara egen modell. |
| Notifications | `packages/domain-notifications` | Kortlivade notifieringar med severity, ack och delivery state | notification, notification delivery, notification preference, escalation | Notiser får inte blandas med work items. |
| Egenkontroll | `packages/domain-egenkontroll` | Mallar, checklistor, avvikelser, sign-off och bildbevis | template family, template version, checklist instance, deviation, sign-off | Fältverksamheten saknar kvalitetsmotor utan detta. |
| Kalkyl | `packages/domain-kalkyl` | Mängder, material, UE, risk, påslag, versioner och offertkoppling | estimate, estimate version, quantity basis, cost line, scenario | Offert och projektbudget kräver egen kalkyldomän. |

## Existing bounded contexts to rewrite or extend

| Existing bounded context | Action | Reason |
|---|---|---|
| `domain-ledger` | Extend | Behåll som enda bokföringssanning men integrera nya method/fiscal/tax engines. |
| `domain-vat` | Extend | Behåll momskärnan men gör unsupported/review/import/credit-stöd hårdare. |
| `domain-payroll` | Extend | Behåll kärnan men bygg ut för migration, balances och agreements. |
| `domain-projects` | Major extend | Gör om från budgetkärna till full arbetsyta. |
| `domain-personalliggare` | Major extend | Bredda från bygg till industry packs och identity graph. |
| `domain-annual-reporting` | Major extend | Gör legal-form-aware, filing-safe och evidence-complete. |
| `domain-integrations` | Extend | Förvandla submissions till gemensam plattform. |
| `document-engine` | Extend | Behåll intake och OCR men gör klassningskoppling förstaklassig. |
| `rule-engine` | Rewrite and extend | Regelpaketsruntime måste mogna och skiljas från AI-lagret. |
| `domain-core` | Split and extend | Dela review, notifications och activity tydligare från close/backoffice/migration. |
| `apps/desktop-web` | Rewrite | Nuvarande yta räcker inte som produkt. |
| `apps/field-mobile` | Rewrite | Nuvarande yta räcker inte som fältprodukt. |
| `apps/worker` | Rewrite | Nuvarande worker är inte en verklig runtime. |

# API routes to add or change

## Existing route families that must be hardened

| Existing route family | Required change |
|---|---|
| `/v1/ledger/accounting-periods*` | Måste läsa från fiscal-year engine, inte intern förenklad periodmodell. Reopen måste kräva explicit reopen request och audit reason. |
| `/v1/ledger/voucher-series` | Måste bli tenantkonfigurerad och knytas till series policy, import preservation och periodspärrar. |
| `/v1/ar/invoices*` | `issue` måste blockera på legal field rules, VAT gates och HUS gates. `deliver` får inte ske om issue-blockers finns. |
| `/v1/ap/invoices*` | `post` måste läsa import-case, person-linked document decisions och stronger match variance states. |
| `/v1/payroll/pay-runs*` | `approve` måste kontrollera balances, agreements, unresolved benefit events, migration diff flags och project allocation prerequisites. |
| `/v1/payroll/agi-submissions*` | Correction flow måste bli append-only, receipt-safe och tax-account-aware. |
| `/v1/hus/cases*` och `/v1/hus/claims*` | Måste få blockerande buyer/property/payment validation, partial acceptance normalization och recovery debt transfer logic. |
| `/v1/personalliggare/sites*` | Måste breddas till site/workplace/industry pack-modell och identity graph. |
| `/v1/migration/*` | Måste utökas med payroll migration, balance imports, agreement mapping och parallel-run diff resolution. |
| `/v1/jobs*` | Måste flyttas från tunn kontrollroute till verklig persistent job control with replay plan. |
| `/v1/review-tasks*` | Måste bli underliggande dokumentreview-route. Den domänöverskridande ytan ska ligga i `/v1/review-center/*`. |
| `/v1/automation/*` | Måste tvingas genom AI decision boundary policy, confidence gating och override recording. |
| `/v1/submissions*` | Måste använda standardiserad technical ack, business ack, final ack, action queue och replay restrictions. |
| `/v1/backoffice/*` | Måste kompletteras med replay explorer, tax account reconcile actions och review queue ops. |

## New route families to add

### Accounting method and fiscal year
- `GET /v1/accounting-method`
- `PUT /v1/accounting-method`
- `POST /v1/accounting-method/change-requests`
- `GET /v1/accounting-method/change-requests/:requestId`
- `GET /v1/fiscal-years`
- `POST /v1/fiscal-years`
- `GET /v1/fiscal-years/:fiscalYearId`
- `GET /v1/fiscal-years/:fiscalYearId/periods`
- `POST /v1/fiscal-years/change-requests`
- `POST /v1/fiscal-years/change-requests/:requestId/approve`

### Document classification and import cases
- `POST /v1/documents/:documentId/classification-cases`
- `GET /v1/documents/:documentId/classification-cases`
- `POST /v1/documents/:documentId/classification-cases/:caseId/decide`
- `POST /v1/documents/:documentId/splits`
- `POST /v1/documents/:documentId/person-links`
- `POST /v1/documents/:documentId/payroll-impacts`
- `GET /v1/import-cases`
- `POST /v1/import-cases`
- `GET /v1/import-cases/:importCaseId`
- `POST /v1/import-cases/:importCaseId/attach-document`
- `POST /v1/import-cases/:importCaseId/recalculate`

### Review center, notifications and activity
- `GET /v1/review-center/queues`
- `GET /v1/review-center/items`
- `GET /v1/review-center/items/:reviewItemId`
- `POST /v1/review-center/items/:reviewItemId/claim`
- `POST /v1/review-center/items/:reviewItemId/decide`
- `GET /v1/notifications`
- `POST /v1/notifications/:notificationId/ack`
- `GET /v1/activity`
- `GET /v1/work-items`
- `POST /v1/work-items/:workItemId/claim`

### Payroll migration, balances and agreements
- `POST /v1/payroll/migrations`
- `GET /v1/payroll/migrations/:migrationId`
- `POST /v1/payroll/migrations/:migrationId/validate`
- `POST /v1/payroll/migrations/:migrationId/finalize`
- `POST /v1/payroll/balance-types`
- `POST /v1/payroll/balance-imports`
- `GET /v1/payroll/balance-snapshots`
- `POST /v1/payroll/collective-agreements`
- `POST /v1/payroll/collective-agreements/:agreementId/publish`

### Tax account
- `GET /v1/tax-account/events`
- `POST /v1/tax-account/imports`
- `GET /v1/tax-account/reconciliations`
- `POST /v1/tax-account/reconciliations`
- `POST /v1/tax-account/offsets`

### Personalliggare industry packs
- `GET /v1/personalliggare/workplaces`
- `POST /v1/personalliggare/workplaces`
- `GET /v1/personalliggare/identities`
- `POST /v1/personalliggare/kiosk-devices/:deviceId/trust`
- `POST /v1/personalliggare/offline-envelopes`

### Projects, egenkontroll and kalkyl
- `GET /v1/projects/:projectId/workspace`
- `POST /v1/projects/:projectId/memberships`
- `POST /v1/projects/:projectId/quality-checklists`
- `POST /v1/projects/:projectId/estimates`
- `GET /v1/egenkontroll/templates`
- `POST /v1/egenkontroll/templates`
- `GET /v1/kalkyl/estimates`
- `POST /v1/kalkyl/estimates`

# Migrations to add

## New migration files after current phase14 track

Följande migrationsfiler ska läggas till som nästa sammanhängande block efter nuvarande `packages/db/migrations/20260322210000_phase14_migration_cockpit.sql`:

| Proposed migration file | Purpose |
|---|---|
| `20260323000000_phase15_accounting_method_and_fiscal_year.sql` | Accounting method profiles, fiscal years, fiscal periods, period calendars, year change requests |
| `20260323010000_phase15_ledger_series_and_tax_account.sql` | Configurable voucher and invoice series, tax account events, offset records, reconciliation snapshots |
| `20260323020000_phase15_document_classification_person_link.sql` | Classification cases, document splits, person links, payroll impact intents, decision lineage |
| `20260323030000_phase15_import_cases.sql` | Import cases, customs legs, freight/spedition attachments, case states |
| `20260323040000_phase15_review_center_notifications_activity.sql` | Review queues, review items, decisions, notifications, activity events, preferences |
| `20260323050000_phase15_balances_and_collective_agreements.sql` | Balance types, balance transactions, agreement families, agreement versions, mappings |
| `20260323060000_phase15_payroll_migration.sql` | Payroll migration batches, YTD imports, diff reports, mapping sets, signoffs |
| `20260323070000_phase15_personalliggare_industry_packs.sql` | Workplace abstraction, employer snapshots, contractor snapshots, industry packs, device trust |
| `20260323080000_phase15_egenkontroll_and_kalkyl.sql` | Egenkontroll templates, checklist instances, deviations, estimate versions, quantity bases |
| `20260323090000_phase15_ui_saved_views_and_workspace_state.sql` | Saved views, list preferences, preview layout preferences, workbench state persistence |
| `20260323100000_phase15_submission_receipt_hardening.sql` | Submission normalization, action queue expansion, replay restrictions, external receipt typing |
| `20260323110000_phase15_search_projection_registry.sql` | Search projection registry, indexing status, projection lineage |

## Seed strategy requirements

För varje ny migration ovan ska motsvarande seed- och demo-seed-filer läggas till med samma fasnummer och tydliga namn. Demo-seeds får aldrig utgöra enda källa till obligatorisk systemkonfiguration.

# Worker/job runtime changes

## Job families to add

| Job family | Owning domain | Trigger | Idempotency key | Dead-letter rule |
|---|---|---|---|---|
| `document_ingest` | documents | inbound email, upload, API ingest | message id or file hash | after max attempts or malware/policy violation |
| `ocr_run` | documents | accepted document without OCR snapshot | document id + version id + OCR profile | dead-letter on repeated provider failure |
| `document_classification_suggestion` | document classification | OCR completed or manual re-run | document id + extraction snapshot id | dead-letter on unsupported document structure |
| `import_case_rebuild` | import cases | new linked customs/freight document | import case id + linked doc id | dead-letter on inconsistent totals |
| `payment_order_submit` | banking | approved payment proposal | payment order id + export version | dead-letter on provider contract errors |
| `bank_return_import` | banking | bank webhook or file import | provider message id | dead-letter on schema mismatch |
| `payroll_payslip_render` | payroll | approved pay run | pay run id + employment id + version | dead-letter on rendering exception |
| `agi_submission_send` | payroll/integrations | validated AGI submission | submission id + version id | dead-letter on forbidden retry class |
| `vat_submission_send` | VAT/integrations | validated VAT declaration | submission id + version id | dead-letter on business nack requiring review |
| `hus_claim_send` | HUS/integrations | claim ready after gating | submission id + version id | dead-letter on missing buyer/property data |
| `annual_filing_send` | annual reporting/integrations | signed filing package | submission id + version id | dead-letter on signature or schema error |
| `report_export_build` | reporting | export request | export job id + version | dead-letter on unsupported query state |
| `search_reindex` | search/core | projection invalidation | object type + object id + projection version | dead-letter on mapping conflict |
| `notification_dispatch` | notifications | notification created | notification id + channel | dead-letter on repeated delivery failure |
| `mobile_sync_repair` | field/personalliggare | conflict detected | envelope id + resolution version | dead-letter on irreconcilable divergence |
| `replay_execution` | core/resilience | operator replay | replay plan id + execution ordinal | dead-letter only after operator abort or repeated invariant breach |

## Worker runtime implementation requirements

- claiming ska ske mot persistent jobs-tabell
- status ska vara minst `queued`, `claimed`, `running`, `completed`, `failed`, `dead_lettered`, `replayed`
- attempts ska vara append-only
- replay ska skapa ny attempt-serie, inte skriva över historiken
- job payload ska versionsmärkas
- worker ska skriva structured audit event för claim, fail, replay och dead-letter
- job visibility ska exponeras i backoffice
- every retry class must be explicit: automatic, manual only, forbidden

# UI surface changes

## New or rebuilt surface map

| Surface | Code area | Action | Required outcome |
|---|---|---|---|
| Public site | `apps/public-web` | New | Premium enterprise marketing, trust architecture, product narrative, role segmentation |
| Auth and onboarding | `apps/public-web` + `apps/desktop-web` auth shell | Rewrite | Strong auth, step-up, passkeys, BankID, tenant-aware onboarding |
| Desktop shell | `apps/desktop-web` | Rewrite | Global nav, command bar, search, notifications, activity, work items, review entry |
| Finance workbenches | `apps/desktop-web` + `packages/ui-desktop` | Rewrite | AP, AR, bank, VAT, close, ledger explorer as first-class workbenches |
| Payroll workbenches | `apps/desktop-web` + `packages/ui-desktop` | New/Rewrite | Payroll calendar, exceptions, balances, agreements, AGI, migration cockpit |
| Project workspace | `apps/desktop-web` + `packages/ui-desktop` | Rewrite | Project control, budgets, actuals, HUS, personalliggare, egenkontroll, kalkyl links |
| Field mobile | `apps/field-mobile` + `packages/ui-mobile` | Rewrite | Today, jobs, check-in, time, materials, photos, signatures, self-checks, expenses |
| Backoffice | `apps/backoffice` | New | Support, impersonation, audit explorer, replay, flags, tax account ops |
| Design system | `packages/ui-core` | Rewrite and Harden | Shared object profile anatomy, table system, form blocks, state language |
| Desktop component library | `packages/ui-desktop` | Rewrite | Dense enterprise data components, preview panes, bulk action bars, workbench chrome |
| Mobile component library | `packages/ui-mobile` | Rewrite | Offline-aware, thumb-friendly, low-latency field patterns |

# Test impact map

## Existing test suites to retain and extend

| Existing area | Keep | Extend with |
|---|---|---|
| `tests/unit/*phase3*`, `tests/integration/*phase3*`, `tests/e2e/*phase3*` | Yes | fiscal year, accounting method, tax account, series flexibility |
| `tests/unit/*phase4*`, `tests/integration/*phase4*`, `tests/e2e/*phase4*` | Yes | import cases, reverse charge edge cases, credit note mirror cases |
| `tests/unit/*phase8*`, `tests/integration/*phase8*`, `tests/e2e/*phase8*` | Yes | balances, agreements, migration, AGI correction, project cost allocation |
| `tests/unit/*phase10*`, `tests/integration/*phase10*`, `tests/e2e/*phase10*` | Yes | personalliggare industry packs, HUS gating, egenkontroll, kalkyl, field-mobile offline |
| `tests/unit/*phase12*`, `tests/integration/*phase12*`, `tests/e2e/*phase12*` | Yes | legal-form engine, broken year, declarations, receipts, correction paths |
| `tests/golden/rule-pack-fixture.test.mjs` | Yes | full rulepack vector matrix with effective dating and historical replay |
| `tests/integration/repo-structure.test.mjs` | Yes | enforce new package and app structure |
| `tests/e2e/apps-smoke.test.mjs` | Yes | include public-web and backoffice app smoke tests |

## New test families to add

- `tests/unit/accounting-method-*.test.mjs`
- `tests/unit/fiscal-year-*.test.mjs`
- `tests/unit/document-classification-*.test.mjs`
- `tests/unit/import-case-*.test.mjs`
- `tests/unit/balances-*.test.mjs`
- `tests/unit/collective-agreements-*.test.mjs`
- `tests/unit/tax-account-*.test.mjs`
- `tests/unit/review-center-*.test.mjs`
- `tests/unit/notifications-*.test.mjs`
- `tests/unit/activity-*.test.mjs`
- `tests/unit/egenkontroll-*.test.mjs`
- `tests/unit/kalkyl-*.test.mjs`

- `tests/integration/accounting-method-api.test.mjs`
- `tests/integration/fiscal-year-api.test.mjs`
- `tests/integration/document-classification-api.test.mjs`
- `tests/integration/import-case-api.test.mjs`
- `tests/integration/payroll-migration-api.test.mjs`
- `tests/integration/collective-agreements-api.test.mjs`
- `tests/integration/tax-account-api.test.mjs`
- `tests/integration/review-center-api.test.mjs`
- `tests/integration/personalliggare-industry-api.test.mjs`
- `tests/integration/egenkontroll-api.test.mjs`
- `tests/integration/kalkyl-api.test.mjs`

- `tests/e2e/document-person-payroll-flow.test.mjs`
- `tests/e2e/accounting-method-flow.test.mjs`
- `tests/e2e/fiscal-year-broken-year-flow.test.mjs`
- `tests/e2e/hus-edge-case-flow.test.mjs`
- `tests/e2e/payroll-migration-flow.test.mjs`
- `tests/e2e/personalliggare-kiosk-offline-flow.test.mjs`
- `tests/e2e/annual-reporting-legal-form-flow.test.mjs`
- `tests/e2e/tax-account-offset-flow.test.mjs`
- `tests/e2e/desktop-role-workbench-flow.test.mjs`
- `tests/e2e/mobile-offline-conflict-flow.test.mjs`

# Reuse vs rewrite map

## Reuse as-is or near as-is

- `packages/events`
- parts of `packages/auth-core`
- parts of `packages/domain-ledger`
- parts of `packages/domain-vat`
- parts of `packages/domain-ar`
- parts of `packages/domain-ap`
- parts of `packages/domain-payroll`
- parts of `packages/domain-hus`
- parts of `packages/domain-integrations`
- parts of `tests/golden` and existing phase suites

## Reuse but extend heavily

- `packages/document-engine`
- `packages/rule-engine`
- `packages/domain-core`
- `packages/domain-banking`
- `packages/domain-hr`
- `packages/domain-time`
- `packages/domain-benefits`
- `packages/domain-travel`
- `packages/domain-pension`
- `packages/domain-projects`
- `packages/domain-field`
- `packages/domain-personalliggare`
- `packages/domain-reporting`
- `packages/domain-annual-reporting`
- `packages/db`
- `apps/api`

## Rewrite

- `apps/worker`
- `apps/desktop-web`
- `apps/field-mobile`
- large parts of `packages/ui-core`
- large parts of `packages/ui-desktop`
- large parts of `packages/ui-mobile`

## New

- `apps/public-web`
- `apps/backoffice`
- `packages/domain-accounting-method`
- `packages/domain-fiscal-year`
- `packages/domain-document-classification`
- `packages/domain-import-cases`
- `packages/domain-tax-account`
- `packages/domain-balances`
- `packages/domain-collective-agreements`
- `packages/domain-review-center`
- `packages/domain-notifications`
- `packages/domain-activity`
- `packages/domain-egenkontroll`
- `packages/domain-kalkyl`

# Dependency map

## Hard dependencies

1. Worker runtime hardening must precede heavy use of submissions, replay, notification delivery and OCR expansion.
2. Rulepack registry hardening must precede accounting method, fiscal year, balances, agreements and tax account engines.
3. Accounting method and fiscal year must precede ledger hardening, VAT hardening and annual reporting hardening.
4. Document classification must precede full private spend, benefits-from-document, payroll-impact documents and import-case behavior.
5. Balances and agreements must precede payroll migration completion and serious payroll pilot readiness.
6. Invoice legal field rules must precede final AR billing UI.
7. HUS gates must precede final HUS invoice and claim UI.
8. Personalliggare industry packs must precede final field-mobile attendance UX.
9. Legal-form engine must precede annual reporting as a final product.
10. Design system and desktop shell may start only after object profile standard and major domain contract freeze are done.

## Safe parallel work after prerequisites are met

- Tax account engine can proceed in parallel with document classification after rulepack hardening and ledger contract freeze.
- Review center and notifications/activity split can proceed in parallel after shared job envelope and domain-core split strategy are frozen.
- Balances engine and collective agreements engine can proceed in parallel after rulepack hardening.
- Egenkontroll and kalkyl can proceed in parallel after project workspace contracts are frozen.
- Public-web and auth surface can proceed in parallel after UI reset spec and auth broker changes are frozen.
- Desktop workbenches for finance and payroll can be built in parallel once the underlying engines and shared object profile standard are frozen.

# Exit gate

Detta dokument är uppfyllt först när följande gäller:

- varje existerande app och package har klassats som reuse, extend, rewrite eller new
- nya bounded contexts är namngivna och har tydliga packages
- nya routefamiljer är definierade för alla saknade motorer
- migrationsblock för de nya motorerna är definierade
- worker runtime-kraven är explicit listade
- UI-ytor är översatta till konkreta code areas
- testytor är konkreta nog att mappa till nya testfiler
- dependency map stämmer med `docs/master-control/master-build-sequence.md`
- inga implementationer efter detta får hävda att ett package är “klart” om dess required action här fortfarande är rewrite, new eller major extend

