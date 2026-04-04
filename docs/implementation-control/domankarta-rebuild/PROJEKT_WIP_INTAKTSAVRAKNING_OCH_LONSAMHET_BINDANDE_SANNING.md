# PROJEKT_WIP_INTÄKTSAVRÄKNING_OCH_LÖNSAMHET_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för projektrot, budget, cost capture, WIP, intäktsavräkning, projektfaktureringens billability-grans och lönsamhetsutfall.

Detta dokument ska styra:
- projekt och uppdragsrot
- budget och forecast-light
- cost capture per projekt
- WIP
- pagående arbeten för annans räkning
- successiv vinstavräkning och alternativregel enligt explicit profile
- billable readiness mot invoice handoff
- lönsamhetsberakning

Ingen project workspace, ingen fakturarad, ingen delivery completion och ingen reporting widget får definiera avvikande truth för project/WIP/profitability utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga hela projekt- och WIP-karnan utan att gissa:
- vad som är projektrot kontra arbetsorder, order eller abonnemang
- vilka kostnader som ska bäras av projektet
- när WIP ska uppsta
- när intäkt får redovisas enligt profile
- hur lönsamhet beräknas utan dubbelrakning

## Omfattning

Detta dokument omfattar:
- `ProjectRoot`
- `ProjectBudget`
- `ProjectCostCapture`
- `ProjectRevenueProfile`
- `ProjectWipSnapshot`
- `ProjectRecognitionDecision`
- `ProjectBillingReadinessDecision`
- `ProjectProfitabilitySnapshot`

Detta dokument omfattar inte:
- kundfakturans issue
- kundbetalning
- payroll truth i sig
- delivery execution truth i sig

Kanonisk agarskapsregel:
- detta dokument äger projekt, WIP, intäktsavräkning och lönsamhetstruth
- `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md` äger kommersiell commitment
- `FAKTURAFLODET_BINDANDE_SANNING.md` äger invoice issue
- `ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING.md` äger fakturerbar tid/material/utforsanning

## Absoluta principer

- project status får aldrig ensam skapa invoice issue
- WIP får aldrig gissas i rapportlagret
- successiv vinstavräkning får aldrig aktiveras utan explicit profile
- alternativregel får aldrig blandas med successiv vinstavräkning i samma project profile
- lönsamhet får aldrig dubbelrakna samma kostnad mellan project, payroll och inventory
- projekt får aldrig overwriteas; ändringar måste sparas som nya decisions eller snapshots

## Bindande dokumenthierarki för projekt, WIP, intäktsavräkning och lönsamhet

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- detta dokument
- Sveriges riksdag: årsredovisningslag 4 kap. 10 §
- Bokföringsnamnden BFNAR 2025:2 Pågående arbete för annans räkning

Detta dokument lutar på:
- `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md`
- `FAKTURAFLODET_BINDANDE_SANNING.md`
- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md`
- `DOMAIN_19_ROADMAP.md`
- `DOMAIN_19_IMPLEMENTATION_LIBRARY.md`

Detta dokument får inte overstyras av:
- project kanban status
- invoice totals
- free-form budget notes
- UI-only margin badges

## Kanoniska objekt

- `ProjectRoot`
- `ProjectBudget`
- `ProjectCostCapture`
- `ProjectRevenueProfile`
- `ProjectWipSnapshot`
- `ProjectRecognitionDecision`
- `ProjectBillingReadinessDecision`
- `ProjectProfitabilitySnapshot`
- `ProjectChangeDecision`

## Kanoniska state machines

### `ProjectRoot`

- `draft`
- `active`
- `paused`
- `completed`
- `closed`
- `cancelled`

### `ProjectRecognitionDecision`

- `draft`
- `review_pending`
- `approved`
- `posted`
- `reversed`

### `ProjectBillingReadinessDecision`

- `draft`
- `ready`
- `blocked`
- `handed_off`

## Kanoniska commands

- `CreateProjectRoot`
- `PublishProjectBudget`
- `CaptureProjectCost`
- `PublishProjectRevenueProfile`
- `CreateProjectWipSnapshot`
- `ApproveProjectRecognitionDecision`
- `ApproveProjectBillingReadinessDecision`
- `CreateProjectInvoiceHandoff`
- `CreateProjectChangeDecision`

## Kanoniska events

- `ProjectActivated`
- `ProjectCostCaptured`
- `ProjectRevenueProfilePublished`
- `ProjectWipSnapshotted`
- `ProjectRecognitionPosted`
- `ProjectBillingReady`
- `ProjectHandedOffToInvoice`

## Kanoniska route-familjer

- `/v1/projects/*`
- `/v1/projects/budgets/*`
- `/v1/projects/cost-capture/*`
- `/v1/projects/wip/*`
- `/v1/projects/recognition/*`
- `/v1/projects/billing-readiness/*`
- `/v1/projects/profitability/*`

Folkjande får inte skriva legal truth:
- dashboard filters
- widget formulas
- project health badges
- ad hoc spreadsheet imports

## Kanoniska permissions och review boundaries

- `project.read`
- `project.manage`
- `project.finance_review`
- `project.recognition_approve`
- `project.billing_release`

## Nummer-, serie-, referens- och identitetsregler

- `project_root_id`
- `project_budget_id`
- `project_cost_capture_id`
- `project_wip_snapshot_id`
- `project_recognition_decision_id`
- `project_billing_readiness_decision_id`
- `project_profitability_snapshot_id`

## Valuta-, avrundnings- och omräkningsregler

- project profitability shall use functional currency snapshots
- cost capture may originate in source currency but canonical project truth is functional currency
- WIP snapshots must preserve underlying precision and rounding policy

## Replay-, correction-, recovery- och cutover-regler

- replay måste kunna återskapa project cost, WIP, recognition and profitability
- cutover måste frysa active project status, WIP basis and billable backlog
- correction of recognition shall create new decision, never overwrite old snapshot

## Huvudflödet

1. project root skapas
2. revenue profile och billing model publiceras
3. cost capture kommer in från delivery, payroll, AP, inventory och manual adjustments
4. WIP snapshot byggs
5. recognition decision avgor intäkts- eller balansutfall
6. billable readiness avgor invoice handoff
7. profitability snapshot publiceras

## Bindande scenarioaxlar

- revenue profile
  - `time_and_material`
  - `fixed_price_alternative_rule`
  - `fixed_price_progressive_recognition`
  - `manual_blocked`

- project type
  - `client_project`
  - `internal_project`
  - `service_project`
  - `construction_like`

- cost source
  - `payroll`
  - `ap`
  - `inventory`
  - `manual_adjustment`

- billing status
  - `not_billable`
  - `partially_billable`
  - `billable`
  - `handed_off`

## Bindande policykartor

### Revenue profile map

- `time_and_material`
  - revenue only on billable basis and invoice handoff logic

- `fixed_price_alternative_rule`
  - ongoing work handled under alternative rule profile

- `fixed_price_progressive_recognition`
  - requires measurable stage/completion basis

### Cost inclusion map

- payroll cost included if explicit project link
- AP cost included if explicit project link
- inventory consumption included if explicit project link
- unlinked costs blocked from project profitability

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `PRJ-P0001` project activated
  - state only
  - no_gl

- `PRJ-P0002` project cost captured
  - state only
  - no_gl

- `PRJ-P0003` WIP asset positive
  - voucher delegated to closing/ledger profile

- `PRJ-P0004` WIP liability negative
  - voucher delegated to closing/ledger profile

- `PRJ-P0005` progressive recognition posted
  - voucher delegated to recognition profile

- `PRJ-P0006` billing readiness approved
  - state only
  - downstream owner `FAKTURAFLODET...`

- `PRJ-P0007` blocked missing profile
  - blocked

- `PRJ-P0008` blocked mixed recognition method
  - blocked

- `PRJ-P0009` blocked duplicate cost capture
  - blocked

## Bindande rapport-, export- och myndighetsmappning

- profitability report
- WIP report
- project cost report
- billable backlog report
- SIE4/export delegated via ledger truth after voucher materialization

## Bindande scenariofamilj till proof-ledger och rapportspar

- `PRJ-A001` activate project -> `PRJ-P0001`
- `PRJ-A002` capture project cost -> `PRJ-P0002`
- `PRJ-B001` positive WIP -> `PRJ-P0003`
- `PRJ-B002` negative WIP -> `PRJ-P0004`
- `PRJ-C001` progressive recognition -> `PRJ-P0005`
- `PRJ-D001` billing ready -> `PRJ-P0006`
- `PRJ-D002` missing profile blocked -> `PRJ-P0007`
- `PRJ-D003` mixed method blocked -> `PRJ-P0008`
- `PRJ-D004` duplicate cost blocked -> `PRJ-P0009`

## Tvingande dokument- eller indataregler

- each project must have revenue profile
- each cost capture must have source, amount, project link and source ref
- each WIP snapshot must have basis date and supporting captures
- each recognition decision must have profile and evidence

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `TIME_AND_MATERIAL`
- `ALTERNATIVE_RULE`
- `PROGRESSIVE_RECOGNITION`
- `PROJECT_BILLABLE_READY`
- `MISSING_RECOGNITION_PROFILE`
- `MIXED_RECOGNITION_BLOCK`

## Bindande faltspec eller inputspec per profil

### time_and_material

- billable basis
- approved time/material source refs

### fixed_price_alternative_rule

- contract amount
- accumulated costs
- invoiced amount

### fixed_price_progressive_recognition

- measurable completion basis
- stage evidence
- accumulated costs and revenue basis

## Scenariofamiljer som hela systemet måste tacka

- time and material billable project
- fixed price alternative rule
- fixed price progressive recognition
- paused project
- completed but not fully billed project
- duplicate cost capture blocked
- mixed recognition profile blocked

## Scenarioregler per familj

- project may not use both alternative rule and progressive recognition simultaneously
- billable readiness is not invoice issue
- paused project may still carry historical WIP but not create new billable readiness without explicit policy
- duplicate cost source ref must block

## Blockerande valideringar

- missing revenue profile
- missing project link on cost capture
- duplicate cost source ref
- mixed recognition method
- billing handoff without billable readiness

## Rapport- och exportkonsekvenser

- billable readiness queue to invoice
- WIP and profitability to reporting
- blocked cases only to audit

## Förbjudna förenklingar

- using invoice totals as project profitability
- using timesheet approval alone as revenue recognition
- blending internal project and client project logic

## Fler bindande proof-ledger-regler för specialfall

- `PRJ-P0010` completed but not billed
  - state only

- `PRJ-P0011` paused project with preserved WIP
  - state only

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `PRJ-P0001-P0002`
  - project state only

- `PRJ-P0003-P0005`
  - delegated voucher state

- `PRJ-P0006`
  - invoice handoff state

- `PRJ-P0007-P0011`
  - blocked or special state

## Bindande verifikations-, serie- och exportregler

- this document delegates voucher series to ledger/closing truths
- invoice handoff must reference project ids and billing readiness ids

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- revenue profile
- project type
- cost source
- billing status

## Bindande fixture-klasser för projekt, WIP, intäktsavräkning och lönsamhet

- `PRJ-FXT-001`
  - T&M project with time/material

- `PRJ-FXT-002`
  - fixed price alternative rule

- `PRJ-FXT-003`
  - fixed price progressive recognition

## Bindande expected outcome-format per scenario

- scenario id
- fixture class
- revenue profile
- WIP outcome
- recognition outcome
- billing readiness outcome
- blocked reason if any

## Bindande canonical verifikationsseriepolicy

- `delegated`
- `none`

## Bindande expected outcome per central scenariofamilj

- `PRJ-B001`
  - fixture minimum: `PRJ-FXT-002`
  - expected proof: `PRJ-P0003`

- `PRJ-C001`
  - fixture minimum: `PRJ-FXT-003`
  - expected proof: `PRJ-P0005`

- `PRJ-D003`
  - fixture minimum: `PRJ-FXT-003`
  - expected blocked reason: mixed recognition profile
  - expected proof: `PRJ-P0008`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `PRJ-A001` -> `PRJ-P0001`
- `PRJ-A002` -> `PRJ-P0002`
- `PRJ-B001` -> `PRJ-P0003`
- `PRJ-B002` -> `PRJ-P0004`
- `PRJ-C001` -> `PRJ-P0005`
- `PRJ-D001` -> `PRJ-P0006`
- `PRJ-D002` -> `PRJ-P0007`
- `PRJ-D003` -> `PRJ-P0008`
- `PRJ-D004` -> `PRJ-P0009`

## Bindande testkrav

- project cost lineage suite
- WIP snapshot suite
- progressive recognition suite
- alternative rule suite
- billable readiness suite
- duplicate cost block suite

## Källor som styr dokumentet

- [Årsredovisningslag (1995:1554)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arsredovisningslag-19951554_sfs-1995-1554/)
- [BFNAR 2025:2 Pågående arbete för annans räkning](https://www.bfn.se/wp-content/uploads/bfnar-2025-2.pdf)
- [Allmänna råd om redovisningsregler - BFN](https://www.bfn.se/redovisningsregler/allmanna-rad/)
- [FAKTURAFLÖDET_BINDANDE_SANNING.md](/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/domankarta-rebuild/FAKTURAFLODET_BINDANDE_SANNING.md)

