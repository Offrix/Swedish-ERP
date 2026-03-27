> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: MCP-004
- Title: Master Domain Map
- Status: Binding control baseline
- Owner: Domain architecture and compliance architecture
- Version: 1.0.0
- Effective from: 2026-03-23
- Supersedes: No prior master domain map
- Approved by: User directive in this control phase
- Last reviewed: 2026-03-23
- Related master docs:
  - docs/master-control/master-rebuild-control.md
  - docs/master-control/master-gap-register.md
  - docs/master-control/master-code-impact-map.md
  - docs/master-control/master-rulepack-register.md
  - docs/master-control/master-golden-scenario-catalog.md
  - docs/master-control/master-build-sequence.md
- Related domains:
  - all bounded contexts and cross-cutting engines in the repo and new contexts introduced by MCP-003
- Related code areas:
  - packages/domain-*
  - packages/document-engine
  - packages/rule-engine
  - packages/auth-core
  - apps/api
  - apps/desktop-web
  - apps/field-mobile
  - apps/backoffice
  - apps/public-web
- Related future documents:
  - docs/compliance/se/person-linked-document-classification-engine.md
  - docs/compliance/se/accounting-method-engine.md
  - docs/compliance/se/fiscal-year-and-period-engine.md
  - docs/domain/review-center.md
  - docs/domain/notification-center.md
  - docs/domain/activity-feed.md
  - docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md

# Purpose

Detta dokument låser domängränser, ägarskap, source of truth, förbjudna kopplingar och tvärdomänflöden för hela ERP-omtaget.

Det avgör:

- vilket bounded context som äger vilket objekt
- vilka domäner som får skriva till vilka objekt
- vilka domäner som bara får läsa eller projicera
- hur kommandon och events får färdas mellan domäner
- var submission-, review- och receiptkedjor ska ägas
- hur sök och UI-projektioner ska få byggas
- vad som aldrig får ligga i UI
- vad som aldrig får muteras tyst

# Domain catalog

| Domain | Package | Primary responsibility | Canonical write authority |
|---|---|---|---|
| Identity core | `packages/auth-core` | Permissions, sessions, MFA, factor logic, token and audit primitives | Auth primitives only |
| Org and auth | `packages/domain-org-auth` | Companies, company users, roles, object grants, delegations, onboarding, tenant setup | Organization and tenant identity records |
| Core operations | `packages/domain-core` | Work items, close, migration, backoffice control, resilience registry | Work items, close objects, migration objects, support and ops objects |
| Documents | `packages/domain-documents` + `packages/document-engine` | Documents, versions, inbox, OCR, review task base, archive rules | Document archive, OCR runs, inbox objects |
| Document classification | `packages/domain-document-classification` | Person link, split, economic treatment, payroll impact intents | Classification cases and decisions |
| Ledger | `packages/domain-ledger` | Journal entries, voucher series, chart, locks, posting invariants | All ledger postings and corrections |
| Accounting method | `packages/domain-accounting-method` | Kontantmetod/faktureringsmetod and change rules | Accounting method profile and year-end adjustments |
| Fiscal year | `packages/domain-fiscal-year` | Fiscal years, broken years, periods, period calendars | Fiscal year and period generation |
| VAT | `packages/domain-vat` | VAT decisions, review queue, declaration runs, periodic statements | VAT decisions and VAT declaration objects |
| AR | `packages/domain-ar` | Customers, quotes, contracts, invoices, receivables, dunning, allocations | AR master and AR transaction objects |
| AP | `packages/domain-ap` | Suppliers, POs, receipts, supplier invoices, matching, AP open items | AP master and AP transaction objects |
| Import cases | `packages/domain-import-cases` | Import multi-document cases, customs/freight linkage | Import cases and import assessments |
| Banking | `packages/domain-banking` | Bank accounts, payment proposals, payment orders, bank returns | Payment lifecycle objects |
| Tax account | `packages/domain-tax-account` | Skattekonto events, offsets, reconciliations | Tax account subledger objects |
| HR | `packages/domain-hr` | Employees, employments, leave types, manager assignments | Person and employment master |
| Time | `packages/domain-time` | Time entries, schedules, clock events, time period locks | Time and scheduling events |
| Balances | `packages/domain-balances` | Balance types and balance transactions for vacation, comp, flex and similar | Balance master and balance transactions |
| Collective agreements | `packages/domain-collective-agreements` | Agreement families, versions, pay/leave rule overlays | Agreement definitions and mappings |
| Payroll | `packages/domain-payroll` | Pay items, pay runs, payouts, AGI submissions, payroll postings | Payroll transaction and submission objects |
| Benefits | `packages/domain-benefits` | Benefit catalog and benefit events | Benefit events and benefit catalog policy refs |
| Travel | `packages/domain-travel` | Travel claims, allowances, mileage, foreign allowances | Travel claim objects |
| Pension | `packages/domain-pension` | Pension plans, enrollments, pension events, salary exchange | Pension domain objects |
| Projects | `packages/domain-projects` | Projects, budgets, snapshots, resource allocations, change orders | Project control objects |
| Field | `packages/domain-field` | Work orders, dispatches, inventory movements, field signatures | Field execution objects |
| HUS | `packages/domain-hus` | ROT/RUT/HUS cases, claims, payouts, recoveries | HUS case and claim objects |
| Personalliggare | `packages/domain-personalliggare` | Attendance identities, workplaces, site attendance, kiosk and exports | Personalliggare attendance and correction objects |
| Egenkontroll | `packages/domain-egenkontroll` | Templates, checklist instances, deviations, sign-offs | Quality control objects |
| Kalkyl | `packages/domain-kalkyl` | Estimates, versions, cost lines, risks, markup models | Estimation objects |
| Reporting | `packages/domain-reporting` | Report definitions, snapshots, reconciliations, export jobs | Reporting snapshots and exports |
| Annual reporting | `packages/domain-annual-reporting` | Annual packages, versions, signatories, filing packages | Annual reporting objects |
| Integrations | `packages/domain-integrations` | Submissions, receipts, action queues, public API, webhooks, partner operations | Submission and receipt records |
| Notifications | `packages/domain-notifications` | Notifications, delivery, user preferences | Notification objects |
| Activity | `packages/domain-activity` | Activity events and feed projections | Activity records |
| Search | Domain-owned projections plus shared registry | Search indexing and query contracts | Search index is not canonical source of truth |

# Shared primitives

Följande primitives är gemensamma och får inte redefinieras godtyckligt i varje domän:

- `CompanyRef`
- `ActorRef`
- `CompanyUserRef`
- `EmployeeRef`
- `EmploymentRef`
- `DocumentRef`
- `ProjectRef`
- `WorkOrderRef`
- `SubmissionRef`
- `ReceiptRef`
- `RulepackRef`
- `FiscalYearRef`
- `AccountingPeriodRef`
- `JournalEntryRef`
- `Money` med valuta
- `Quantity`
- `DateRange`
- `ObjectRef`
- `ExternalRef`
- `CorrelationId`
- `IdempotencyKey`
- `DecisionRef`
- `AuditRef`
- `ReviewItemRef`

## Regler för shared primitives

1. Shared primitives får definieras centralt men aldrig ägas som affärsobjekt av ett generellt util-package.
2. Varje affärsobjekt ska bära tydliga referenser, inte lösa strängkopplingar.
3. Alla externa referenser ska ha `source_system`, `source_key` och `captured_at`.
4. Alla pengar ska bära valuta även om SEK är vanligast.
5. Alla tidsperioder ska bära explicit datumintervall och inte härledas från UI-filter.

# Identity and permission model

## Aktörstyper

Systemet ska skilja på följande aktörstyper:

- company owner
- company admin
- accountant or bureau user
- payroll specialist
- project manager
- site manager
- employee
- external contractor user
- customer viewer/approver
- support operator
- break-glass operator
- service account
- public API client

## Permission source of truth

- `auth-core` äger permission primitives och factor logic
- `domain-org-auth` äger företagsroller, object grants, delegations och onboarding status
- varje affärsdomän äger sina egna object-level permissions i form av objektkategorier och actions
- UI får endast fråga efter resolved permissions, aldrig själv härleda åtkomst

## SoD and approval rules

Segregation of duties ska inte leva som fri text i UI.

Den ska bestå av:

- auth roles
- object grants
- approval chains
- signoff policies
- review decision roles
- support/backoffice restrictions

# Domain boundaries

## Boundaries that are absolute

1. Ledger äger bokföring.  
   Ingen annan domän får skriva journalrader direkt.

2. Payroll äger AGI objects.  
   HR, benefits, travel och documents får bara skapa input eller intents.

3. VAT äger momsbeslut.  
   AR, AP, HUS, projects och document classification får aldrig ensamma fastställa momsutfall.

4. HUS äger claim-lifecycle.  
   AR får skapa invoice basis, men HUS äger claim, payout, decision och recovery.

5. Document classification äger personkopplad ekonomisk behandling av dokument.  
   Documents, benefits, AP och payroll får inte var för sig göra slutlig behandling.

6. Fiscal year äger periodkalendern.  
   Ledger, reporting och annual reporting får inte själva hitta på räkenskapsårsgränser.

7. Accounting method äger timingregeln för kontantmetod kontra faktureringsmetod.  
   AR, AP och VAT får inte bära lokala särregler för detta.

8. Tax account äger skattekontosubledgern.  
   Banking, payroll och VAT får inte modellera kvittningar var för sig.

9. Review center äger review-objekt.  
   Domäner får äga domain-specific reason codes men inte egna frikopplade review worlds.

10. Notifications och activity är separata bounded contexts.  
    Work items är inte notiser. Activity är inte audit.

11. Search index är aldrig source of truth.  
    Search får bara spegla.

12. UI är aldrig source of truth för affärsstatus, blockeringsregler eller compliancevalidering.

# Domain object map

## Source of truth per object family

| Object family | Owning domain | Write path | Read-only consumers | Silent mutation forbidden |
|---|---|---|---|---|
| Company | org-auth | org/auth commands | all domains | Yes |
| Company user, grants, delegations | org-auth | org/auth commands | all domains | Yes |
| Session, MFA enrollment | auth-core + org-auth | auth commands | backoffice, UI | Yes |
| Feature flags, emergency disables | core/backoffice + org-auth | backoffice/ops commands | all surfaces | Yes |
| Support case, impersonation, access review, break glass | core/backoffice | backoffice commands | support UI | Yes |
| Work item | core | work-item commands | review center, workbench UIs | Yes |
| Notification | notifications | notification creation and ack commands | desktop, mobile, backoffice | Yes |
| Activity event | activity | domain event projection | desktop, backoffice | Yes |
| Comment | core collaboration | collaboration commands | object profiles | Yes |
| Document, version | documents | archive/inbox commands | all business domains | Yes |
| OCR run, inbox message | documents | document engine commands | review center | Yes |
| Classification case, split, person link | document classification | classification commands | payroll, AP, benefits, review center | Yes |
| Journal entry | ledger | ledger commands only | reporting, close, annual reporting | Yes |
| Voucher series | ledger | ledger admin commands | AR, AP, payroll | Yes |
| Accounting method profile | accounting method | accounting method commands | ledger, VAT, AR, AP, close | Yes |
| Fiscal year and periods | fiscal year | fiscal year commands | ledger, reporting, annual reporting, VAT | Yes |
| VAT decision, declaration run | VAT | VAT commands | AR, AP, reporting, review center | Yes |
| Customer, price list, quote, contract | AR | AR commands | projects, reporting | Yes |
| Customer invoice, AR open item, dunning run | AR | AR commands | banking, VAT, reporting, HUS | Yes |
| Supplier, purchase order, AP invoice | AP | AP commands | banking, VAT, reporting | Yes |
| Import case | import cases | import-case commands | AP, VAT, review center | Yes |
| Bank account, payment proposal, payment order | banking | banking commands | AP, payroll, AR, tax account | Yes |
| Tax account event, offset, reconcile item | tax account | tax account commands | reporting, close, backoffice | Yes |
| Employee, employment | HR | HR commands | time, payroll, personalliggare, projects | Yes |
| Time entry, schedule, clock event | time | time commands | payroll, projects, field-mobile | Yes |
| Balance type, balance transaction | balances | balance commands | time, payroll, HR UI | Yes |
| Collective agreement family/version | collective agreements | agreement commands | payroll, time, HR UI | Yes |
| Pay item, pay run, payout batch, AGI submission | payroll | payroll commands | banking, reporting, backoffice | Yes |
| Benefit event | benefits | benefit commands | payroll, reporting, review center | Yes |
| Travel claim | travel | travel commands | payroll, projects, review center | Yes |
| Pension event | pension | pension commands | payroll, reporting, tax account | Yes |
| Project, budget, snapshots | projects | project commands | reporting, payroll, field | Yes |
| Work order, dispatch, material withdrawal | field | field commands | projects, billing, mobile | Yes |
| HUS case, claim, payout, recovery | HUS | HUS commands | AR, reporting, review center | Yes |
| Attendance event, workplace, kiosk device | personalliggare | personalliggare commands | field-mobile, reporting, backoffice | Yes |
| Egenkontroll template, checklist, deviation | egenkontroll | egenkontroll commands | projects, field-mobile | Yes |
| Estimate, estimate version | kalkyl | kalkyl commands | AR, projects | Yes |
| Report definition, snapshot, export job | reporting | reporting commands | desktop, public API | Yes |
| Annual package, version, signatory, filing package | annual reporting | annual-reporting commands | backoffice, close UI | Yes |
| Submission, receipt, action queue item | integrations | integration commands | review center, backoffice, owning domains | Yes |

# Cross-domain command flows

## Flow 1: Document intake to archive
1. documents receives upload or inbox message
2. documents stores immutable file and metadata
3. documents schedules OCR job through core job runtime
4. documents emits `document.received`

No business domain may classify the document before the archive and OCR snapshot exist.

## Flow 2: OCR result to document classification
1. documents completes OCR
2. documents classification command is opened
3. document classification reads document snapshot, extraction snapshot, employee/card/project hints
4. document classification creates classification case
5. review center may receive an item if rulepack or confidence demands it

Documents do not decide economic treatment.

## Flow 3: Document classification to AP
1. document classification decision says supplier invoice or cost line for AP
2. command to AP creates or enriches supplier invoice draft
3. AP performs supplier, PO, receipt and variance logic
4. VAT is asked for decision basis
5. ledger posting happens only when AP and VAT both are ready

Classification does not post anything.

## Flow 4: Document classification to payroll/benefits
1. classification decision says benefit, net deduction, private receivable, reimbursable outlay or wellness
2. benefits or payroll receives explicit intent
3. payroll converts intent to pay run input or employee receivable settlement
4. AGI objects are created only inside payroll
5. ledger postings happen from payroll posting commands

Document classification never creates AGI or ledger directly.

## Flow 5: AR invoice issue
1. AR builds invoice draft
2. invoice legal field rules engine validates mandatory fields
3. VAT decides VAT treatment
4. HUS receives claim basis if HUS applies
5. AR issues invoice
6. ledger receives canonical invoice posting command

AR does not calculate HUS claim lifecycle.

## Flow 6: AP invoice post
1. AP validates supplier invoice and match state
2. VAT decides input VAT treatment
3. import-case engine may enrich or block
4. AP posts invoice
5. ledger receives canonical AP posting command
6. banking may create payment proposal later

AP does not own VAT rules or payment execution.

## Flow 7: Approved time to payroll and projects
1. time entry is approved
2. time domain emits approved time event
3. payroll reads time for compensation basis
4. projects reads time for project actuals
5. balances may adjust flex or comp based on agreement rules

Time does not calculate payroll or project cost itself.

## Flow 8: Approved pay run to payout, AGI and project cost
1. payroll approves pay run
2. payroll creates payout batch
3. payroll creates AGI submission draft
4. payroll creates payroll posting draft
5. projects receives cost allocation events
6. banking handles payout export
7. integrations handles AGI submission receipts

Payroll owns the orchestration trigger but not transport receipts.

## Flow 9: HUS lifecycle
1. AR or field invoice creates HUS basis
2. HUS validates buyer, property, work split and payment
3. HUS creates claim
4. integrations submits claim
5. receipts and decisions land in integrations
6. HUS normalizes decision, payout or recovery
7. AR and ledger receive resulting commands

HUS owns business interpretation of claim results.

## Flow 10: Annual close and filing
1. close workbench gathers blockers
2. reporting creates evidence packs
3. legal-form engine determines package composition
4. annual reporting creates filing package and version
5. signatories sign
6. integrations submits
7. receipts return
8. close records final status

Annual reporting owns filing package state, not reporting.

## Flow 11: Tax account reconciliation
1. tax account imports statement events
2. tax account matches against VAT, AGI, F-tax, HUS and bank events
3. unmatched items create review or reconciliation items
4. close reads reconciliation state
5. ledger receives explicit adjustments only when approved

No other domain may mark a tax account event “settled” by direct update.

# Cross-domain event flows

## Canonical event families

- `document.received`
- `document.ocr.completed`
- `document.classification.proposed`
- `document.classification.approved`
- `import_case.updated`
- `ledger.period.locked`
- `ledger.journal.posted`
- `vat.decision.review_required`
- `vat.declaration.submitted`
- `ar.invoice.issued`
- `ap.invoice.posted`
- `banking.payment_order.submitted`
- `banking.payment_order.returned`
- `time.entry.approved`
- `payroll.run.approved`
- `payroll.agi.submission.ready`
- `payroll.agi.submission.accepted`
- `benefit.event.review_required`
- `project.snapshot.materialized`
- `hus.claim.submitted`
- `hus.claim.decided`
- `personalliggare.attendance.corrected`
- `annual_reporting.package.signed`
- `submission.receipt.recorded`
- `review_item.created`
- `review_item.decided`
- `notification.created`
- `activity.recorded`
- `feature_flag.emergency_disabled`
- `migration.cutover.completed`

## Event rules

1. Events are facts, not commands.
2. Events may not be silently edited after publication.
3. Events that are replayed must carry replay metadata.
4. Consumers must be idempotent.
5. Search and activity consume events by projection only.
6. UI must never rely on uncommitted in-memory event state.

# Submission and receipt chains

## Submission ownership model

| Submission type | Business owner | Technical owner | Receipt owner |
|---|---|---|---|
| AGI | payroll | integrations | integrations with payroll projection |
| VAT declaration | VAT | integrations | integrations with VAT projection |
| HUS claim | HUS | integrations | integrations with HUS projection |
| Annual reporting filing | annual reporting | integrations | integrations with annual reporting projection |
| Peppol invoice delivery | AR | integrations | integrations with AR projection |
| Public API webhook delivery | integrations/public API | integrations | integrations |

## Required receipt chain states

Every submission chain shall distinguish:

- prepared
- validated
- signed when applicable
- submitted
- technical acknowledgement
- business acknowledgement
- final outcome
- retry required
- correction required
- closed

A technical ACK is not a business approval. A business ACK is not a final payout or assessment. A final outcome is not permission to mutate the original payload.

# Review and work-item chains

## Review item creation rules

A review item must be created when:

- confidence is low
- rulepack says review required
- private spend is possible
- benefit classification affects payroll or AGI
- VAT is ambiguous
- HUS validation fails or is incomplete
- import-case totals diverge
- locked period correction is requested
- tax account reconciliation mismatch occurs
- annual package has unresolved blockers

## Review chain structure

1. domain raises review reason and evidence
2. review center creates canonical review item
3. work item may be created or linked
4. reviewer claims item
5. reviewer decides
6. decision emits command to owning domain
7. owning domain applies change
8. audit and activity are recorded
9. related notification may be acked or auto-resolved

## Work item rules

- work items are obligations
- notifications are alerts
- activity is history
- audit is legal/technical trace

These four concepts may reference the same object but are never the same object.

# Search ownership

## Search ownership model

- each domain owns its own projection schema for searchable object content
- shared search registry owns indexing status, projection contracts and query orchestration
- search index is derived data only
- permission trimming uses resolved permissions from auth/org-auth, not search-owned ACLs
- search results may include object profile previews but never canonical business state

## Search write rules

- domains publish projection events
- search consumes projections asynchronously
- UI may show “index pending” state
- UI may not update search index directly

# UI ownership by domain

## Rule

Domains own data contracts and object semantics. Surface teams own layout, interaction composition and presentation.

## Ownership matrix

| UI area | Primary domain owner | Notes |
|---|---|---|
| Auth and onboarding | org-auth + auth-core | UI obeys session, factor and tenant setup rules |
| Review center | review center + owning domains | domain-specific evidence blocks are injected, not duplicated |
| AP workbench | AP | VAT, documents and banking appear as related panels |
| AR and billing workbench | AR | VAT and HUS panels are related objects, not copied logic |
| VAT workbench | VAT | source objects remain AR/AP/ledger refs |
| Payroll workbench | payroll | benefits, time, balances and agreements are linked inputs |
| Project workspace | projects | field, HUS, personalliggare, kalkyl and egenkontroll appear as subworkspaces |
| Field mobile | field + personalliggare + time | constrained UI over existing domain rules |
| Backoffice | core/backoffice + integrations + auth | no direct DB tools exposed |
| Close and annual workspace | core/close + annual reporting + reporting + tax account | unified workspace, separate object ownership |

# Forbidden couplings

Följande kopplingar är uttryckligen förbjudna:

1. UI -> database direct writes
2. UI -> ledger posting generation
3. AR -> direct VAT rule calculation without VAT engine
4. AP -> direct import logic without import-case engine
5. documents -> direct payroll or ledger writes
6. benefits -> direct AGI record creation outside payroll
7. time -> direct pay calculation
8. projects -> direct journal creation
9. HUS -> direct bank settlement without banking and integrations
10. personalliggare -> reuse of time entries as attendance truth
11. search index -> source of truth for any object state
12. notification center -> primary persistence of work item state
13. AI automation -> bypass of review center or deterministic rulepacks
14. support/backoffice -> direct mutation of submitted or signed objects
15. annual reporting -> self-derived fiscal year without fiscal-year engine
16. close -> self-derived tax account settlement without tax account engine

# What must never live in UI

- ledger posting logic
- VAT decision logic
- AGI calculation logic
- HUS eligibility logic
- accounting method logic
- fiscal year logic
- rulepack resolution
- signoff segregation logic
- device trust logic
- submission retry class logic
- correction/reversal logic
- notification dedupe logic
- activity generation logic
- audit event emission rules
- search permission trimming logic
- personalliggare correction legality logic
- payroll migration diff logic
- tax account offset logic

UI may display, explain and request actions. UI may not decide.

# What must never mutate silently

The following objects are append-only or correction-driven and may never be silently overwritten:

- documents and document versions
- OCR snapshots
- classification decisions
- journal entries
- voucher numbers
- accounting periods once locked
- fiscal years once active with postings
- VAT decisions used in posted entries or submitted declarations
- issued invoices
- posted supplier invoices
- approved pay runs
- AGI submissions
- payout batches after export
- HUS claims and claim decisions
- personalliggare attendance events
- signed annual report package versions
- submissions and receipts
- review decisions
- support case approved actions
- impersonation approvals
- break-glass approvals
- rulepack versions once active
- migration diff reports once signed off
- close signoffs

# Exit gate

Detta dokument är uppfyllt först när följande gäller:

- varje centralt objekt i systemet har en tydlig owning domain
- source of truth är uttryckligt definierad per objektfamilj
- cross-domain command flows är definierade för samtliga kritiska flöden
- cross-domain event flows är definierade för samtliga kritiska flöden
- submission ownership och receipt ownership är tydligt separerade
- review, notifications, activity och work items är tydligt separerade
- forbidden couplings täcker alla tidigare falskt färdiga kopplingar
- UI-ytor är bundna till domänägarskap utan att UI blir rule owner
- listan över silent-mutation-forbud täcker alla reglerade objekt
- inga senare implementationer får införa nya tvärkopplingar som bryter denna karta utan ny bindande ADR och uppdatering av denna masterfil

