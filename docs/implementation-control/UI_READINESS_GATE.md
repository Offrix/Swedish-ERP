> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# UI_READINESS_GATE

Status: Bindande pass/fail-gate före all UI-implementation.

Detta dokument definierar exakt vad som måste finnas i backend, domänmodell, read models, permissions, integrationslager och runtime innan UI får börja byggas. UI får inte starta på ofärdiga contracts.

## 1. Global regel

UI-start är förbjuden tills varje punkt nedan är `PASS`. Delvis färdig backend ger `FAIL`.

## 2. Obligatoriska object profiles

Följande objekt måste ha full object profile med:
- overview header
- status taxonomy
- risk/blocker badges
- related objects
- timeline/activity
- receipts and evidence
- allowed actions
- permission summary
- correction chain
- audit link refs

### Finance
- customer invoice
- supplier invoice
- ledger journal
- VAT declaration version
- tax account discrepancy case
- bank statement line
- payment order

### Payroll and people
- employee
- employment
- pay run
- payslip/pay line aggregate
- AGI submission period
- benefit event
- travel expense
- pension instruction
- garnishment case

### Compliance
- HUS case
- HUS claim version
- annual package
- submission envelope

### Projects and field
- project
- work order
- personalliggare workplace
- attendance export
- ID06 work pass
- sync conflict record
- checklist instance

### Operations
- review item
- work item
- support case
- replay plan
- dead-letter case
- incident case

**Pass**
- alla profiler finns som read-model resources
- profiler kan hämtas med ett anrop per objektprofil
- profiler inkluderar receipts, evidence, correction chain och allowed actions

**Fail**
- UI behöver N+1-anrop för att bygga operativ helhet
- profiler saknar blocker states eller receipts
- profiler läcker rå domänskärna utan konsumerbar sammanställning

## 3. Obligatoriska list/filter/sort/search/drilldown-contracts

Varje workbenchklass måste ha server-side kontrakt för:
- list response med stable cursor
- filter schema
- sort schema
- saved views
- counters
- bulk actions
- drilldown target
- ownership/SLA metadata
- export schema

### Måste finnas för
- AP
- AR
- banking
- VAT
- tax account
- payroll
- AGI
- benefits/travel
- HUS
- annual reporting
- review center
- support/backoffice
- projects
- field
- personalliggare
- ID06
- dead-letter/replay
- submissions monitor

**Pass**
- varje workbench kan byggas utan att UI definierar egen filtersemantik
- bulk actions, counters och row actions är uttryckliga
- cursor, filter och sort är stabila och versionssatta

**Fail**
- backend returnerar endast generiska rålistor
- listor saknar ownership/SLA/blocker metadata
- UI måste själv sammanfoga flera endpoint-familjer för en kö

## 4. Command bar contracts

Backend måste exponera ett command contract per relevant objekt:
- `action_code`
- `requires_permission`
- `requires_trust_level`
- `requires_review_or_dual_control`
- `is_async`
- `operation_type`
- `confirmation_semantics`
- `result_receipt_type`

**Pass**
- UI kan bygga command bar utan att koda domänregler i klient
- action visibility styrs av backend permissions och object state

**Fail**
- UI måste gissa vilka actions som gäller
- action-kontrakt saknar async/result receipt

## 5. Notification / activity / work-item / review-separation

Backend måste ha separata read models för:
- notifications
- activity
- work items
- review items

Varje modell ska ha egen route family, egen status och egen counter.

**Pass**
- samma sakobjekt kan visa alla fyra utan statuskrock
- en notification kan försvinna utan att work item stängs
- review decision stänger inte activity historik

**Fail**
- notification används som uppgiftssystem
- activity används som auditlogg
- review queue byggs direkt från work items

## 6. Surface boundaries

Följande backend-gränser måste vara klara:
- public
- auth/onboarding
- desktop
- field mobile
- backoffice

Varje surface måste ha:
- egen route family eller explicit surface policy
- own action policy
- own visibility policy
- own object-profile subset

**Pass**
- field mobile får endast de objekt och mutationer den ska bära
- backoffice använder separata ops-rutter
- public API blandas inte med ordinary desktop routes

**Fail**
- samma råendpoints för alla ytor
- support/backoffice-funktioner ligger i ordinary user routes

## 7. Permissions och action eligibility

Backend måste för varje object profile kunna returnera:
- `can_view`
- `can_edit`
- `can_submit`
- `can_approve`
- `can_replay`
- `can_impersonate`
- `can_break_glass`
- `requires_step_up`
- `requires_dual_control`

**Pass**
- UI kan läsa allowed actions utan egen policykod
- permissions är object- och queue-aware

**Fail**
- endast grov roll returneras
- queue ownership eller dual-control går inte att avgöra server-side

## 8. Async operation contracts

Alla actions som kan bli asynkrona ska returnera:
- `operation_id`
- `operation_type`
- `current_status`
- `retry_class`
- `receipt_ref_when_available`
- `dead_letter_ref_when_applicable`

Måste finnas för:
- OCR
- statement import
- payment orders
- AGI/VAT/HUS/annual submit
- webhook delivery
- partner operations
- export jobs
- replay

**Pass**
- UI behöver inte polla råa jobs utan operativt meningsfull operationsresource
- receipts kan hämtas från operationen

**Fail**
- UI måste läsa intern job store
- async actions saknar receipt eller status taxonomy

## 9. Search requirements

Search måste stödja:
- permission trimming
- object preview cards
- cross-domain results
- filter by type/status/period/company
- stale-index indicator
- saved search
- search by external reference, correlation id och receipt id där relevant

**Pass**
- results är härledda men användbara
- stale index syns
- object preview har drilldown

**Fail**
- search läcker otillåten data
- search kan inte hitta regulated objects eller external refs

## 10. Blocker states

Backend måste definiera standardiserade blocker badges och reasons:
- `review_required`
- `missing_evidence`
- `locked_period`
- `signature_required`
- `submission_pending_receipt`
- `correction_required`
- `reconciliation_mismatch`
- `provider_unhealthy`
- `sync_conflict`
- `permission_blocked`

**Pass**
- blocker states är normaliserade över domäner
- object profiles och lists exponerar blocker reasons

**Fail**
- blocker states döljs i fri text
- UI måste själv tolka flera statusfält

## 11. Audit visibility

UI får inte börja byggas förrän backend kan exponera:
- audit chain refs
- evidence refs
- receipt refs
- correction lineage
- actor and approval refs
- replay refs

**Pass**
- alla reglerade object profiles har audit-related panels möjliga

**Fail**
- UI skulle behöva direktaccess till audit tables eller rå events

## 12. Mobile readiness contracts

Field mobile får inte byggas förrän backend har:
- sync envelope contract
- conflict record contract
- offline idempotency
- limited object profile variants
- device trust actions
- minimal counters and today-queue contracts

**Pass**
- mobile kan byggas som tunn klient över uttryckliga kontrakt

**Fail**
- mobile skulle behöva bära egen affärslogik för conflicts, device trust eller action availability

## 13. Read-model rebuildability

Varje read model som UI ska bygga på måste kunna:
- rebuildas från source events/state
- markera stale eller rebuilding
- bära version på projection contract

**Pass**
- projection rebuild är testad
- stale state exponeras

**Fail**
- read models är handredigerade eller saknar rebuild path

## 14. Pass/fail-checklista

### PASS kräver att allt nedan är sant
- object profiles finns för alla kritiska objekt
- workbench list/filter/sort/search/drilldown contracts finns
- command bar contracts finns
- notification/activity/work-item/review separation finns
- surface boundaries finns
- permissions och action eligibility finns
- async operations och receipts finns
- search är permission-trimmad
- blocker states är normaliserade
- audit/evidence/receipt visibility finns
- mobile sync contracts finns
- projections är rebuildbara

### FAIL triggas av något av följande
- någon kritisk object profile saknas
- någon workbench saknar stable filters eller counters
- UI måste gissa permissions
- async action saknar operation contract
- projection kan inte rebuildas
- notifications/work items/review är sammanblandade
- backoffice saknar egna route families

## 15. Exit gate

UI får börja byggas först när:
- alla passkrav ovan är implementerade och testade
- object profile catalog och workbench catalog är genererade från backend contracts
- permission snapshot tests och projection rebuild tests är gröna
- support/backoffice, field mobile och desktop har separata backend boundaries

